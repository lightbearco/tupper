# @tupper/wsl

WSL / Windows backend for [Tupper](../../README.md). **Planned.**

Will implement the `SandboxBackend` interface from [`@tupper/core`](../core) so that `@tupper/sdk` (and the deepagents / Mastra adapters) run unchanged on Windows. Until then, `@tupper/core`'s `resolveBackend()` degrades gracefully when this package is absent.
