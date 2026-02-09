import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAssetByMuxId = query({
  args: { muxAssetId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_mux_asset_id", (q) => q.eq("muxAssetId", args.muxAssetId))
      .unique();
  },
});

export const getLiveStreamByMuxId = query({
  args: { muxLiveStreamId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveStreams")
      .withIndex("by_mux_live_stream_id", (q) =>
        q.eq("muxLiveStreamId", args.muxLiveStreamId)
      )
      .unique();
  },
});

export const getUploadByMuxId = query({
  args: { muxUploadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("uploads")
      .withIndex("by_mux_upload_id", (q) => q.eq("muxUploadId", args.muxUploadId))
      .unique();
  },
});

export const listAssets = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_updated_at")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listLiveStreams = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveStreams")
      .withIndex("by_updated_at")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listUploads = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("uploads")
      .withIndex("by_updated_at")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const listRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_received_at")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
