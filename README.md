# Convex Mux Component

Convex component for teams using Mux + Convex together:
- Syncs Mux assets, uploads, live streams, and webhook events into Convex tables.
- Stores app-level video metadata (`userId`, title, tags, visibility, custom fields).
- Gives app code a clean place to enforce auth and map users to videos.

## Rust Note

This component itself must be authored in TypeScript/JavaScript because Convex backend functions/components currently run in JS/TS runtimes.  
If your app is Rust-heavy elsewhere, you can still use this component over Convex APIs and keep Rust in your clients/services.

## What Is Included

- `schema.ts`: tables for `assets`, `uploads`, `liveStreams`, `events`, and `videoMetadata`.
- `mux.node.ts`: Node actions for creating/syncing Mux objects and ingesting webhooks.
- `sync.ts`: internal upsert mutations used by the Mux actions/webhook handler.
- `catalog.ts`: queries for reading synced Mux objects and recent events.
- `videos.ts`: app-facing user metadata mutations/queries.

## App Integration Pattern

1. Add the component to your app.
2. Keep auth checks in your app code (`ctx.auth`), then call component functions with the resolved `userId`.
3. Mount an HTTP route in your app that forwards Mux webhook payloads to `ingestWebhook`.

### Example App Wrapper For Auth

```ts
// convex/videos.ts (in your app, not inside the component)
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { components } from "./_generated/api";

export const upsertMyVideoMetadata = mutation({
  args: {
    muxAssetId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.runMutation(components.mux.videos.upsertVideoMetadata, {
      ...args,
      userId: identity.subject,
    });
  },
});
```

### Example Mux Webhook HTTP Route

```ts
// convex/http.ts (in your app)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    await ctx.runAction(components.mux.mux_node.ingestWebhook, {
      rawBody,
      headers,
      webhookSecret: process.env.MUX_WEBHOOK_SECRET!,
      muxTokenId: process.env.MUX_TOKEN_ID,
      muxTokenSecret: process.env.MUX_TOKEN_SECRET,
    });

    return new Response("ok", { status: 200 });
  }),
});

export default http;
```

## Core APIs

- `mux.node.createAsset`
- `mux.node.createDirectUpload`
- `mux.node.createLiveStream`
- `mux.node.syncAssetById`
- `mux.node.syncUploadById`
- `mux.node.syncLiveStreamById`
- `mux.node.ingestWebhook`
- `videos.upsertVideoMetadata`
- `videos.getVideoByMuxAssetId`
- `videos.listVideosForUser`
- `catalog.getAssetByMuxId`
- `catalog.getUploadByMuxId`
- `catalog.getLiveStreamByMuxId`
- `catalog.listRecentEvents`

## Notes

- Webhook dedupe is done using Mux event IDs when present.
- If `ingestWebhook` receives Mux API credentials, it fetches fresh object state from Mux before upserting.
- If API credentials are omitted, it upserts directly from the webhook payload.
- This component intentionally avoids broad `any` for most public inputs; dynamic Mux payload internals are constrained as JSON objects.

## Typechecking

`npm run typecheck` runs Convex codegen first, then TypeScript:

```sh
npx convex dev
npm run typecheck
```

`convex codegen` requires `CONVEX_DEPLOYMENT` to be configured (set by `convex dev`).
# mux-convex-component
