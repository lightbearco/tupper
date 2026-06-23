# Getting started

Tupper runs sandboxed Linux environments for AI agents on your own machine. On macOS it uses [Apple Containers](https://github.com/apple/container); Firecracker (Linux) and WSL (Windows) are planned.

## Prerequisites

- **macOS 26+** with Apple's [`container`](https://github.com/apple/container) CLI installed.
- The container service running: `container system start`.
- [Bun](https://bun.com) to work in the monorepo, or Node 18+ to consume the packages.

## Install

Inside this monorepo everything is wired through Bun workspaces:

```bash
bun install
```

As a consumer (once published), install the SDK plus the backend for your platform — the backend is an optional peer dependency:

```bash
bun add @tupper/sdk @tupper/container   # macOS
```

## Your first sandbox

```ts
import { Sandbox } from "@tupper/sdk";

const box = await Sandbox.create({ image: "docker.io/library/alpine:latest" });
try {
  await box.files.write("/tmp/hi.txt", "hello");
  const res = await box.commands.run("cat /tmp/hi.txt");
  console.log(res.stdout); // "hello"
} finally {
  await box.kill();
}
```

`Sandbox.create()` auto-selects the backend for your platform. Pass `{ backend: "apple-container" }` to force a specific one.

## Common operations

```ts
// Run commands
const r = await box.commands.run("node --version", { timeoutMs: 10_000, cwd: "/" });
console.log(r.stdout, r.exitCode);

// Files
await box.files.write("/app/index.js", "console.log(1)");
await box.files.write([ // batch write
  { path: "/app/a.txt", data: "a" },
  { path: "/app/b.bin", data: new Uint8Array([1, 2, 3]) },
]);
const text = await box.files.read("/app/index.js");
const bytes = await box.files.readBytes("/app/b.bin");
const entries = await box.files.list("/app"); // [{ name }]
console.log(await box.files.exists("/app/a.txt")); // true
await box.files.rename("/app/a.txt", "/app/c.txt");
await box.files.remove("/app/b.bin");
```

## Reconnect, list, and clean up

```ts
const all = await Sandbox.list(); // SandboxInfo[]
const again = await Sandbox.connect(box.id); // reattach by id
await again.setTimeout(60_000); // (re)arm inactivity auto-kill
const host = await again.getHost(8080); // "ip:port" for a published port
await Sandbox.kill(box.id); // kill by id without a handle
```

## Where next

- [SDK reference](sdk.md) — the full `Sandbox` API.
- [Architecture](architecture.md) — how backends are selected at runtime.
