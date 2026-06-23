# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-23

### Added

- `@tupper/core` — backend-agnostic sandbox abstraction (`SandboxBackend` / `SandboxInstance`), shared types, the `TupperError` family, a `node:child_process` process runner, and a registry with dynamic backend resolution (`resolveBackend`).
- `@tupper/container` — Apple Containers backend driving the `container` CLI; self-registers on import.
- `@tupper/sdk` — E2B-style `Sandbox` facade (`create` / `connect` / `list` / `kill`, `commands`, `files`).
- `@tupper/firecracker` and `@tupper/wsl` — placeholders for the planned Linux and Windows backends.
- Documentation: getting started, SDK reference, and architecture.

[Unreleased]: https://github.com/lightbearco/tupper/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lightbearco/tupper/releases/tag/v0.1.0
