# convex-mux-init

> **Deprecated:** This package has been merged into `@mux/convex`. Use `npx @mux/convex init` instead.

## Migration

Replace:

```sh
npx convex-mux-init [options]
```

With:

```sh
npx @mux/convex init [options]
```

All options (`--component-name`, `--force`, `--skip-config`, etc.) work the same way.

---

## Legacy Usage

Scaffold app-level Convex files for `@mux/convex`.

### Purpose

Convex component packages should stay component-only. App-specific Node wrappers
for backfills and webhooks belong in the consuming app.

This CLI creates those app files for you:

- `convex/convex.config.ts`
- `convex/migrations.ts`
- `convex/muxWebhook.ts`
- `convex/http.ts`

### Usage

Run in your app root (the folder that contains `convex/`):

```sh
npx convex-mux-init
```

Options:

```sh
npx convex-mux-init --component-name mux
npx convex-mux-init --force
npx convex-mux-init --skip-config
npx convex-mux-init --skip-http
npx convex-mux-init --skip-migration
npx convex-mux-init --skip-webhook
```

### Next Steps After Scaffolding

1. Install Mux SDK in your app:

```sh
npm i @mux/mux-node
```

2. Set env vars in Convex:

```sh
npx convex env set MUX_TOKEN_ID <id>
npx convex env set MUX_TOKEN_SECRET <secret>
npx convex env set MUX_WEBHOOK_SECRET <secret>
```

3. Run:

```sh
npx convex dev
npx convex run migrations:backfillMux '{}'
```

### Video Metadata From Upload Flow

Generated webhook/backfill code can auto-upsert `videoMetadata` from Mux asset
`passthrough`.

- If `passthrough` is a plain string, it is treated as `userId`.
- If `passthrough` is JSON, it may include:
  `userId` (or `user_id`), `title`, `description`, `tags`, `visibility`,
  and `custom`.

Example:

```json
{"userId":"user_123","title":"My clip","visibility":"public"}
```
