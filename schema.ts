import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const playbackId = v.object({
  id: v.string(),
  policy: v.optional(v.string()),
});

const videoTrack = v.object({
  id: v.optional(v.string()),
  type: v.optional(v.string()),
  textType: v.optional(v.string()),
  languageCode: v.optional(v.string()),
  status: v.optional(v.string()),
  name: v.optional(v.string()),
});

const genericObject = v.record(v.string(), v.any());

export default defineSchema({
  assets: defineTable({
    muxAssetId: v.string(),
    status: v.optional(v.string()),
    playbackIds: v.optional(v.array(playbackId)),
    durationSeconds: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
    maxStoredResolution: v.optional(v.string()),
    maxStoredFrameRate: v.optional(v.number()),
    passthrough: v.optional(v.string()),
    uploadId: v.optional(v.string()),
    liveStreamId: v.optional(v.string()),
    tracks: v.optional(v.array(videoTrack)),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
    deletedAtMs: v.optional(v.number()),
    raw: genericObject,
  })
    .index("by_mux_asset_id", ["muxAssetId"])
    .index("by_status", ["status"])
    .index("by_updated_at", ["updatedAtMs"]),

  liveStreams: defineTable({
    muxLiveStreamId: v.string(),
    status: v.optional(v.string()),
    playbackIds: v.optional(v.array(playbackId)),
    reconnectWindowSeconds: v.optional(v.number()),
    recentAssetIds: v.optional(v.array(v.string())),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
    deletedAtMs: v.optional(v.number()),
    raw: genericObject,
  })
    .index("by_mux_live_stream_id", ["muxLiveStreamId"])
    .index("by_status", ["status"])
    .index("by_updated_at", ["updatedAtMs"]),

  uploads: defineTable({
    muxUploadId: v.string(),
    status: v.optional(v.string()),
    uploadUrl: v.optional(v.string()),
    timeoutSeconds: v.optional(v.number()),
    corsOrigin: v.optional(v.string()),
    assetId: v.optional(v.string()),
    error: v.optional(genericObject),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
    deletedAtMs: v.optional(v.number()),
    raw: genericObject,
  })
    .index("by_mux_upload_id", ["muxUploadId"])
    .index("by_status", ["status"])
    .index("by_updated_at", ["updatedAtMs"]),

  events: defineTable({
    muxEventId: v.optional(v.string()),
    type: v.string(),
    objectType: v.optional(v.string()),
    objectId: v.optional(v.string()),
    occurredAtMs: v.optional(v.number()),
    receivedAtMs: v.number(),
    verified: v.boolean(),
    raw: genericObject,
  })
    .index("by_mux_event_id", ["muxEventId"])
    .index("by_type", ["type"])
    .index("by_object", ["objectType", "objectId"])
    .index("by_received_at", ["receivedAtMs"]),

  videoMetadata: defineTable({
    muxAssetId: v.string(),
    userId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("unlisted"), v.literal("public"))
    ),
    custom: v.optional(genericObject),
    createdAtMs: v.number(),
    updatedAtMs: v.number(),
  })
    .index("by_mux_asset_id", ["muxAssetId"])
    .index("by_user_id", ["userId"])
    .index("by_asset_and_user", ["muxAssetId", "userId"])
    .index("by_updated_at", ["updatedAtMs"]),
});
