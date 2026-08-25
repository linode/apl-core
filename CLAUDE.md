# Working in this repository

This is `qvest-digital/apl-core`, a fork of `linode/apl-core`. This file is fork-only and is not
intended for upstream.

Its purpose: let an agent reproduce the local lab from `SETUP.md` without rediscovering the traps
that cost a full session to find.

## What the documents in here are for

Five fork-only documents, none intended for upstream. They have different jobs, and reading the
wrong one for the task wastes a session.

| File | What it is | Read it when |
|---|---|---|
| `CLAUDE.md` | this file — operational rules and traps that apply to *any* work here | always, first |
| `SETUP.md` | an executable runbook: bring the lab up from nothing | you are asked to install, rebuild or verify the lab |
| `INTEGRATING-AN-APP.md` | a generic playbook: add any third-party app as a platform app | you are asked to integrate a new app |
| `VIKUNJA.md` | the worked example behind that playbook — a record of one real integration | you need the concrete detail a rule in the playbook is abbreviating |
| `TURNSTONE.md` | a second worked example — an app needing an upstream LLM API, and the certificate trap that came with it | your app is not a Go web app, or anything TLS fails in a way `openssl` says is fine |
| `UPSTREAM-SYNC.md` | an executable runbook: pull new commits from `linode/apl-core` into this fork | you are asked to merge in, sync with, or catch up on upstream |

The distinction that matters: **`SETUP.md` and `INTEGRATING-AN-APP.md` are instructions to follow.
`VIKUNJA.md` is evidence, not a plan** — its work is already done and on `feat/vikunja-integration`.
Do not execute it.

**The platform's auto-generated root CA cannot be validated by Python.** `createCustomCA` in
`src/cmd/bootstrap.ts` emits no subject key identifier, so cert-manager's leaves carry no authority
key identifier, and Python 3.13+ (`VERIFY_X509_STRICT`, enforced by OpenSSL 3.5) refuses them with
`Missing Authority Key Identifier`. Go apps are unaffected, and `openssl verify` calls the same chain
`OK` — so this hides from every CLI check. Any Python app talking to Keycloak needs a root CA with
`subjectKeyIdentifier=hash` supplied through `apps.cert-manager.customRootCA` +
`customRootCAKey`, **set before bootstrap, never retrofitted**. Full account in `TURNSTONE.md` §3.

Also: `vikunja-patches/README.md` and `turnstone-patches/README.md` — read before touching any sibling repository
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

## The task, if you were pointed at UPSTREAM-SYNC.md

You are being asked to pull in commits from upstream (`linode/apl-core`) that landed while this fork
kept doing its own work. Follow `UPSTREAM-SYNC.md` top to bottom: it names the exact fork point, the
files most likely to conflict and why the fork touched them, and why the merge must not be a rebase
(this fork's feature branches are built on `main` and rebasing it would orphan them). Do not try to
reconstruct that file list from `git log` yourself before reading it — it is already there.

## The task, if you were pointed at VIKUNJA.md or TURNSTONE.md

Both are records, not plans waiting to be executed — the code is on `feat/vikunja-integration` and
`feat/turnstone-integration`. They are the two worked examples behind `INTEGRATING-AN-APP.md`, so
for a *new* integration start there and come back to these for the specifics. Read the matching
`*-patches/README.md` before touching any sibling repository.

Which one to reach for:

- **`VIKUNJA.md`** — a Go web app with a team concept, needing an operator to push membership. The
  fuller example: four repositories, a team-sync operator, a distroless image.
- **`TURNSTONE.md`** — an app needing an *upstream API credential*, with no team concept, whose TLS
  stack is stricter than Go's. Read it if your app is not Go, if it needs an operator-supplied
  secret, or if anything TLS fails in a way `openssl` insists is fine.

## Rules that are not negotiable

**1. Nothing runs longer than 60 seconds unbounded.** Every command gets a bounded `timeout`,
or runs in the background. State the timeout before running it. Time estimates are wrong in both
directions, so this is never waived for confidence. The image build and the cluster create both
exceed 60s — background them.

**1b. Backgrounding is not watching.** Rule 1 keeps the foreground free; it does not tell anyone
what is happening. A backgrounded command yields exactly **one** notification, at the end — so for
the ten minutes an image build takes, healthy and hung look identical, to you and to the human.

**Pair every backgrounded step with a watcher that reports once a minute.** Always the same shape:
print one status line, check for failure, check for success, sleep.

```bash
while true; do
  echo "[<step>] $(<one-line status command>)"
  <failure check> && echo "[<step>] !! <what broke>"
  <success check> && { echo "[<step>] DONE"; break; }
  sleep 60
done
```

**The filter must cover failure, not just success.** A watcher that greps only for the good outcome
stays silent through a crash loop — and silence is indistinguishable from "still working". Before
arming one, ask what it would print if the thing died right now. If the answer is nothing, widen it.

⚠ **Do not grep builds for `Error`.** `apl-api` and `apl-console` both run test suites that log
handled errors *on the way to passing* — `errorMiddleware error Unauthorized` from the OpenAPI
validator, a jsdom XHR stack from the console's unit tests. A broad pattern reports a perfectly good
build as broken, once a minute, for the whole build. The three signatures that actually mean a
`docker build` died:

```
failed to solve | did not complete successfully | npm ERR! code
```

For a platform install, watch `kubectl get cm apl-installation-status -n apl-operator`, and treat
two things as failures beside the obvious pod states: **`attempt` climbing above 1**, the
unbounded-retry signature `operator.installRetries` exists to bound, and the operator pod entering
`CrashLoopBackOff` or `ImagePullBackOff`. A concrete watcher for that case is in `SETUP.md` step 8.

Build success markers into the backgrounded command itself, so the watcher has something
unambiguous to match — but keep rule 2 in mind while doing it:

```bash
docker build ... > build.log 2>&1
echo "=== MARKER: built"        # this echo is now what sets $? -- the marker says the stage was
                                # REACHED, never that it succeeded. Only the artifact says that.
```

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

**`team-admin` means two different things.** It is a Keycloak group and realm role carried by every
user with `isTeamAdmin` (`apl-tasks` `src/operators/keycloak/keycloak.ts`:
`if (decoded.isTeamAdmin === 'true') groups.push('team-admin')`). It is *also* how the platform's
special **admin team** renders, since teams become `team-<id>`. Any loop over `teamConfig` must
therefore write `omit .Values.teamConfig "admin"`, as `apl-keycloak-operator`, `kubernetes-gateways`
and `turnstone` all do. Miss it and you emit a `team-admin` entry that collides with the role
marker — which is exactly how a phantom Vikunja team appeared, containing every team admin in the
platform. Note the flag is **global**: there is no per-team admin group, so scoping it means
intersecting `team-admin` with the actual `team-<id>` membership.

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
