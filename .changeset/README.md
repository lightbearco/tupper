# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It
drives versioning, changelogs, and npm publishing for the `@tupper/*` packages.

## Adding a changeset

When you make a change that should ship in a release, run:

```sh
bun run changeset
```

Pick the affected packages, choose a semver bump (`patch` / `minor` / `major`), and
write a short summary. This creates a markdown file in this folder — commit it with
your PR.

## How releases happen

On every push to `main`, the **Release** GitHub Action runs Changesets:

- If there are pending changesets, it opens (or updates) a **"Version Packages"** PR
  that bumps versions, updates `CHANGELOG.md` files, and removes the consumed
  changesets.
- When that PR is merged, the same workflow runs `bun run ci:publish`, which
  publishes each package with `bun publish` (rewriting `workspace:*` to resolved
  versions — `changeset publish`/`npm publish` does **not** do this) and tags the
  release with `changeset tag`.

See the [Changesets docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
for details.
