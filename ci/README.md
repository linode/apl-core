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

| Variable                    | Default | Description                                                               |
| --------------------------- | ------- | ------------------------------------------------------------------------- |
| `CI_UPDATE_TYPE`            | `minor` | Allowed upgrade scope: `patch`, `minor`, `major`, `prerelease`, or `init` |
| `CI_HELM_CHART_NAME_FILTER` | `[]`    | JSON array of chart names to process; empty means all                     |
| `CI_GH_CREATE_PR`           | `true`  | Open a GitHub draft PR after pushing the branch                           |
| `CI_GIT_BASELINE_BRANCH`    | `main`  | Base branch to reset to between updates                                   |
| `CI_GIT_LOCAL_BRANCH_ONLY`  | `false` | When `true`, commits locally without pushing or opening PRs               |

---

## `render-chart-version-changes`

Compares `chart/chart-index/Chart.yaml` between two git tags and prints a Markdown table of dependency changes to stdout.

**Usage:**

```sh
npm run render-chart-version-changes -- <old-tag> <new-tag>
# or directly:
npx tsx src/render-chart-version-changes.ts <old-tag> <new-tag>
```

**Output columns:** App Name · Old Version · New Version · Notes (`New` / `Removed` / `Updated`)

Rows are grouped New → Removed → Updated, alphabetical within each group. Both tags are validated before any comparison is attempted.
