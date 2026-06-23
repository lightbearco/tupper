# Contributing to Tupper

Thanks for your interest in contributing! This guide covers how to get set up and the conventions we follow. By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- Report bugs and request features via [issues](https://github.com/lightbearco/tupper/issues).
- Improve the documentation under [`docs/`](docs).
- Submit pull requests for fixes and features.

## Development setup

Tupper is a [Bun](https://bun.com) workspace monorepo.

```bash
git clone https://github.com/lightbearco/tupper.git
cd tupper
bun install
```

Common tasks:

```bash
bun test            # run unit tests (no container daemon required)
bun run typecheck   # type-check all packages
bun run check       # Biome lint + format check
bun run check:fix   # auto-fix lint/format issues
```

The Apple Containers backend's live paths need macOS 26+ with the [`container`](https://github.com/apple/container) CLI and `container system start`. The unit tests mock the CLI, so they run anywhere.

## Project layout

| Path | Description |
| --- | --- |
| `packages/core` | Backend-agnostic abstraction (zero dependencies). |
| `packages/container` | Apple Containers backend. |
| `packages/sdk` | E2B-style SDK. |
| `packages/firecracker`, `packages/wsl` | Planned backends. |
| `docs/` | User documentation. |

## Conventions

- **Runtime-agnostic source.** Package source uses Node built-ins only (`node:child_process`, `node:fs/promises`, …). Do not use `Bun.*` runtime APIs — Bun is dev/test tooling only. These packages must run on Node.
- **Lean packages.** Keep dependencies minimal; `@tupper/core` stays dependency-free.
- **Formatting & linting.** Code is formatted and linted with [Biome](https://biomejs.dev). Run `bun run check:fix` before committing.
- **Tests.** Add `bun:test` tests for new behavior, and keep them runnable without a live daemon by injecting fakes.

## Pull requests

1. Fork and create a branch from `main`.
2. Make your change with tests and docs.
3. Ensure `bun run check`, `bun run typecheck`, and `bun test` pass.
4. Open a PR describing the change and linking any related issue.

Note user-facing changes in [CHANGELOG.md](CHANGELOG.md) under "Unreleased".
