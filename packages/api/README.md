# @tupper/api

HTTP API for [Tupper](../../README.md) sandboxes, built on [Hono](https://hono.dev). A thin REST layer over [`@tupper/sdk`](../sdk) — the sandbox backend is resolved per request.

## Run the server

Run the standalone server with the `tupper-api` bin — no install needed. The platform sandbox **backend** ([`@tupper/container`](../container) on macOS, [`@tupper/firecracker`](../firecracker) on Linux) is installed automatically as an optional dependency:

```bash
npx @tupper/api          # npm
pnpm dlx @tupper/api     # pnpm
bunx @tupper/api         # bun
```

The port and host are optional — set them with flags or environment variables:

```bash
npx @tupper/api --port 8080 --host 0.0.0.0
# or
PORT=8080 HOST=0.0.0.0 npx @tupper/api
```

From a checkout of this package, `bun run start` runs the built server (`node ./dist/server.mjs`) after `bun run build`.

### Configuration

| Flag | Env var | Default | Description |
| --- | --- | --- | --- |
| `--port`, `-p` | `PORT` | `3000` | Port to listen on. |
| `--host` | `HOST` | `localhost` | Hostname/address to bind (use `0.0.0.0` to accept external connections). |

A flag takes precedence over its environment variable. The `tupper-api` bin uses [`@hono/node-server`](https://github.com/honojs/node-server) (built on `node:http`), so it runs on both Node and Bun.

## Backend resolution

The sandbox backend is resolved **once, at boot** — when `createApp()` runs — and reused for the lifetime of the app. There is no per-request backend selection. By default the platform default is auto-detected; pass `createApp({ backend })` (a registered name or package specifier) to pin a specific one. If no backend is available, `createApp()` rejects, so the server fails to start rather than failing on the first request.

The backend package ships as an optional dependency and is installed automatically for the host platform (`@tupper/container` on macOS, `@tupper/firecracker` on Linux). To use a different one, install it and pass `createApp({ backend })` — see the [SDK reference](../../docs/sdk.md).

## Embed in your own Hono app

The standalone server above is the way to *run* the API. If instead you want the routes inside your own [Hono](https://hono.dev) application, `createApp()` resolves a backend and returns a plain Hono app you can mount:

```ts
import { Hono } from "hono";
import { createApp } from "@tupper/api";

const app = new Hono();
app.route("/tupper", await createApp()); // Tupper API now served under /tupper/*
```

`createApp` is async (it resolves the backend at boot) and accepts `{ backend }` to pin one. The result is a standard Hono instance, so its `.fetch` handler also works directly on any Web-standard runtime (Bun, Deno, Cloudflare Workers, …) if you'd rather serve it yourself.

## Endpoints

| Method | Path | Body / query | Result |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ ok: true, backend }` |
| `GET` | `/sandboxes` | — | `{ sandboxes: SandboxInfo[] }` |
| `POST` | `/sandboxes` | [`CreateSandboxOptions`](../../docs/sdk.md#createsandboxoptions) | `SandboxInfo` (201) |
| `GET` | `/sandboxes/:id` | — | `SandboxInfo` |
| `DELETE` | `/sandboxes/:id` | — | 204 |
| `POST` | `/sandboxes/:id/commands` | `{ command, cwd?, env?, user?, timeoutMs? }` | `ExecResult` |
| `GET` | `/sandboxes/:id/files` | `?path` | `{ path, content }` |
| `PUT` | `/sandboxes/:id/files` | `{ path, content }` | `{ path }` |
