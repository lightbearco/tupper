# @tupper/firecracker

[Firecracker](https://firecracker-microvm.github.io/) microVM backend for [Tupper](../../README.md) — runs each sandbox as a lightweight microVM on Linux.

It drives Firecracker through [firecracker-containerd](https://github.com/firecracker-microvm/firecracker-containerd) using the `nerdctl` CLI (`--runtime aws.firecracker`), so it mirrors the [`@tupper/container`](../container) backend's operation mapping. Implements `SandboxBackend` from [`@tupper/core`](../core) and **self-registers on import**, so `@tupper/sdk` auto-selects it on Linux.

> [!WARNING]
> Firecracker requires a **Linux host with KVM**. This backend is unit-tested with a mocked CLI but has not yet been verified against a live firecracker-containerd setup — treat it as experimental and report issues.

## Prerequisites

- Linux with KVM (`/dev/kvm`).
- [firecracker-containerd](https://github.com/firecracker-microvm/firecracker-containerd) configured with the `aws.firecracker` runtime.
- [`nerdctl`](https://github.com/containerd/nerdctl) on `PATH`.

## Usage

Usually you don't import this directly — use [`@tupper/sdk`](../sdk). To wire it explicitly (or customize the CLI binary, namespace, or runtime):

```ts
import { registerBackend } from "@tupper/core";
import { FirecrackerBackend } from "@tupper/firecracker";

registerBackend(new FirecrackerBackend({ namespace: "firecracker", runtime: "aws.firecracker" }));
```

## Operation mapping

| Core method | `nerdctl` command |
| --- | --- |
| `isAvailable` | `nerdctl version` |
| `create` | `nerdctl run --detach --runtime aws.firecracker … <image> sleep infinity` |
| `execute` | `nerdctl exec <id> sh -c "<cmd>"` |
| `writeFiles` / `readFiles` | `nerdctl cp` (via host temp files) |
| `list` / `info` | `nerdctl ps --format '{{json .}}'` / `nerdctl inspect` |
| `kill` | `nerdctl stop <id>` then `nerdctl rm <id>` |
