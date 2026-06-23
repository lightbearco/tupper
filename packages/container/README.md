# @tupper/container

[Apple Containers](https://github.com/apple/container) backend for [Tupper](../../README.md) — runs sandboxes via the `container` CLI on macOS 26+.

Implements `SandboxBackend` from [`@tupper/core`](../core) and **self-registers on import**, so simply having it installed lets `@tupper/sdk` auto-select it on macOS.

## Prerequisites

- macOS 26+ with Apple's [`container`](https://github.com/apple/container) installed.
- The container service running: `container system start`.

## Usage

Usually you don't import this directly — use [`@tupper/sdk`](../sdk). To wire it explicitly (or pass options such as a custom CLI runner):

```ts
import { ContainerBackend } from "@tupper/container";
import { registerBackend } from "@tupper/core";

registerBackend(new ContainerBackend());
```

## Backend options

Container-specific options go through `backendOptions` (typed via `ContainerCreateOptions`):

```ts
const box = await Sandbox.create({
  backendOptions: { noDns: true },
});
```

- **`noDns`** — disable DNS configuration in the sandbox (`container run --no-dns`).

Sandboxes share no host directory by default — the `container run` containers Tupper uses do not auto-mount your home dir (the automatic `$HOME` mount is a [`container machine`](https://github.com/apple/container/blob/main/docs/container-machine.md) feature, not used here). To share host paths, use the standard [`mounts`](../../docs/sdk.md#mounting-host-directories) option.

## Operation mapping

| Core method | `container` command |
| --- | --- |
| `isAvailable` | `container system status` |
| `create` | `container run --detach … <image> sleep infinity` |
| `execute` | `container exec <id> sh -c "<cmd>"` |
| `writeFiles` / `readFiles` | `container cp` (via host temp files) |
| `list` / `info` | `container list --format json` / `container inspect` |
| `kill` | `container stop <id>` then `container rm <id>` |
