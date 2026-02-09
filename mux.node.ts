"use node";

import Mux from "@mux/mux-node";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

type JsonObject = Record<string, unknown>;

type MuxWebhookEvent = JsonObject & {
  id?: unknown;
  type?: unknown;
  created_at?: unknown;
  data?: {
    id?: unknown;
  };
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a JSON object payload.");
  }
  return value as JsonObject;
}

function parseWebhookEvent(value: unknown): MuxWebhookEvent {
  return asObject(value) as MuxWebhookEvent;
}

function hasApiCredentials(args: {
  muxTokenId?: string;
  muxTokenSecret?: string;
}): args is { muxTokenId: string; muxTokenSecret: string } {
  return Boolean(args.muxTokenId && args.muxTokenSecret);
}

function createMuxClient(args: {
  muxTokenId?: string;
  muxTokenSecret?: string;
  webhookSecret?: string;
}): Mux {
  return new Mux({
    tokenId: args.muxTokenId,
    tokenSecret: args.muxTokenSecret,
    webhookSecret: args.webhookSecret,
  });
}

export const createAsset = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    params: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const asset = await mux.video.assets.create(args.params);
    await ctx.runMutation(internal.sync.upsertAssetFromPayload, { asset });
    return asset;
  },
});

export const createDirectUpload = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    params: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const upload = await mux.video.uploads.create(args.params ?? {});
    await ctx.runMutation(internal.sync.upsertUploadFromPayload, { upload });
    return upload;
  },
});

export const createLiveStream = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    params: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const liveStream = await mux.video.liveStreams.create(args.params ?? {});
    await ctx.runMutation(internal.sync.upsertLiveStreamFromPayload, { liveStream });
    return liveStream;
  },
});

export const syncAssetById = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const asset = await mux.video.assets.retrieve(args.muxAssetId);
    await ctx.runMutation(internal.sync.upsertAssetFromPayload, { asset });
    return asset;
  },
});

export const syncUploadById = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    muxUploadId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const upload = await mux.video.uploads.retrieve(args.muxUploadId);
    await ctx.runMutation(internal.sync.upsertUploadFromPayload, { upload });
    return upload;
  },
});

export const syncLiveStreamById = action({
  args: {
    muxTokenId: v.string(),
    muxTokenSecret: v.string(),
    muxLiveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = createMuxClient(args);
    const liveStream = await mux.video.liveStreams.retrieve(args.muxLiveStreamId);
    await ctx.runMutation(internal.sync.upsertLiveStreamFromPayload, { liveStream });
    return liveStream;
  },
});

export const ingestWebhook = action({
  args: {
    rawBody: v.string(),
    headers: v.record(v.string(), v.string()),
    webhookSecret: v.string(),
    verifySignature: v.optional(v.boolean()),
    muxTokenId: v.optional(v.string()),
    muxTokenSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifySignature = args.verifySignature ?? true;
    const normalizedHeaders = normalizeHeaders(args.headers);

    let event: MuxWebhookEvent;

    if (verifySignature) {
      const mux = createMuxClient({
        webhookSecret: args.webhookSecret,
      });
      const unwrapped = mux.webhooks.unwrap(args.rawBody, normalizedHeaders);
      event = parseWebhookEvent(unwrapped);
    } else {
      event = parseWebhookEvent(JSON.parse(args.rawBody));
    }

    const eventRecord = await ctx.runMutation(internal.sync.recordWebhookEvent, {
      event,
      verified: verifySignature,
    });
    if (eventRecord.alreadyProcessed) {
      return { event: eventRecord, skipped: true };
    }

    const eventType = asString(event.type) ?? "";
    const objectId = asString(event.data?.id);

    if (!objectId) {
      return { event: eventRecord, skipped: true };
    }

    if (eventType.startsWith("video.asset.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(internal.sync.markAssetDeleted, { muxAssetId: objectId });
        return { event: eventRecord, skipped: false };
      }
      if (hasApiCredentials(args)) {
        const mux = createMuxClient(args);
        const asset = await mux.video.assets.retrieve(objectId);
        await ctx.runMutation(internal.sync.upsertAssetFromPayload, { asset });
      } else {
        await ctx.runMutation(internal.sync.upsertAssetFromPayload, {
          asset: asObject(event.data),
        });
      }
      return { event: eventRecord, skipped: false };
    }

    if (eventType.startsWith("video.live_stream.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(internal.sync.markLiveStreamDeleted, {
          muxLiveStreamId: objectId,
        });
        return { event: eventRecord, skipped: false };
      }
      if (hasApiCredentials(args)) {
        const mux = createMuxClient(args);
        const liveStream = await mux.video.liveStreams.retrieve(objectId);
        await ctx.runMutation(internal.sync.upsertLiveStreamFromPayload, { liveStream });
      } else {
        await ctx.runMutation(internal.sync.upsertLiveStreamFromPayload, {
          liveStream: asObject(event.data),
        });
      }
      return { event: eventRecord, skipped: false };
    }

    if (eventType.startsWith("video.upload.")) {
      if (eventType.endsWith(".deleted")) {
        await ctx.runMutation(internal.sync.markUploadDeleted, { muxUploadId: objectId });
        return { event: eventRecord, skipped: false };
      }
      if (hasApiCredentials(args)) {
        const mux = createMuxClient(args);
        const upload = await mux.video.uploads.retrieve(objectId);
        await ctx.runMutation(internal.sync.upsertUploadFromPayload, { upload });
      } else {
        await ctx.runMutation(internal.sync.upsertUploadFromPayload, {
          upload: asObject(event.data),
        });
      }
      return { event: eventRecord, skipped: false };
    }

    return { event: eventRecord, skipped: true };
  },
});
