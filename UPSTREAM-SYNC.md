# Pulling in upstream while the fork has kept moving

This is a runbook, not an essay — every command in it has been chosen for a reason stated inline.
Read it when you are asked to bring in new commits from `linode/apl-core` (Akamai's upstream) while
this fork carries its own history on top.

Fork point: `05b2e9499` (`chore(chart-deps): update otel-operator to version 0.122.0 (#3587)`) is the
last commit this fork shares with upstream unmodified. Everything from `6e1860dbc` onward, 39
commits as of this writing, is fork-only: five small upstream-style fixes, then the Vikunja and
Turnstone integrations and their docs. None of that has been offered upstream — `reference/base`
marks the same point and exists only so draft `[reference]` PRs can be read against it; those PRs
are never merged, and neither is `reference/base` itself.

## 1. Fetch upstream — do not assume a remote exists

`origin` is `qvest-digital/apl-core`. There is no upstream remote configured. Add one and fetch it,
bounded:

```bash
git remote add upstream https://github.com/linode/apl-core.git 2>/dev/null || true
timeout 60 git fetch upstream main
```

Then see what actually changed:

```bash
git log --oneline 05b2e9499..upstream/main | wc -l      # how many commits behind
git diff --stat 05b2e9499..upstream/main                 # what upstream touched
```

## 2. Merge, don't rebase

`main` is pushed to `origin` and is the base of `feat/vikunja-integration`, `feat/turnstone-integration`,
and several other fork branches (see repository conventions in `CLAUDE.md`). Rebasing `main` onto
upstream would rewrite a shared, already-pushed branch and orphan every branch built on top of it.
Merge upstream into `main` instead, and let the merge commit carry the record:

```bash
git checkout main
git merge upstream/main   # resolve conflicts per §3, do not --no-commit and hand-assemble
```

## 3. Where the conflict actually is

Upstream's 05b2e9499..HEAD diff and this fork's 05b2e9499..main diff both touch the files below.
Everything else the fork added (new charts, new `values/vikunja/*`, `values/turnstone/*`, the
`*-patches/` directories, the docs) is a new path from this fork's side — those only conflict if
upstream happens to have added the same path, which is unlikely and worth a second look if it
happens rather than assuming either side wins.

The real hotspots, and which fork commit put fork-local content there (so you know what you're
protecting when you resolve):

| File | Fork commit(s) | What the fork changed here |
|---|---|---|
| `values-schema.yaml` | `d2f85d230`, `d23418379`, `651782eaf`, `0d7cdb107`, `071f013e8` | `cluster.domainSuffix` required (scoped to provider `custom`), image repo/pull-policy settable, Vikunja + Turnstone schema entries |
| `helmfile.d/snippets/defaults.gotmpl` | `6e1860dbc`, `1a6dc238e`, `071f013e8` | `defaultStorageClass` quoting fix, Vikunja DB storage class, Turnstone defaults |
| `helmfile.d/snippets/derived.gotmpl` | `1adee6dc4`, `1a6dc238e`, `071f013e8` | chart source repo/version settability, Vikunja version merge, Turnstone derived values |
| `helmfile.d/snippets/defaults.yaml` | `0d7cdb107`, `071f013e8` | Vikunja + Turnstone default blocks |
| `helmfile.d/helmfile-03.databases.yaml.gotmpl` | `0d7cdb107`, `071f013e8` | Vikunja + Turnstone database releases |
| `helmfile.d/helmfile-70.shared.yaml.gotmpl` | `0d7cdb107`, `071f013e8` | Vikunja + Turnstone shared-app releases |
| `core.yaml` | `0d7cdb107`, `071f013e8`, `0a0668dd9` | Vikunja + Turnstone app registration, SSO/role wiring |
| `apps.yaml` | `0d7cdb107`, `071f013e8` | Vikunja + Turnstone app list entries |
| `charts/dependencies.yaml` | `37a337430` | Vikunja chart vendored at 2.2.1 |
| `values/apl-operator/apl-operator.gotmpl` | `651782eaf` | image repo/pull-policy settable |
| `values/otomi-pipelines/otomi-pipelines.gotmpl` | `651782eaf` | image repo/pull-policy settable |
| `src/operator/installer.ts` (+ its `.test.ts`) | `bbed462e7` | honours `INSTALL_RETRIES` instead of retrying forever |
| `Dockerfile` | `72e3c3b29`, `1adee6dc4` | toolchain base image and chart source overridable |
| `chart/apl/templates/deployment.yaml`, `post-job.yaml` | `651782eaf` | image repo/pull-policy settable |
| `.cspell.json` | several docs commits | fork-only jargon (Vikunja, Turnstone, etc.) — trivial, always keep both sides' words |

Two of these are the ones actually likely to fight upstream line-for-line, because they are places
upstream also edits often:

- **`values-schema.yaml`** — upstream adds new provider/app schema entries in the same file. Resolve
  by keeping both sides' keys; do not let a conflict marker silently drop a schema entry, or
  `helm install` will validate nothing for that block with no warning (same failure mode as the
  gitignored-schema trap in `CLAUDE.md`).
- **`helmfile.d/snippets/derived.gotmpl` / `defaults.gotmpl`** — upstream template logic here churns
  across releases. Read both sides of the conflict as template logic, not text — a naive
  keep-both-hunks resolution here has produced duplicate `{{- if }}` blocks before.

## 4. After the merge resolves

Same two steps as any change here, because a merge is exactly as capable of silently invalidating
generated or excluded files as a hand-edit:

```bash
timeout 60 bin/gen-chart-schema.sh                 # values.schema.json is gitignored, regenerate it
git ls-files charts/vikunja charts/turnstone | grep values.yaml   # confirm .git/info/exclude didn't eat one
```

Then run the test suite from a clean context (root `*.md` spellcheck trap applies here same as any
build — see `CLAUDE.md` §"Traps that will cost you an hour each").

## 5. Record the new sync point

Once the merge lands on `main`, move `reference/base` to the new merge commit (or create a new
marker branch if `reference/base`'s existing draft PRs still need their old base) so the next sync
starts from `git log --oneline <new-base>..upstream/main` instead of re-deriving it from scratch.
State which commit you used as the new base in the merge commit message.
