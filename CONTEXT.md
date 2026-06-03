# apl-core Domain Glossary

## Release Cycle

A `release/v<major.minor>` branch (e.g., `release/v1.4`) that covers all versions in a major.minor series: release candidates (`v1.4.0-rc.1`, `v1.4.0-rc.2`), the stable cut (`v1.4.0`), and any subsequent patches (`v1.4.1-rc.1`, `v1.4.1`). One branch is created per cycle; it is never recreated.

## Cut Release Branch

The `workflow_dispatch` GitHub Actions workflow that starts a Release Cycle. Accepts a `version` input (`1.4.0` or `1.4.0-rc.1`), runs tests via Docker build, bumps `package.json` to that version, creates `release/v<major.minor>`, and opens two PRs: one from `release/v<major.minor>` back to `base_branch` with the release checklist, and one bumping `base_branch` to the next minor development version (e.g., cutting `1.4.0-rc.1` also opens a PR bumping `main` to `1.5.0-rc.0`).

## Release from Branch

The `workflow_dispatch` GitHub Actions workflow that publishes a release from an existing Release Cycle branch. Reads the current version from `package.json`, tags and releases it, then auto-bumps `package.json` to the next iteration. Has a `promote_to_stable` input that strips the RC prerelease suffix and advances to the next patch RC after tagging. Also publishes the Docker image and Helm chart.

## Release Candidate (RC)

A pre-release version in `<major>.<minor>.<patch>-rc.<n>` format (e.g., `1.4.0-rc.1`). Produced by "Release from Branch" without `promote_to_stable`. Each RC run auto-increments `n` and commits the next RC version to the Release Cycle branch.

## Stable Release

A version without a prerelease suffix (e.g., `1.4.0`, `1.4.1`). Produced by "Release from Branch" with `promote_to_stable=true`. After tagging stable, the branch is auto-bumped to the next patch RC (e.g., `1.4.1-rc.1`).
