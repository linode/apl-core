# Releasing

Releases are driven by two `workflow_dispatch` GitHub Actions workflows. Both default to `dry_run: true` — always test with a dry run before writing anything.

## Prerequisites

```sh
gh auth login   # requires write access to linode/apl-core
```

## 1. Cut a release branch

Creates `release/v<major.minor>`, bumps `package.json` to `<major.minor>.0-rc.1`, opens a release checklist PR, and opens a version-bump PR against `main`.

```sh
# Dry run (default) — validate inputs, no writes
gh workflow run cut-release-branch.yml \
  -f minor_version=v1.4 \
  -f base_branch=main \
  -f dry_run=true

# Live run
gh workflow run cut-release-branch.yml \
  -f minor_version=v1.4 \
  -f base_branch=main \
  -f dry_run=false
```

**Inputs**

| Input | Required | Default | Description |
|---|---|---|---|
| `minor_version` | yes | — | Major.minor version with `v` prefix, e.g. `v1.4` — patch and RC suffix are derived automatically |
| `base_branch` | yes | `main` | Branch to cut from |
| `dry_run` | yes | `true` | Skip all writes (git push, PRs) |

## 2. Release from branch

Runs the test gate, tags the commit, publishes a GitHub Release, pushes Docker image(s) to Docker Hub, and publishes the Helm chart.

```sh
# Dry run — validate, build, no writes
gh workflow run release-from-branch.yml \
  -f release_branch=release/v1.4 \
  -f promote_to_stable=false \
  -f dry_run=true

# Cut an RC release
gh workflow run release-from-branch.yml \
  -f release_branch=release/v1.4 \
  -f promote_to_stable=false \
  -f dry_run=false

# Promote the current RC to stable
gh workflow run release-from-branch.yml \
  -f release_branch=release/v1.4 \
  -f promote_to_stable=true \
  -f dry_run=false
```

**Inputs**

| Input | Required | Default | Description |
|---|---|---|---|
| `release_branch` | yes | — | Release cycle branch, e.g. `release/v1.4` |
| `promote_to_stable` | yes | `false` | Strip `-rc.N` suffix and cut a stable tag |
| `dry_run` | yes | `true` | Skip all writes (tag, GitHub release, Docker push, Helm publish) |

**What gets published**

| Artifact | RC release | Stable release |
|---|---|---|
| Git tag | `v1.4.0-rc.1` | `v1.4.0` |
| GitHub Release | pre-release | release |
| Docker image | `linode/apl-core:v1.4.0-rc.1` | `linode/apl-core:v1.4.0` + `:latest`* |
| Helm chart | published (version contains `-rc.1`) | published |

\* `:latest` is only pushed when the new stable tag is higher than all existing stable tags.

After a stable cut the workflow auto-bumps `package.json` on the release branch to `v1.4.1-rc.1` and commits it, ready for patch work.

## Typical release cycle

```
# 1. Start the cycle
gh workflow run cut-release-branch.yml -f minor_version=v1.4 -f dry_run=false

# 2. Cut successive RCs as needed
gh workflow run release-from-branch.yml -f release_branch=release/v1.4 -f dry_run=false
# (repeat — auto-bumps rc.1 → rc.2 → ... each time)

# 3. Promote to stable
gh workflow run release-from-branch.yml \
  -f release_branch=release/v1.4 \
  -f promote_to_stable=true \
  -f dry_run=false

# 4. Cut patch releases from the same branch
gh workflow run release-from-branch.yml -f release_branch=release/v1.4 -f dry_run=false
# (auto-bumps to v1.4.1-rc.1 → v1.4.1 → v1.4.2-rc.1 → ...)
```

## Monitoring a run

```sh
gh run list --workflow=cut-release-branch.yml --limit=5
gh run list --workflow=release-from-branch.yml --limit=5
gh run watch   # stream logs of the most recent run
```
