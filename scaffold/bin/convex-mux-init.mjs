#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

let componentName = "mux";
let force = false;
let skipMigration = false;
let skipWebhook = false;

function printHelp() {
  console.log(`convex-mux-init

Scaffold app-level Convex wrappers for convex-mux-component.

Usage:
  convex-mux-init [options]

Options:
  --component-name <name>  Mounted component name in convex.config.ts (default: mux)
  --force                  Overwrite existing files
  --skip-migration         Do not create convex/migrations.ts
  --skip-webhook           Do not create convex/muxWebhook.node.ts
  -h, --help               Show help
`);
}

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  } else if (arg === "--component-name") {
    componentName = args[i + 1] ?? "";
    i += 1;
  } else if (arg === "--force") {
    force = true;
  } else if (arg === "--skip-migration") {
    skipMigration = true;
  } else if (arg === "--skip-webhook") {
    skipWebhook = true;
  } else {
    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(1);
  }
}

if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(componentName)) {
  console.error(
    `Invalid --component-name "${componentName}". Use letters, numbers, and underscores, starting with a letter.`,
  );
  process.exit(1);
}

const cwd = process.cwd();
const convexDir = path.join(cwd, "convex");

if (!fs.existsSync(convexDir) || !fs.statSync(convexDir).isDirectory()) {
  console.error(
    "Could not find ./convex directory. Run this in your app root.",
  );
  process.exit(1);
}

function writeFile(relativePath, content) {
  const absPath = path.join(convexDir, relativePath);
  if (fs.existsSync(absPath) && !force) {
    console.log(`skip ${path.relative(cwd, absPath)} (already exists)`);
    return false;
  }
  fs.writeFileSync(absPath, content, "utf8");
  console.log(`write ${path.relative(cwd, absPath)}`);
  return true;
}

function migrationsTemplate(name) {
  return `"use node";

import Mux from "@mux/mux-node";
import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing env var: \${name}\`);
  return value;
}

export const backfillMux = action({
  args: {
    maxAssets: v.optional(v.number()),
    defaultUserId: v.optional(v.string()),
    includeVideoMetadata: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const mux = new Mux({
      tokenId: env("MUX_TOKEN_ID"),
      tokenSecret: env("MUX_TOKEN_SECRET"),
    });

    const maxAssets = Math.max(1, Math.floor(args.maxAssets ?? 200));
    const includeVideoMetadata = args.includeVideoMetadata ?? true;

    let scanned = 0;
    let syncedAssets = 0;
    let metadataUpserts = 0;
    let missingUserId = 0;

    for await (const asset of mux.video.assets.list({ limit: 100 })) {
      if (scanned >= maxAssets) break;
      scanned += 1;
      if (!asset.id) continue;

      await ctx.runMutation(components.${name}.sync.upsertAssetFromPayloadPublic, {
        asset: asset as unknown as Record<string, unknown>,
      });
      syncedAssets += 1;

      if (!includeVideoMetadata) continue;
      const userId = asset.passthrough ?? args.defaultUserId;
      if (!userId) {
        missingUserId += 1;
        continue;
      }

      await ctx.runMutation(components.${name}.videos.upsertVideoMetadata, {
        muxAssetId: asset.id,
        userId,
      });
      metadataUpserts += 1;
    }

    return { scanned, syncedAssets, metadataUpserts, missingUserId };
  },
});
`;
}

function webhookTemplate(name) {
  return `"use node";

import Mux from "@mux/mux-node";
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing env var: \${name}\`);
  return value;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

export const ingestMuxWebhook = internalAction({
  args: {
    rawBody: v.string(),
    headers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const mux = new Mux({ webhookSecret: env("MUX_WEBHOOK_SECRET") });
    const event = mux.webhooks.unwrap(
      args.rawBody,
      normalizeHeaders(args.headers)
    ) as unknown as Record<string, unknown>;

    await ctx.runMutation(components.${name}.sync.recordWebhookEventPublic, {
      event,
      verified: true,
    });

    const eventType = asString(event.type) ?? "";
    const data = asRecord(event.data);
    const objectId = asString(data?.id);

    if (!objectId || !data) {
      return { skipped: true, reason: "missing_data" };
    }

    if (eventType.startsWith("video.asset.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(components.${name}.sync.markAssetDeletedPublic, {
          muxAssetId: objectId,
        });
      } else {
        await ctx.runMutation(components.${name}.sync.upsertAssetFromPayloadPublic, {
          asset: data,
        });
      }
      return { skipped: false };
    }

    if (eventType.startsWith("video.live_stream.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(components.${name}.sync.markLiveStreamDeletedPublic, {
          muxLiveStreamId: objectId,
        });
      } else {
        await ctx.runMutation(
          components.${name}.sync.upsertLiveStreamFromPayloadPublic,
          {
            liveStream: data,
          }
        );
      }
      return { skipped: false };
    }

    if (eventType.startsWith("video.upload.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(components.${name}.sync.markUploadDeletedPublic, {
          muxUploadId: objectId,
        });
      } else {
        await ctx.runMutation(components.${name}.sync.upsertUploadFromPayloadPublic, {
          upload: data,
        });
      }
      return { skipped: false };
    }

    return { skipped: true, reason: "unsupported_event" };
  },
});
`;
}

let wroteAny = false;

if (!skipMigration) {
  wroteAny =
    writeFile("migrations.ts", migrationsTemplate(componentName)) || wroteAny;
}

if (!skipWebhook) {
  wroteAny =
    writeFile("muxWebhook.node.ts", webhookTemplate(componentName)) || wroteAny;
}

if (!wroteAny) {
  console.log("No files changed.");
}

console.log(`
Next steps:

1) Install Mux SDK in your app
   npm i @mux/mux-node

2) Add this route in convex/http.ts

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const result = await ctx.runAction(internal.muxWebhook.ingestMuxWebhook, {
      rawBody,
      headers,
    });
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;

3) Set env vars in Convex
   npx convex env set MUX_TOKEN_ID <id>
   npx convex env set MUX_TOKEN_SECRET <secret>
   npx convex env set MUX_WEBHOOK_SECRET <secret>

4) Run
   npx convex dev
   npx convex run migrations:backfillMux '{}'
`);
