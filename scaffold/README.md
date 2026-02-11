# convex-mux-init

Scaffold app-level Convex files for `convex-mux-component`.

## Purpose

Convex component packages should stay component-only. App-specific Node wrappers
for backfills and webhooks belong in the consuming app.

This CLI creates those app files for you:

- `convex/convex.config.ts`
- `convex/migrations.ts`
- `convex/muxWebhook.node.ts`
- `convex/http.ts`

## Usage

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

## Next Steps After Scaffolding

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
