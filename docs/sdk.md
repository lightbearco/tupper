# SDK reference — `@tupper/sdk`

The SDK is an ergonomic, E2B-style facade over [`@tupper/core`](architecture.md). It depends only on core; the platform backend is resolved at runtime.

```ts
import { Sandbox } from "@tupper/sdk";
```

## `Sandbox`

### Static methods

| Method | Description |
| --- | --- |
| `Sandbox.create(opts?)` | Provision and start a sandbox. Returns a `Sandbox`. |
| `Sandbox.connect(id, opts?)` | Reattach to an existing sandbox by id. |
| `Sandbox.list(opts?)` | List sandboxes (`SandboxInfo[]`). |
| `Sandbox.kill(id, opts?)` | Stop and remove a sandbox by id. |

`opts` for `create` is `SandboxOpts` (= [`CreateSandboxOptions`](#createsandboxoptions) plus `backend?: string`). For `connect` / `list` / `kill` it is `{ backend?: string }`. `backend` forces a specific backend — either a registered name (e.g. `"apple-container"`) or a package specifier that is lazily imported (e.g. `"@tupper/firecracker"`); omit it to auto-select. See [backend resolution](architecture.md#backend-resolution).

### Instance members

| Member | Description |
| --- | --- |
| `sandbox.id` | The sandbox id. |
| `sandbox.backend` | Name of the backend that owns it. |
| `sandbox.commands` | Command execution — see [`Commands`](#commands). |
| `sandbox.files` | Filesystem access — see [`FileSystem`](#filesystem). |
| `sandbox.setTimeout(ms)` | (Re)arm the inactivity auto-kill timeout. |
| `sandbox.getHost(port)` | Resolve `"host:port"` for a published port. |
| `sandbox.info()` | Current `SandboxInfo` (status, image, …). |
| `sandbox.kill()` | Stop and remove this sandbox. |

## `Commands`

```ts
const res = await sandbox.commands.run("npm install && npm test", {
  cwd: "/app",
  env: { CI: "true" },
  timeoutMs: 120_000,
});
// res: { stdout, stderr, exitCode, signal?, timedOut? }
```

`run(command, options?)` runs a shell command to completion. `options` is [`ExecOptions`](#execoptions); the result is [`ExecResult`](#execresult).

## `FileSystem`

| Method | Returns | Notes |
| --- | --- | --- |
| `read(path)` | `Promise<string>` | UTF-8 text. |
| `readBytes(path)` | `Promise<Uint8Array>` | Raw bytes. |
| `write(path, data)` | `Promise<void>` | `data` is `string \| Uint8Array`. |
| `write(files)` | `Promise<void>` | Batch: `{ path, data }[]`. |
| `list(path)` | `Promise<FileEntry[]>` | `FileEntry = { name }`. |
| `remove(path)` | `Promise<void>` | Recursive. |
| `rename(from, to)` | `Promise<void>` | Move/rename. |
| `exists(path)` | `Promise<boolean>` | |

Reads and writes go through the backend's file transfer; `list` / `remove` / `rename` / `exists` are implemented over `commands.run` with POSIX-safe quoting.

## Mounting host directories

Share host directories with a sandbox by passing `mounts` at creation. Each `Mount` is `{ source, target, readonly? }` (host path → sandbox path); on the container and Firecracker backends it maps to `--volume source:target[:ro]`. Mounts are read-write and bidirectional by default.

```ts
const box = await Sandbox.create({
  image: "docker.io/library/alpine:latest",
  mounts: [
    { source: "/host/project", target: "/work" },
    { source: "/host/cache", target: "/cache", readonly: true },
  ],
});
```

Mounts are **bind mounts applied at launch** — you can't add one to an already-running sandbox, and cloud-storage / FUSE mounts aren't supported. Provide everything the sandbox needs at create time.

## Types

These come from `@tupper/core` and are re-exported by the SDK.

### `CreateSandboxOptions`

| Field | Type | Description |
| --- | --- | --- |
| `image` | `string` | OCI image reference. Backend supplies a default if omitted. |
| `name` | `string` | Human-friendly name. |
| `cwd` | `string` | Default working directory. |
| `env` | `Record<string,string>` | Environment for all commands. |
| `cpus` | `number` | CPUs to allocate. |
| `memory` | `string` | e.g. `"1g"`, `"512m"`. |
| `ports` | `number[]` | Ports to publish to the host. |
| `mounts` | `Mount[]` | `{ source, target, readonly? }`. |
| `labels` | `Record<string,string>` | Metadata. |
| `timeoutMs` | `number` | Inactivity auto-kill. |
| `backendOptions` | `Record<string,unknown>` | Backend-specific knobs (e.g. WSL distro). |

### `ExecOptions`

`cwd`, `env`, `user`, `timeoutMs`, `stdin` (`string \| Uint8Array`), `onStdout(chunk)`, `onStderr(chunk)`, `signal` (`AbortSignal`).

### `ExecResult`

`stdout: string`, `stderr: string`, `exitCode: number | null`, `signal?: string | null`, `timedOut?: boolean`.

### `SandboxInfo`

`id`, `backend`, `image?`, `status` (`"running" | "stopped" | "unknown"`), `createdAt?`, `labels?`, `ports?` (`{ container, host }[]`).
