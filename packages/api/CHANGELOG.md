# @tupper/api

## 0.1.2

### Patch Changes

- Install a sandbox backend automatically with the CLI, API, and MCP frontends.

  Each frontend now declares the backends as `optionalDependencies`, so the one matching the host platform installs on its own (`@tupper/container` on macOS, `@tupper/firecracker` on Linux; the rest are skipped via their `os` field). `npx @tupper/mcp`, `npx @tupper/api`, and `npm i -g @tupper/cli` now work without separately installing a backend — fixing the "No available sandbox backend" error on a fresh run.

## 0.1.1

### Patch Changes

- Fix uninstallable 0.1.0 packages whose internal dependencies were published as the literal `workspace:*` protocol.

  The release pipeline previously published via `changeset publish`, which shells out to `npm publish` and leaves `workspace:*` verbatim in the published manifests — so `npm install`/`bunx` of any package with internal `@tupper/*` deps failed with `EUNSUPPORTEDPROTOCOL` / `workspace:* failed to resolve`. Releases now publish each package with `bun publish`, which rewrites `workspace:*` to the concrete version.

- Updated dependencies
  - @tupper/core@0.1.1
  - @tupper/sdk@0.1.1
