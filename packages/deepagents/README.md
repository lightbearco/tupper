# @tupper/deepagents

A [LangChain deepagents](https://github.com/langchain-ai/deepagentsjs) sandbox backend backed by [Tupper](../../README.md). Let your deep agents execute code, run commands, and read/write files inside a Tupper sandbox (Apple Containers today; Firecracker/WSL planned).

## Install

```bash
bun add @tupper/deepagents @tupper/sdk @tupper/container deepagents
```

`deepagents` is a peer dependency; install the Tupper backend for your platform (`@tupper/container` on macOS).

## Usage

```ts
import { createDeepAgent } from "deepagents";
import { TupperSandbox } from "@tupper/deepagents";

const sandbox = await TupperSandbox.create({ image: "docker.io/library/alpine:latest" });
try {
  const agent = createDeepAgent({ backend: sandbox /*, model, systemPrompt */ });
  // ... run the agent; its file + shell tools execute inside the sandbox
} finally {
  await sandbox.close();
}
```

`TupperSandbox` extends deepagents' `BaseSandbox`, implementing the `execute`, `uploadFiles`, and `downloadFiles` primitives over [`@tupper/sdk`](../sdk); deepagents builds `ls` / `read` / `grep` / `glob` / `write` / `edit` on top of them.

## Filesystem mounting

**Host directories** — mount host paths into the sandbox at creation (bind mounts, applied at launch):

```ts
const sandbox = await TupperSandbox.create({
  image: "docker.io/library/alpine:latest",
  mounts: [{ source: "/host/project", target: "/work" }],
});
```

**Virtual filesystem** — deepagents' own `CompositeBackend` routes path prefixes to different backends, and the Tupper sandbox is just one route (no Tupper-specific API needed):

```ts
import { CompositeBackend, StateBackend } from "deepagents";

const backend = new CompositeBackend(sandbox, { "/memory/": new StateBackend() });
```

Cloud / FUSE mounts and mounting into an already-running sandbox aren't supported — pass host `mounts` at create time.
