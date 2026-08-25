# Working in this repository

This is `qvest-digital/apl-core`, a fork of `linode/apl-core`. This file is fork-only and is not
intended for upstream.

Its purpose: let an agent reproduce the local lab from `SETUP.md` without rediscovering the traps
that cost a full session to find.

## What the documents in here are for

Four fork-only documents, none intended for upstream. They have different jobs, and reading the
wrong one for the task wastes a session.

| File | What it is | Read it when |
|---|---|---|
| `CLAUDE.md` | this file — operational rules and traps that apply to *any* work here | always, first |
| `SETUP.md` | an executable runbook: bring the lab up from nothing | you are asked to install, rebuild or verify the lab |
| `INTEGRATING-AN-APP.md` | a generic playbook: add any third-party app as a platform app | you are asked to integrate a new app |
| `VIKUNJA.md` | the worked example behind that playbook — a record of one real integration | you need the concrete detail a rule in the playbook is abbreviating |

The distinction that matters: **`SETUP.md` and `INTEGRATING-AN-APP.md` are instructions to follow.
`VIKUNJA.md` is evidence, not a plan** — its work is already done and on `feat/vikunja-integration`.
Do not execute it.

Also: `vikunja-patches/README.md` — read before touching any of the three sibling repositories
(`apl-api`, `apl-console`, `apl-tasks`). It explains why they ship as patches rather than forks, and
carries the build and load commands, including the one that needs no registry token.

## The task, if you were pointed at SETUP.md

Follow `SETUP.md` top to bottom. It is a runbook, not an essay — every command in it has been run.
The expected output is given after each step; compare against it rather than assuming success.

## The task, if you were pointed at INTEGRATING-AN-APP.md

You are being asked to integrate a new app, usually as "read this file and integrate
`<repo-url>` the same way Vikunja was". Read the whole file before writing anything: **the order of
the phases is the content**, and most of the cost in the integration it generalizes came from doing
those steps in a different order. It also tells you which phases your app does not need.

## The task, if you were pointed at VIKUNJA.md

`VIKUNJA.md` is a record, not a plan waiting to be executed — the code is on
`feat/vikunja-integration`. It is now the worked example behind `INTEGRATING-AN-APP.md`, so for a
*new* integration start there and come back here for the specifics. Read
`vikunja-patches/README.md` before touching the three sibling repositories.

## Rules that are not negotiable

**1. Nothing runs longer than 60 seconds unbounded.** Every command gets a bounded `timeout`,
or runs in the background. State the timeout before running it. Time estimates are wrong in both
directions, so this is never waived for confidence. The image build and the cluster create both
exceed 60s — background them.

**2. Never trust an exit code that passed through a pipe.** `docker build ... | tail` reports
*tail's* status. This produced a "successful" build that had in fact failed and produced no image.
After building anything, verify the artifact exists:

```bash
docker images <tag>          # not: echo $?
```

A pipe is not the only way to lose it. **Any** trailing command wins, including the one you added to
report the status:

```bash
docker build ... > build.log 2>&1; echo "EXIT=$?"   # reports echo's status -- always 0
```

That printed `EXIT=0` for a build that had failed, and a backgrounded run of it was reported as
"completed (exit code 0)". Redirect to a log, then check the artifact. If you want the status, put
the check *inside* the same command (`&&`) or use `set -o pipefail` and nothing after it.

**3. Capture raw output before filtering.** Piping to `grep`/`head` before you know the shape of the
output hides real errors and destroys `$?`.

**4. Verify, don't assert.** If you have not run it, say so. Do not report a step as done because it
should have worked.

**5. Derive environment-specific values, never copy them.** The MetalLB range comes from the live
docker network every time. It has been `172.18.x` and `172.19.x` on the same machine across
rebuilds. `cluster.domainSuffix` must agree with it.

## Traps that will cost you an hour each

**Build from a clean context, not the working directory.** `npm run test:ci` spellchecks every
root-level `*.md`. `docker build .` copies your whole working tree, so stray local notes fail the
build with an error that has nothing to do with the code — and `.git/info/exclude` does not apply to
Docker. Always:

```bash
CTX=$(mktemp -d)
git ls-files -z | tar --null -T - -c | tar -x -C "$CTX"
docker build ... "$CTX"
```

**This checkout excludes `values.yaml` locally.** `.git/info/exclude` carries a bare `values.yaml`
line, for the lab's own root `values.yaml` from `SETUP.md`. It matches at *every* depth, so a newly
vendored chart's `charts/<name>/values.yaml` is silently invisible to `git add -A` — and therefore
to the clean-context build, which is built from `git ls-files`. The symptom is a nil-pointer deep
inside the chart's templates at `helm lint`, and `git status` shows nothing wrong. After adding any
chart:

```bash
git add -f charts/<name>/values.yaml charts/<name>/charts/*/values.yaml
git ls-files charts/<name> | grep values.yaml     # must not be empty
```

**Generate the chart schema before installing.** `chart/apl/values.schema.json` is gitignored and
generated. Without it `helm install ./chart/apl` validates **nothing** — silently, with no warning.
Run `bin/gen-chart-schema.sh`. See `SETUP.md` for why.

**A half-installed platform is not salvageable.** `helm uninstall apl` removes the operator only;
every release the *operator* created survives. Delete the cluster instead.

**Never run `docker system prune -a`.** It will destroy unrelated containers, images and volumes
belonging to other projects on this machine. If you need disk, `docker builder prune` is safe.

**The host Node may be broken.** Nothing here requires it — all Node work happens inside containers.
If you find yourself needing host Node, you have gone off the documented path.

## Working with the human

**When the permission classifier blocks a command, stop immediately and ask.** Do not look for
another route to the same end, and do not substitute a bigger action that is not blocked. A block is
a signal that the human needs to see what you are about to do — so show them the exact command and
why you want to run it, and wait.

This has a cost record. A blocked two-line `kubectl patch` was worked around by deleting and
rebuilding the entire cluster to add one app. The rebuild took ~25 minutes, destroyed a working
9-hour lab, and then failed on the same unrelated bug the patch would have exposed in seconds.
Escalating instead of asking is always the more expensive branch.

Recommend, do not decide. Present options and a recommendation, then stop. Do not treat your own
suggestion as a decision already taken, and do not continue executing while a question you asked is
unanswered — particularly anything that narrows scope or changes tracked files.

## Repository conventions

- `main` is the fully merged state. Reference PRs against `reference/base` exist for reading only
  and must never be merged; they are drafts and titled `[reference]`.
- Commit messages are conventional commits, with a body explaining *why*, not just what.
- Root `*.md` files are spellchecked. New jargon goes in `.cspell.json`, inserted in alphabetical
  order — do not let a formatter rewrite that file, it will reflow unrelated arrays.
