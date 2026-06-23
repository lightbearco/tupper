# @tupper/mastra

A [Mastra](https://mastra.ai) `WorkspaceSandbox` backed by [Tupper](../../README.md). Give a Mastra workspace an isolated Tupper sandbox (Apple Containers today; Firecracker/WSL planned) for command execution.

## Install

```bash
bun add @tupper/mastra @tupper/sdk @tupper/container @mastra/core
```

`@mastra/core` is a peer dependency; install the Tupper backend for your platform (`@tupper/container` on macOS).

## Usage

```ts
import { Workspace } from "@mastra/core/workspace";
import { TupperSandbox } from "@tupper/mastra";

const workspace = new Workspace({
  sandbox: new TupperSandbox({ image: "docker.io/library/alpine:latest" }),
});

// Mastra calls sandbox.start() on init and sandbox.destroy() on cleanup.
```

`TupperSandbox` implements Mastra's `WorkspaceSandbox` (`start` / `destroy` / `getInfo` / `executeCommand`) over [`@tupper/sdk`](../sdk).

## Filesystem mounting

Mount host directories into the sandbox at creation (bind mounts, applied at launch):

```ts
const sandbox = new TupperSandbox({
  image: "docker.io/library/alpine:latest",
  mounts: [{ source: "/host/project", target: "/work", readonly: true }],
});
```

Mastra's runtime `sandbox.mount(filesystem, path)` — FUSE / cloud mounts into a *running* sandbox — isn't supported by container or microVM backends (Mastra reports `MountNotSupportedError`). Pass host `mounts` at create time instead.
