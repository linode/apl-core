# Git tags as the sole version source of truth

Git tags are the canonical version for every build and release. `package.json` permanently holds `0.0.0` and is never updated by release workflows. The correct version is computed from git tags at build time and injected into the image via `ARG VERSION` in the Dockerfile.

## Why

The previous approach stored the version in `package.json` and committed it back to the branch on every RC bump and stable promotion. This created several problems: the file could drift from the actual tags, the commit created a chicken-and-egg dependency between the build (which needed the version) and the tag (which was created after the build), and it added noise commits to the release branch history with no informational value beyond what the tag already expressed.

## Considered options

- **`package.json` as source of truth** (previous approach) — version committed to branch, read by build and scripts. Rejected because of drift risk, spurious commits, and the circular dependency between build and tag.
- **`git describe` at container startup** — version resolved at runtime. Rejected because it requires shipping git into the container and cannot be baked into artifacts (Helm chart, GitHub release metadata) without an extra indirection.

## Consequences

- `package.json` always shows `0.0.0`. This is intentional. Do not "fix" it.
- All CI scripts that previously read `pkg.version` must instead query git tags or receive the version as an environment variable.
- `release-from-branch` is the only workflow permitted to create version tags, and only from `releases/*` branches.
