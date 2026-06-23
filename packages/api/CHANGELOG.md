# @tupper/api

## 0.1.1

### Patch Changes

- Fix uninstallable 0.1.0 packages whose internal dependencies were published as the literal `workspace:*` protocol.

  The release pipeline previously published via `changeset publish`, which shells out to `npm publish` and leaves `workspace:*` verbatim in the published manifests — so `npm install`/`bunx` of any package with internal `@tupper/*` deps failed with `EUNSUPPORTEDPROTOCOL` / `workspace:* failed to resolve`. Releases now publish each package with `bun publish`, which rewrites `workspace:*` to the concrete version.

- Updated dependencies
  - @tupper/core@0.1.1
  - @tupper/sdk@0.1.1
