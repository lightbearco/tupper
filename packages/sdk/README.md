# @tupper/sdk

E2B-style SDK for [Tupper](../../README.md) sandboxes. Depends only on [`@tupper/core`](../core); the platform backend is resolved at runtime.

On macOS, install the Apple Containers backend alongside it:

```bash
bun add @tupper/sdk @tupper/container
```

## Usage

```ts
import { Sandbox } from "@tupper/sdk";

// Auto-selects @tupper/container on macOS. Pass { backend: "apple-container" } to force it.
const box = await Sandbox.create({ image: "docker.io/library/alpine:latest" });

await box.files.write("/tmp/hi.txt", "hello");
const out = await box.commands.run("cat /tmp/hi.txt");
console.log(out.stdout); // "hello"
console.log(await box.files.read("/tmp/hi.txt")); // "hello"

await box.kill();
```

## API

- `Sandbox.create(opts?)`, `Sandbox.connect(id, opts?)`, `Sandbox.list(opts?)`, `Sandbox.kill(id, opts?)`
- `sandbox.commands.run(cmd, opts?)`
- `sandbox.files.{read, readBytes, write, list, remove, rename, exists}`
- `sandbox.setTimeout(ms)`, `sandbox.getHost(port)`, `sandbox.info()`, `sandbox.kill()`

Full reference: [docs/sdk.md](../../docs/sdk.md) · [Getting started](../../docs/getting-started.md)
