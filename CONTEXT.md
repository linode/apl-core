# apl-core Domain Glossary

## Release Cycle

A `releases/v<major.minor>` branch (e.g., `releases/v1.4`) that covers all versions in a major.minor series: release candidates (`v1.4.0-rc.1`, `v1.4.0-rc.2`), the stable cut (`v1.4.0`), and any subsequent patches (`v1.4.1-rc.1`, `v1.4.1`). One branch is created per cycle; it is never recreated.

## Version Source of Truth

Git tags are the sole source of truth for version. `package.json` always holds `0.0.0` and is never updated by release workflows. The canonical version is computed from git tags at build time and injected into the image via a Dockerfile `ARG VERSION`.

## Cut Release Branch

The `workflow_dispatch` GitHub Actions workflow that starts a Release Cycle. Accepts a `bump_type` input (`minor` or `major`) and a `base_branch`. Derives the new branch name by finding the highest stable git tag repo-wide and applying the requested bump (e.g., highest stable `v5.1.0` + `minor` → `releases/v5.2`). Runs tests via Docker build, then creates and pushes the release branch. Makes no commits, creates no tags, and opens no PRs.

## Release from Branch

The `workflow_dispatch` GitHub Actions workflow that publishes a release from an existing Release Cycle branch. Only permitted on `releases/*` branches. Derives the release tag from the highest git tag on that branch: for an RC run, increments the RC number (or starts at `rc.1` if no tags exist on the branch yet, deriving the version from the branch name); for a stable run (`promote_to_stable=true`), strips the RC suffix from the highest RC tag. Never reads or writes `package.json`. Publishes the Docker image and Helm chart.

## Release Candidate (RC)

A pre-release version in `<major>.<minor>.<patch>-rc.<n>` format (e.g., `1.4.0-rc.1`). Produced by "Release from Branch" without `promote_to_stable`. Each RC run derives the next tag from the highest existing RC tag on the branch.

## Stable Release

A version without a prerelease suffix (e.g., `1.4.0`, `1.4.1`). Produced by "Release from Branch" with `promote_to_stable=true`. Derived by stripping the RC suffix from the highest RC tag on the branch.

## Dev Version

The semver version stamped into Docker images built from `main` or feature branches. Computed as: take the highest git tag repo-wide, extract its base version (strip any RC suffix), increment the patch, append `-dev.<short_sha>` (e.g., highest tag `v6.0.0-rc.8` → dev version `6.0.1-dev.abc1234`). Always strictly greater than the highest published tag. Never pushed as a git tag.
