# CI Scripts

Run any script from the `ci/` directory:

```sh
cd ci
npm run <script-name>
```

---

## `charts/dependencies.yaml`

`../charts/dependencies.yaml` lists the source repository and version for most of the APL Helm chart dependencies (a.k.a. core apps). Each entry follows this format:

```yaml
  - name: <chart name>
    version: <chart version>
    repository: <chart url>
```

Adding a new version of a core app is normally performed by `update-helm-chart-deps` (see below), but can also be done manually:

1. In `charts/dependencies.yaml`, change the version for the given dependency.
2. Download and unpack the chart archive for that version into the corresponding directory under `charts/`.
3. Commit your changes: `git commit -m 'feat: chart upgrade <app-name>'`.
4. Perform smoke tests: `npm run validate-templates`.
5. Carefully compare the rendered manifests (your feature branch vs main) by executing `bin/compare.sh`.

Note 1: some Helm charts do not have an official Helm chart repository. Those charts cannot be upgraded via `charts/dependencies.yaml`.
Note 2: some charts reside in a different directory name than the original app name, e.g. the `argo-cd` app resides in the `charts/argocd` directory.

---

## `test`

Runs all Jest unit tests under `src/`.

---

## `update-helm-chart-deps`

Scans every dependency in `charts/dependencies.yaml`, checks for newer Helm chart versions, downloads updates, runs per-chart post-processing (CRD extraction/copying), and optionally commits, pushes, and opens a GitHub PR per update.

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

Compares `charts/dependencies.yaml` between two git tags and prints a Markdown table of dependency changes to stdout.

**Usage:**

```sh
npm run render-chart-version-changes -- <old-tag> <new-tag>
# or directly:
npx tsx src/render-chart-version-changes.ts <old-tag> <new-tag>
```

**Output columns:** App Name · Old Version · New Version · Notes (`New` / `Removed` / `Updated`)

Rows are grouped New → Removed → Updated, alphabetical within each group. Both tags are validated before any comparison is attempted.
