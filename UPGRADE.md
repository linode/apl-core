# Merging upstream into this fork

Runbook for pulling `linode/apl-core` into `qvest-digital/apl-core` while keeping the fork's changes
— and *dropping* them once upstream has done the same thing itself.

This file is fork-only and is not intended for upstream. Read [`CLAUDE.md`](CLAUDE.md) first: its
operational rules (bounded timeouts, verify-don't-assert, never trust an exit code through a pipe)
apply here unchanged.

**If you are an agent and the human said "do the update", this is the whole task.** Work top to
bottom. Stop at [Report back](#7-report-back) and let the human decide what to do with the result.
Do not push, do not open a PR, do not delete branches.

---

## What "keeping our changes" actually means

The fork carries **nine commits** on top of upstream. They fall into three groups, and each group
has a different merge policy:

| Group | Commits | Policy on conflict |
|---|---|---|
| **Behavioral fixes** — change what the platform does | `6e1860dbc`, `d2f85d230`, `bbed462e7`, `0b45d2a04`, `d23418379` | Keep ours **unless** the supersede test passes |
| **Capability additions** — make something settable that was hardcoded | `651782eaf`, `72e3c3b29` | Keep ours **unless** the supersede test passes |
| **Fork-only docs and tooling** — meaningless upstream | `a7d8395f2`, `03aa5d1d5`, and this file | Always keep ours. Upstream will never touch these paths |

"Unless upstream accepts our changes" needs care. **None of these have been submitted to
`linode/apl-core`.** PRs #3, #4 and #5 are merged *into this fork*; #6–#9 are drafts titled
`[reference]` that exist for reading. So upstream will not "accept" them in the literal sense —
what can happen is that upstream **independently implements equivalent behavior**, at which point
our version is redundant and must go, or the two will fight.

That is what the **supersede test** in the inventory below is for. It is a command run against the
upstream tree that answers one question: *does upstream already do this?*

---

## The inventory

Re-derive this rather than trusting it if the commit list has moved:

```bash
git log --oneline $(git merge-base upstream/main main)..main
```

### 1. Quote `defaultStorageClass` · `6e1860dbc`

- **Files:** `helmfile.d/snippets/defaults.gotmpl` (4 lines, all `{{ $defaultStorageClass | quote }}`)
- **Prevents:** with `provider: custom` and no storage class set, the value renders as `null` rather
  than `''`, and the platform rejects its own generated config.
- **Supersede test:**
  ```bash
  git show upstream/main:helmfile.d/snippets/defaults.gotmpl | grep -c 'defaultStorageClass | quote'
  ```
  `4` means upstream quotes all four sites — take theirs. `0` means keep ours. Anything in between
  means upstream quoted *some* sites: keep ours, and say so in the report.

### 2. Require `cluster.domainSuffix`, scoped to `provider: custom` · `d2f85d230` + `d23418379`

- **Files:** `values-schema.yaml`, in `definitions.cluster` — an `if/then` making `domainSuffix`
  required when `provider` is `custom`.
- **Prevents:** a template crash (`map has no entry for key "domainSuffix"`) inside the installer's
  retry loop instead of a clear validation error.
- **Read these two commits as one.** `d2f85d230` required it unconditionally; `d23418379` narrowed
  it to `provider: custom` because the LKE path may supply the value later in the flow. A merge that
  keeps the first without the second reintroduces a bug for LKE users.
- **Supersede test:**
  ```bash
  git show upstream/main:values-schema.yaml | grep -A6 'definitions:' | grep -q domainSuffix
  ```
  Inspect the surrounding block by hand — if upstream requires it *unconditionally*, that is a
  regression against `d23418379`, not a supersede. Keep ours and flag it.

### 3. Honour `INSTALL_RETRIES` · `bbed462e7` + `0b45d2a04`

- **Files:** `src/operator/installer.ts` (10 lines in `reconcileInstall`), `src/operator/installer.test.ts` (one case)
- **Prevents:** an unbounded retry loop. A failure that cannot self-heal looks identical to a slow
  install, and drives every release to a high revision number.
- **Highest conflict risk in the fork.** `installer.ts` is live upstream code; ours adds a
  `maxAttempts` guard inside the retry `catch`. Upstream refactoring around it will conflict.
- **Supersede test:**
  ```bash
  git show upstream/main:src/operator/installer.ts | grep -n 'INSTALL_RETRIES\|maxAttempts'
  ```
  If upstream bounds the loop *at all* — by any mechanism — take theirs and drop both commits,
  including our test. Do not keep two competing guards.
- **If upstream refactors but stays unbounded:** re-apply our guard by hand onto their new
  structure. Do not resolve by taking ours wholesale — that reverts their refactor.

### 4. Settable image repository and pull policy · `651782eaf`

- **Files:** `chart/apl/templates/deployment.yaml`, `chart/apl/templates/post-job.yaml`,
  `values/apl-operator/apl-operator.gotmpl`, `values/otomi-pipelines/otomi-pipelines.gotmpl`,
  `values-schema.yaml`
- **Adds:** `otomi.coreImageRepository`, `otomi.coreImagePullPolicy`, and a schema entry for the
  pre-existing `otomi.linodeLkeImageRepository`, which the schema did not previously describe.
- **Prevents:** a self-built image cannot be used at all. Without it the local lab is impossible.
- **Carries a second fix that is easy to lose:** the pull-policy regex is `^v?\d` in *all four*
  render sites. Upstream had `^v\d` in the chart templates and `^[0-9.]+` in
  `apl-operator.gotmpl`, so no tag could get `IfNotPresent` in both places. If a merge leaves those
  two regexes disagreeing again, the fix is gone even though the feature still looks present.
- **Supersede test:**
  ```bash
  git show upstream/main:values-schema.yaml | grep -c 'coreImageRepository'
  ```

### 5. Overridable toolchain base image · `72e3c3b29`

- **Files:** `Dockerfile` — `ARG TOOLS_IMAGE`, declared twice (once before the first `FROM`, once
  again in the `prod` stage, because a pre-`FROM` `ARG` goes out of scope per stage).
- **Prevents:** the build depending on a Linode-published artifact.
- **Low conflict risk**, but note that upstream bumping `apl-tools` changes the *default value*.
  Take upstream's new version as the `ARG` default; keep the `ARG` mechanism.
- **Supersede test:**
  ```bash
  git show upstream/main:Dockerfile | grep -c 'ARG TOOLS_IMAGE'
  ```

### 6. Fork-only docs and tooling · `a7d8395f2` + `03aa5d1d5`

- **Files:** `SETUP.md`, `CLAUDE.md`, `UPGRADE.md`, `bin/gen-chart-schema.sh`, `.cspell.json`,
  `.gitignore`, and the fork section of `README.md`
- **Always keep ours.** Only `README.md`, `.cspell.json` and `.gitignore` can conflict, because
  upstream owns those files too. Resolve all three by **union**: keep upstream's content and
  re-apply our additions on top. For `.cspell.json` that means merging the two `ignoreWords` arrays
  and keeping them in alphabetical order — see the rule in `CLAUDE.md`; do not let a formatter
  reflow the file. Our only `.gitignore` addition is `passwords.txt` (SETUP.md step 9); losing it
  means a lab credential dump becomes committable.

---

## The procedure

### 0. Preconditions

```bash
git -C . status --porcelain          # must be empty
git rev-parse --abbrev-ref HEAD      # must be main
```

A dirty tree makes a conflicted merge unreadable. Stop if either check fails.

Add the upstream remote if it is missing — a fresh clone of this fork will not have it:

```bash
git remote get-url upstream 2>/dev/null || \
  git remote add upstream https://github.com/linode/apl-core.git
```

**Never merge a `reference/*` branch.** They are drafts against `reference/base` and exist for
reading. Merging one duplicates commits already in `main`.

### 1. Fetch and survey — before merging anything

```bash
git fetch upstream --prune
BASE=$(git merge-base upstream/main main)
git log --oneline "$BASE"..upstream/main | wc -l          # how much is coming
git diff --stat "$BASE"..upstream/main -- \
  helmfile.d/snippets/defaults.gotmpl values-schema.yaml src/operator/installer.ts \
  Dockerfile chart/apl/templates values/apl-operator values/otomi-pipelines
```

That second command is the whole early-warning system: it lists upstream changes to **exactly the
files the fork touches**. An empty result means the merge will be clean and you can move fast. A
long result means read those diffs before merging, not during.

Run every supersede test from the inventory now, while the tree is still clean, and write the
answers down. Deciding "did upstream already do this?" with a half-resolved conflict in front of you
is how a fix gets dropped by accident.

### 2. Merge onto a branch, never onto `main` directly

```bash
git switch -c chore/merge-upstream-$(git rev-parse --short upstream/main) main
git merge upstream/main
```

**Merge, do not rebase.** The fork's commits are published and referenced by PRs #3–#9; rebasing
rewrites them and orphans those PRs.

If the merge is clean, go to step 4. If it conflicts, step 3.

### 3. Resolve

Work file by file, using the inventory's policy for that file. Rules that are not negotiable:

- **Never resolve a `.gotmpl` or `values-schema.yaml` conflict with `--ours` or `--theirs`
  wholesale.** Both sides are meaningful; the resolution is nearly always a hand-merge that keeps
  upstream's new content *and* the fork's change.
- **`git checkout --ours` on `SETUP.md`, `CLAUDE.md`, `UPGRADE.md`, `bin/gen-chart-schema.sh` is
  correct** — upstream has no version of these to lose.
- **A supersede means deleting our code, not commenting it out.** If upstream now bounds the retry
  loop, our guard *and* our test both go, and the report says so.
- **Do not invent a resolution that neither side wrote.** If the correct merge is unclear, stop and
  ask. A wrong resolution here surfaces four minutes into a platform install as an opaque template
  error.

After resolving, before committing:

```bash
git diff --stat "$BASE"..HEAD -- values-schema.yaml src/operator/installer.ts helmfile.d/snippets/defaults.gotmpl
```

Confirm each fork change is still present in the form the inventory describes. This catches the
silent case — the feature survived but a detail like the `^v?\d` regex did not.

### 4. Verify the build

An upstream merge changes `package.json`, `helmfile.d/` and `src/` together; nothing below is
optional, and **none of it may be skipped for time**.

Build from a clean context, in the background — it exceeds 60 seconds:

```bash
CTX=$(mktemp -d)
git ls-files -z | tar --null -T - -c | tar -x -C "$CTX"
docker build --build-arg VERSION=6.2.1-fork -t apl-core-merge:v6.2.1-fork "$CTX"
```

The build runs `npm run test:ci`, so a green build is also the unit suite passing — including our
`INSTALL_RETRIES` test, which is the regression guard for the highest-risk change.

**Verify the artifact, not the exit code:**

```bash
docker images apl-core-merge:v6.2.1-fork      # must print a row
```

Then the schema and a render:

```bash
bin/gen-chart-schema.sh apl-core-merge:v6.2.1-fork
helm template -f values.yaml apl ./chart/apl >/dev/null    # exit 0
```

Regenerating the schema is mandatory whenever `values-schema.yaml` moved, which an upstream merge
usually does. A stale `chart/apl/values.schema.json` validates the *old* shape.

Prove the schema still enforces the fork's rule, rather than assuming:

```bash
printf 'cluster:\n  name: apl-local\n  provider: custom\n' > /tmp/no-suffix.yaml
helm template -f /tmp/no-suffix.yaml apl ./chart/apl >/dev/null
# MUST fail with: at '/cluster': missing property 'domainSuffix'
```

If that command *succeeds*, change 2 has been lost in the merge. Stop.

### 5. Verify on a real cluster

A green build does not prove the platform installs. Run [`SETUP.md`](SETUP.md) end to end against a
fresh cluster, using the merged image:

```bash
kind delete cluster --name apl        # a half-installed platform is not salvageable
```

Then SETUP.md steps 2–8, substituting the merged image tag. The bar is the one recorded there:
**`status: completed`, `attempt: 1`, all pods Running, every release at revision 1, and the gateway
holding the pool's first address.**

A climbing `attempt` after a merge is the specific signature of change 3 having been lost.

### 6. Commit

Conventional commits, body explaining *why* — the merge commit body should record what was
superseded and what was kept:

```
chore: merge upstream <short-sha>

Upstream <n> commits, <date range>.

Superseded and dropped:
  - <change> -- upstream now does this at <file:line>

Kept, re-applied by hand:
  - <change> -- upstream refactored <file>, guard re-applied at <location>

Verified: image built, 535+ tests green, schema regenerated and still rejects a
missing domainSuffix, SETUP.md lab reached completed/attempt 1.
```

If any part of the verification was **not** run, say which, and do not describe the merge as
verified.

### 7. Report back

Stop here. Do not push and do not open a PR. Report:

1. How many upstream commits, and which touched fork-owned files.
2. Every supersede test and its answer.
3. Every conflict and how it was resolved.
4. Which verification steps ran, and their actual output.
5. Anything the merge made newly wrong in `SETUP.md` — an upstream change can invalidate the runbook
   without conflicting with it. Prerequisites, version numbers and the MetalLB derivation are the
   usual suspects.

Then let the human decide. Per `CLAUDE.md`: recommend, do not decide.

---

## When it goes wrong

**Abort a merge in progress:**

```bash
git merge --abort
```

**Abandon a finished but bad merge** — the branch is disposable, `main` was never touched:

```bash
git switch main && git branch -D chore/merge-upstream-<sha>
```

**A cluster left half-installed:** delete it. `helm uninstall apl` removes the operator only; every
release the operator created survives, and the result is not salvageable.

**Never run `docker system prune -a`** to reclaim space from failed builds — it destroys unrelated
projects on this machine. `docker builder prune` is safe.
