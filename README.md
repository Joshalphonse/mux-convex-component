# Mux Convex Component

![Mux Convex Component](public/buff.png)

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

## 2) Generate app-level Convex files

```sh
npx convex-mux-init --component-name mux
```

This creates:

- `convex/convex.config.ts`
- `convex/migrations.ts`
- `convex/muxWebhook.node.ts`
- `convex/http.ts`

If files already exist, the CLI skips them unless you pass `--force`.

## 3) Set Mux API env vars in Convex

```sh
npx convex env set MUX_TOKEN_ID <your_mux_token_id>
npx convex env set MUX_TOKEN_SECRET <your_mux_token_secret>
```

## 4) Start Convex and run backfill

```sh
npx convex dev
npx convex run migrations:backfillMux '{}'
```

## 5) Configure Mux webhook endpoint

In Mux dashboard, create a webhook endpoint:

- URL for deployed app: `https://<your-deployment>.convex.site/mux/webhook`
- URL for local-only app: use ngrok/cloudflared tunnel to `/mux/webhook`

Copy the webhook signing secret and set it in Convex:

```sh
npx convex env set MUX_WEBHOOK_SECRET <your_mux_webhook_secret>
```

## 6) Verify data in Convex dashboard

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
2. Run `npx convex-mux-init --component-name <mounted_name> --force`
3. Ensure `convex/convex.config.ts` mounts `convex-mux-component/convex.config.js` with the same `<mounted_name>`
4. Ensure `convex/http.ts` routes `POST /mux/webhook` to `internal.muxWebhook.ingestMuxWebhook`
5. Set `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`
6. Run `npx convex dev`
7. Run `npx convex run migrations:backfillMux '{}'`
8. Configure Mux webhook URL and set `MUX_WEBHOOK_SECRET`

## Troubleshooting

- `Could not find function for 'migrations:backfillMux'`: Ensure `convex/migrations.ts` exists, exports `backfillMux`, then run `npx convex dev`.
- `InvalidReference ... does not export [mux_node.backfillAssets]`: Do not call `components.<name>.mux_node.*`; use app-level wrappers from `convex-mux-init`.
- `TypeScript ... webhooks.unwrap ... Record<string, unknown>`: Regenerate wrappers with `--force` using latest `convex-mux-init`; expected cast is `as unknown as Record<string, unknown>`.
- `TypeScript ... request.headers.entries is not a function/property`: Build headers with `request.headers.forEach(...)` in `convex/http.ts`.
- Webhooks route compiles but never updates tables: If `ingestMuxWebhook` is generated as `internalAction`, call it via `internal.muxWebhook.ingestMuxWebhook` (not `anyApi.*`).
- `Node APIs without "use node"`: Ensure Node runtime files start with `"use node";`.
