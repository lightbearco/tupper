# @tupper/core

Backend-agnostic sandbox abstraction for [Tupper](../../README.md). Its only runtime dependency is [Zod](https://zod.dev), used by the shared validation schemas.

Defines the contracts every backend implements, the registry that selects one dynamically at runtime, and the shared types/schemas/helpers used across the other packages.

## Exports

- **`SandboxBackend`** — a pluggable runtime: `isAvailable`, `create`, `connect`, `list`.
- **`SandboxInstance`** — one sandbox: `execute`, `writeFiles`, `readFiles`, `info`, `setTimeout`, `kill`, `getHost`.
- **`registerBackend` / `getBackend` / `listBackends`** — the backend registry.
- **`resolveBackend(opts?)`** — pick a backend: explicit name → registered-and-available → platform default (lazy `import()`) → throw.
- **`run`** — a `node:child_process` runner (argv array, no shell → injection-safe). No `Bun.*` APIs; runs on Node and Bun alike.
- **Zod schemas** — `CreateSandboxOptionsSchema`, `ExecOptionsSchema`, `MountSchema` for validating untrusted input against the option types.
- **JSON helpers** — `isRecord`, `asRecord`, `asString`, `normalizeStatus`, and the `JsonRecord` type for defensively parsing backend CLI output.
- Types: `ExecResult`, `ExecOptions`, `FileWrite`, `FileReadResult`, `CreateSandboxOptions`, `SandboxInfo`, … and the `TupperError` family.

### `@tupper/core/testing`

Shared test doubles, kept out of the main entry: `fakeSandboxInstance(overrides?)` and `fakeBackend(overrides?)`.

Backends (`@tupper/container`, `@tupper/firecracker`, `@tupper/wsl`) **self-register on import**, so core never statically depends on any of them.

## Docs

- [Architecture](../../docs/architecture.md) — the abstraction and backend resolution.
