# Convex Mux Component

Yo! 

We made a reusable Convex component for apps that use Mux for video and Convex for backend data. We hear from devs and want to make it easier for you to build video apps with a database. Think about it, if you want to build the next TikTok, Instagram, or YouTube, you can use this component to get you started or even migrate your existing data from Mux to Convex and go from there! 

Here's what this component provides:

- Convex tables for Mux `assets`, `uploads`, `liveStreams`, and `events`
- Upsert/delete mutations to keep those tables in sync
- App-level `videoMetadata` storage (`userId`, title, visibility, tags, custom fields)
- Query helpers for catalog and user-facing video data

## Runtime Model (important info!)

This package follows Convex component best practices:

- The component package contains only component code (`convex.config.ts`, schema, queries, mutations)
- Node runtime integration code (Mux SDK calls, webhook verification, backfills) lives in the consuming app
- No CLI `bin` is shipped in the component package itself

This is intentional and avoids bundling/runtime friction in consumer projects.


## End-to-End Setup (From Scratch)

## 1) Create a Convex app

```sh
npx create-convex@latest my-video-app
cd my-video-app
```

If you use Bun:

```sh
bun install
```

Then start Convex once to provision/select your deployment:

```sh
npx convex dev
```

(You can use `bunx convex dev` if you prefer.)

## 2) Install this component

```sh
npm i convex-mux-component
```

## 3) Mount the component

Create or update `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import mux from "convex-mux-component/convex.config.js";

const app = defineApp();
app.use(mux, { name: "mux" });

export default app;
```

`mux` is your mounted component name. If you use a different name, update all `components.mux...` calls accordingly. So basically if you want your table to be named `muxVideos`, you should mount it as `mux` and use `components.muxVideos` in your code.

## 4) Add app-level wrappers (backfill + webhook)

Use the scaffolder package we provided for you.This is a really fast way to migrate your data from Mux to Convex:

```sh
npx convex-mux-init --component-name mux
```

If `convex-mux-init` is not published yet, use the local tarball flow in
`Optional: Scaffold Package In This Repo`.

This creates:

- `convex/migrations.ts`
- `convex/muxWebhook.node.ts`

Install Mux SDK in your app (required by generated files):

```sh
npm i @mux/mux-node
```

## 5) Add HTTP route for Mux webhook

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

## 6) Add Mux credentials to Convex env

You can set env vars from the Convex dashboard or CLI.

Dashboard:

- Open your project in Convex dashboard
- Go to project/deployment settings for environment variables
- Add:
  - `MUX_TOKEN_ID`
  - `MUX_TOKEN_SECRET`

CLI equivalent:

```sh
npx convex env set MUX_TOKEN_ID <your_mux_token_id>
npx convex env set MUX_TOKEN_SECRET <your_mux_token_secret>
```

## 7) Generate/apply schema and functions

```sh
npx convex dev
```

This applies component schema and generates `convex/_generated/*`.

## 8) Backfill Mux assets into Convex

Run the generated migration action:

```sh
npx convex run migrations:backfillMux '{}'
```

With options:

```sh
npx convex run migrations:backfillMux '{"maxAssets":500,"defaultUserId":"dev-user-1","includeVideoMetadata":true}'
```

For production deployment:

```sh
npx convex run --prod migrations:backfillMux '{"maxAssets":500}'
```

## Why Webhook URL Is Required

Backfill is a one-time catch-up. It does not keep data fresh.

Mux webhooks are how your app receives ongoing changes in near real time, such as:

- asset status updates (for example `preparing` to `ready`)
- deletions
- upload and live stream lifecycle events

Without the webhook URL:

- component tables only update when you run backfill/manual sync
- video state in Convex will drift from Mux over time

## 9) Configure Mux webhook endpoint

In Mux dashboard:

- Create webhook endpoint
- URL:
  - Local testing (with tunnel): `https://<your-tunnel-domain>/mux/webhook`
  - Deployed Convex app: `https://<your-deployment>.convex.site/mux/webhook`
- Select desired video events (asset, upload, live stream)
- Copy signing secret into `MUX_WEBHOOK_SECRET`

Set it via CLI:

```sh
npx convex env set MUX_WEBHOOK_SECRET <your_mux_webhook_secret>
```

Note:

- If you use deployed Convex URL, you do not need ngrok.
- If your app is only local and not publicly reachable, use ngrok/cloudflared.

## 10) Verify data

In Convex dashboard data tables, you should see:

- `assets`
- `uploads`
- `liveStreams`
- `events`
- `videoMetadata`

## Local Testing This Package Before Publish

From this component repo:

```sh
npm pack --cache /tmp/npm-cache
```

In a separate consumer app:

```sh
npm i /absolute/path/to/convex-mux-component-0.1.6.tgz
npx convex dev
```

## Optional: Scaffold Package In This Repo

The separate scaffolder lives in `scaffold/` and should be published as its own package (`convex-mux-init`).

Build/test locally:

```sh
cd scaffold
npm pack --cache /tmp/npm-cache
```

Then run in consumer app:

```sh
npm exec --yes --package /absolute/path/to/convex-mux-init-0.1.0.tgz convex-mux-init -- --component-name mux
```

## Troubleshooting

- `Could not find function for 'migrations:backfillMux'`
  - Ensure `convex/migrations.ts` exists and exports `backfillMux`
  - Run `npx convex dev` again

- `InvalidReference ... does not export [mux_node.backfillAssets]`
  - Do not call `components.<name>.mux_node.*`
  - Use app-level Node actions (`convex/migrations.ts`, `convex/muxWebhook.node.ts`) and call `components.<name>.sync.*Public`

- `TypeScript ... webhooks.unwrap ... Record<string, unknown>`
  - Use `const event = mux.webhooks.unwrap(...) as unknown as Record<string, unknown>;`

- `It looks like you are using Node APIs from a file without the "use node" directive`
  - Add `"use node";` at the top of files that use Mux SDK/Node APIs
