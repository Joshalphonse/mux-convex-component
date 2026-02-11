# Convex Mux Component

Yo!

We made a reusable Convex component for apps that use Mux for video and Convex for backend data. We hear from devs and want to make it easier for you to build video apps with a database. Think about it, if you want to build the next TikTok, Instagram, or YouTube, you can use this component to get you started or even migrate your existing data from Mux to Convex and go from there!

This package gives you:

- Convex tables for Mux `assets`, `uploads`, `liveStreams`, and `events`
- Mutations to upsert/delete synced Mux objects
- App-level `videoMetadata` storage (`userId`, title, visibility, tags, custom fields)
- Query helpers for catalog and user-facing video data

## Packages

- Component package: `convex-mux-component`
- App scaffolder package: `convex-mux-init`

## Quickstart

## 1) Install packages

```sh
npm i convex-mux-component convex-mux-init @mux/mux-node
```

## 2) Mount the component

Create or update `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import mux from "convex-mux-component/convex.config.js";

const app = defineApp();
app.use(mux, { name: "mux" });

export default app;
```

## 3) Generate app-level wrappers

```sh
npx convex-mux-init --component-name mux
```

This creates:

- `convex/migrations.ts`
- `convex/muxWebhook.node.ts`

## 4) Add webhook HTTP route

Create or update `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
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
```

## 5) Set Mux API env vars in Convex

```sh
npx convex env set MUX_TOKEN_ID <your_mux_token_id>
npx convex env set MUX_TOKEN_SECRET <your_mux_token_secret>
```

## 6) Start Convex and run backfill

```sh
npx convex dev
npx convex run migrations:backfillMux '{}'
```

## 7) Configure Mux webhook endpoint

In Mux dashboard, create a webhook endpoint:

- URL for deployed app: `https://<your-deployment>.convex.site/mux/webhook`
- URL for local-only app: use ngrok/cloudflared tunnel to `/mux/webhook`

Copy the webhook signing secret and set it in Convex:

```sh
npx convex env set MUX_WEBHOOK_SECRET <your_mux_webhook_secret>
```

## 8) Verify data in Convex dashboard

Tables to check:

- `assets`
- `uploads`
- `liveStreams`
- `events`
- `videoMetadata`

## Why Both Backfill and Webhook?

- Backfill is one-time catch-up for existing Mux objects.
- Webhooks keep your Convex tables updated in near real time as Mux state changes.

Without webhooks, data will drift over time.

## Runtime Model

This is intentional and follows Convex component best practices:

- `convex-mux-component` is component-only (schema, queries, mutations)
- Node runtime integration (Mux SDK, webhook verify, backfill) is app-level code in your project
- `convex-mux-init` scaffolds those app-level files

## If You Use a Different Component Name

If you mount with a different name, for example:

```ts
app.use(mux, { name: "videoInfra" });
```

then regenerate wrappers with matching name:

```sh
npx convex-mux-init --component-name videoInfra --force
```

## Common Commands

```sh
# regenerate wrappers
npx convex-mux-init --component-name mux --force

# run backfill with options
npx convex run migrations:backfillMux '{"maxAssets":500,"defaultUserId":"dev-user-1","includeVideoMetadata":true}'

# run against prod deployment
npx convex run --prod migrations:backfillMux '{"maxAssets":500}'
```

## Agent Checklist

Use this order when automating setup:

1. `npm i convex-mux-component convex-mux-init @mux/mux-node`
2. Ensure `convex/convex.config.ts` mounts `convex-mux-component/convex.config.js`
3. Run `npx convex-mux-init --component-name <mounted_name> --force`
4. Ensure `convex/http.ts` routes `POST /mux/webhook` to `internal.muxWebhook.ingestMuxWebhook`
5. Set `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`
6. Run `npx convex dev`
7. Run `npx convex run migrations:backfillMux '{}'`
8. Configure Mux webhook URL and set `MUX_WEBHOOK_SECRET`

## Troubleshooting

- `Could not find function for 'migrations:backfillMux'`: Ensure `convex/migrations.ts` exists, exports `backfillMux`, then run `npx convex dev`.
- `InvalidReference ... does not export [mux_node.backfillAssets]`: Do not call `components.<name>.mux_node.*`; use app-level wrappers from `convex-mux-init`.
- `TypeScript ... webhooks.unwrap ... Record<string, unknown>`: Regenerate wrappers with `--force` using latest `convex-mux-init`; expected cast is `as unknown as Record<string, unknown>`.
- `Node APIs without "use node"`: Ensure Node runtime files start with `"use node";`.
