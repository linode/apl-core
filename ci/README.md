# CI Scripts

Run any script from the `ci/` directory:

```sh
cd ci
npm run <script-name>
```

---

## `test`

Runs all Jest unit tests under `src/`.

---

## `check-schema-versions`

Validates that schema versions are consistent across three files:

- `values-changes.yaml` — must have sequential, non-duplicate version numbers
- `helmfile.d/snippets/defaults.yaml` — `specVersion` must match the latest version in `values-changes.yaml`
- `tests/fixtures/env/settings/versions.yaml` — `spec.specVersion` must match

Exits non-zero on any mismatch.

---

## `update-helm-chart-deps`

Scans every dependency in `chart/chart-index/Chart.yaml`, checks for newer Helm chart versions, downloads updates, runs per-chart post-processing (CRD extraction/copying), and optionally commits, pushes, and opens a GitHub PR per update.

Charts that must move together (e.g. Istio components, KServe CRDs) are handled as a group in a single commit/PR.

| Variable | Default | Description |
|---|---|---|
| `CI_UPDATE_TYPE` | `minor` | Allowed upgrade scope: `patch`, `minor`, `major`, `prerelease`, or `init` |
| `CI_HELM_CHART_NAME_FILTER` | `[]` | JSON array of chart names to process; empty means all |
| `CI_GH_CREATE_PR` | `true` | Open a GitHub draft PR after pushing the branch |
| `CI_GIT_BASELINE_BRANCH` | `main` | Base branch to reset to between updates |
| `CI_GIT_LOCAL_BRANCH_ONLY` | `false` | When `true`, commits locally without pushing or opening PRs |

---

## `compare-charts`

Compares `chart/chart-index/Chart.yaml` between two git tags and prints a Markdown table of dependency changes to stdout.

**Usage:**

```sh
npm run compare-charts -- <old-tag> <new-tag>
# or directly:
npx tsx src/compare-charts.ts <old-tag> <new-tag>
```

**Output columns:** App Name · Old Version · New Version · Notes (`New` / `Removed` / `Updated`)

Rows are grouped New → Removed → Updated, alphabetical within each group. Both tags are validated before any comparison is attempted.

---

## Release scripts

These scripts are designed to be called from GitHub Actions CI workflows. All read configuration from environment variables; use a `.env` file locally.

### `release:configure-git`

Sets the global git identity used for release commits.

| Variable | Description |
|---|---|
| `BOT_EMAIL` | `user.email` value |
| `BOT_USERNAME` | `user.name` value |

---

### `release:derive-release-branch`

Finds the highest stable tag and derives the next release branch name (`releases/vMAJOR.MINOR`) based on the requested bump type. Writes `branch` to `GITHUB_OUTPUT` and `RELEASE_BRANCH` to `GITHUB_ENV`.

| Variable | Description |
|---|---|
| `BUMP_TYPE` | `minor` or `major` |

---

### `release:check-branch-not-exists`

Exits non-zero if `RELEASE_BRANCH` already exists on `origin`. Prevents a CI workflow from restarting itself in a loop.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name to check |

---

### `release:create-release-branch`

Creates a local git branch named `RELEASE_BRANCH`.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name to create |

---

### `release:check-versions-yaml`

Validates `versions.yaml` at the repo root before a release is tagged:

- All values must be valid semver.
- On a stable release (`IS_PRERELEASE != true`), no RC versions are allowed.
- All referenced container images must exist on Docker Hub (`docker manifest inspect`).
- All referenced GitHub tags must exist (`gh api`).

| Variable | Default | Description |
|---|---|---|
| `IS_PRERELEASE` | — | Set to `true` for RC releases |
| `REPO_ROOT` | `../../..` relative to script | Path to the repository root |

---

### `release:compute-tag`

Computes the next tag to create. When `IS_PRERELEASE=true`, increments the RC counter on `RELEASE_BRANCH`. When `IS_PRERELEASE` is absent or `false`, promotes the highest RC to a stable tag.

Writes `tag` and `is_prerelease` to `GITHUB_OUTPUT`.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name (e.g. `releases/v6.1`) |
| `IS_PRERELEASE` | `true` to cut an RC; omit or `false` to promote to stable |

---

### `release:compute-dev-version`

Computes a dev build version string of the form `X.Y.(Z+1)-dev.<sha>` from the highest tag in the repository. Writes `version` to `GITHUB_OUTPUT`.

No required environment variables.

---

### `release:check-tag-not-exists`

Exits non-zero if `RELEASE_TAG` already exists. Prevents duplicate releases.

| Variable | Description |
|---|---|
| `RELEASE_TAG` | Tag to check (e.g. `v6.1.0-rc.3`) |

---

### `release:tag-release`

Creates an annotated git tag for `RELEASE_TAG` and pushes it.

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Tag to create and push |
| `DRY_RUN` | `false` | Print the would-be command without executing |

---

### `release:create-github-release`

Creates a GitHub release using `gh release create --generate-notes`. Uses the previous tag as the notes start point so the generated changelog covers only the relevant range. Adds a pre-release warning banner for RC releases.

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Tag to release (must already exist) |
| `IS_PRERELEASE` | — | `true` to mark as pre-release |
| `DRY_RUN` | `false` | Print the would-be command without executing |

---

### `release:docker-push`

Tags a locally-cached Docker image and pushes it to Docker Hub under `<DOCKER_REPO>:<RELEASE_TAG>`. Also pushes `:<latest>` when the tag is the highest stable release across all tags in the repository.

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Image tag to push |
| `LOCAL_CACHE_IMAGE` | — | Local image reference to tag from |
| `DOCKER_REPO` | `linode/apl-core` | Docker Hub repository |
| `DRY_RUN` | `false` | Print commands without executing |
