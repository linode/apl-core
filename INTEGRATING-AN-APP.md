# Integrating a new app into App Platform

How to add a third-party app to this fork as a first-class platform app — its own host, Keycloak SSO,
a Console tile, a database if it needs one, and platform teams pushed into it.

This is the generalized form of two worked examples: `VIKUNJA.md` (a Go web app with teams, needing
an operator) and `TURNSTONE.md` (an app needing an upstream API credential, with no team concept and
a stricter TLS stack). Every rule here was paid for once, in one of those integrations or in
installing it. Where this file says "see the worked example", the detail is in one of those two.

**Status legend:** ✅ proven by running it · ⚠ known-shaky · ⛔ a bug that was found the expensive way
· ⬜ never executed

---

## How to use this file

You can hand a session this file and a repository URL:

> Read `INTEGRATING-AN-APP.md` and integrate `https://github.com/owner/app` the same way Vikunja was
> integrated.

Read `CLAUDE.md` first — it carries the operational rules (bounded timeouts, never trust an exit code
through a pipe, verify don't assert) and the build traps. Then read this file top to bottom before
writing anything: the *order* is the content. Most of the cost in the Vikunja integration came from
doing these steps in a different order, not from doing them wrong.

Throughout, `<app>` is the app's platform name — lowercase, no spaces. It is used verbatim as a
namespace, a release name, a values directory, a chart directory, a logo filename and an enum value,
so choose it once and never vary it.

### Decide the scope before you start

Not every app needs every phase. Answer these four first, because each one adds a phase:

| Question | If yes |
|---|---|
| Does it need to persist relational data? | Phase 2.3, a CNPG database |
| Should humans log in with their platform identity? | Phase 2.2 OIDC config, and Phase 3 |
| Should it appear in the Console? | Phase 3 — and Phase 1 is a hard prerequisite |
| Should platform teams exist inside it? | Phase 4 — **but check it has a team concept at all** |
| Does it need a credential you cannot generate? | one blank `x-secret`; see 2.4 |
| Is it written in something other than Go? | ⛔ read 2.8 before anything else |

Write the answers down. "Out of scope" is a legitimate and cheap answer — Vikunja explicitly excluded
projects and user deprovisioning, and Turnstone dropped the whole of Phase 4.

⛔ **Ask what the app's tenancy model actually is before planning Phase 4.** Turnstone has no team
object at all — only organizations and roles — so an operator would have had nothing to push into.
The question is not "how do I sync teams" but "does this app have teams". If it does not, the answer
is almost always claim-driven role mapping (4.1, model one), which needs nothing outside `values/`
and deletes the entire phase.

---

## The ground rule

**Every mechanism must already exist for another app. The content may be app-specific.**

The test is on the *mechanism*, not the code. A script modelled on one that serves a different tool
but written for your app is fine — expected, even. A script with no counterpart anywhere in the
platform is not: that is where your app becomes the odd one out and the next person has nothing to
reason from.

Before you write anything, find the file that already does the same job for another app. If you
cannot find one, that is a signal to change the design, not to invent a mechanism.

| What you need | Copy from |
| --- | --- |
| Vendoring an upstream chart | `charts/gitea/` + an entry in `charts/dependencies.yaml` |
| HTTPRoute + ServiceEntry | `values/harbor/harbor-raw.gotmpl` |
| CNPG database | `values/gitea/gitea-otomi-db.gotmpl` + `values/gitea-db-secret/` |
| Admin credential into the app | `values/harbor/harbor-raw.gotmpl` (ExternalSecret → env) |
| Running an app's own CLI in-cluster | `values/gitea/gitea-raw.gotmpl` (SA + Role + `kubectl exec`) |
| Custom-CA mount | `values/gitea/gitea.gotmpl` `extraContainerVolumeMounts` |
| Templating a whole config file as a secret | `values/loki/loki-raw.gotmpl` |
| A team-sync operator | `charts/apl-gitea-operator/` + `values/apl-gitea-operator/` |
| An operator that must converge on a timer | `src/operators/harbor/harbor.ts` in `apl-tasks` |
| Operator's config channel | `apl-<app>-operator-cm` ConfigMap carrying `teamConfig` JSON |
| App settings + generated secrets | `definitions.apps.gitea` in `values-schema.yaml` |
| Console tile | `core.yaml` `adminApps[]` + `apps.yaml` `appsInfo` |
| Console logo | `apl-console/public/logos/<app>_logo.svg` |

---

## Phase 0 — reconnaissance

Nothing in this phase writes code. It is the cheapest phase and it decides the other four.

### 0.1 Find every repo the change touches ✅

`apl-core` alone is never enough. Four repositories are in play:

| Repo | Why it is needed | Shipped here as |
| --- | --- | --- |
| `apl-api` | a hand-maintained `AppList` enum gates whether the app can exist at all | a patch in `vikunja-patches/` |
| `apl-core` | the app itself: chart, values, schema, database, routing, Console wiring | this repo |
| `apl-console` | the logo file | a patch/asset in `vikunja-patches/` |
| `apl-tasks` | the team-sync operator | a patch in `vikunja-patches/` |

The three foreign repos ship as **patches against upstream, not forks** — see
`vikunja-patches/README.md` for why and for the build commands. Create a sibling directory
(`<app>-patches/`) following the same layout.

**Grep for an app that already works, across all four repos.** `gitea` and `harbor` are the best
templates. Everywhere its name appears is an item on your work plan.

The generalization: **look for hand-maintained registries.** Any enum, any `switch`, any directory
where files are named after apps. They are invisible from `apl-core` and each one silently drops your
app. Known ones, all of which have bitten:

- `AppList` enum in `apl-api` — without it, no tile, no API entry, nothing
- `helmfile.d/snippets/defaults.gotmpl` — injects `databases.<app>.storageClass`; ⛔ omitting your
  app makes the install die rendering the database release
- `apl-console`'s logo directory — the path is built as `/logos/${appId}_logo.svg` with no lookup
  table, so the filename must match `<app>` exactly
- `charts/dependencies.yaml`

### 0.2 Check you can build each repo, before writing code for it ✅

This is a hard blocker that is otherwise found late. Two of the three foreign repos build with a
plain `docker build .`; `apl-tasks` needs a GitHub Packages token, which stopped the worked example
for a whole session. It should not have:

**A private dependency registry blocks resolution, not consumption.** The project's own published
image has already resolved those dependencies, so a build stage that copies `node_modules` out of it
needs no credential at all. See `vikunja-patches/apl-tasks-vikunja.Dockerfile`. **Look for the
resolved artifact before you go looking for the token.**

### 0.3 Run the app's container before you write a line of Helm ✅

This is the single highest-value hour in the whole integration. `docker run` it with a throwaway
database and the config you intend to ship. In the worked example that produced five findings in
about twenty minutes, each of which would otherwise have cost a full deploy-debug cycle:

- no shell in the image (distroless), which invalidated the entire bootstrap-job design
- a directory that must be writable or the process exits immediately
- the exact env-var spelling that reaches a *nested* config key
- OIDC discovery is startup-only, non-fatal, and silent
- discovery fails against the platform CA unless you mount it

Then point it at something real from the running lab — the lab's Keycloak is reachable from the
`kind` docker network — and **check the app's own status endpoint, not just that the process is
alive.** A status endpoint reporting an empty identity-provider list is the difference between "it
started" and "it works".

Record, in a table, at minimum: image name, port, health/status endpoint, config file path and
format, which directories need to be writable, the security context it wants, and **whether it has a
shell**.

### 0.4 Find the upstream chart ✅

Never write a chart for a third-party app. Every third-party app here vendors its upstream chart and
overrides it through values; the only first-party charts are ones with no upstream at all
(`charts/git-server`, `charts/otomi-console`).

Finding the repository can be the hard part — in the worked example the docs URL 404'd, every
`github.io` guess 404'd, and the answer was an OCI registry, found through Artifact Hub:

```bash
curl -s "https://artifacthub.io/api/v1/packages/search?ts_query_web=<app>&kind=0" | jq '.packages[]'
```

`charts/dependencies.yaml` already has OCI entries (`kserve`, `loki`), so either transport follows an
existing convention.

**If the app publishes no chart anywhere, vendor the one in its own git repository.** That is still
"vendor the upstream chart" — it is not hand-writing one. It gets **no** `dependencies.yaml` entry,
because `ci/src/update-helm-chart-deps.mjs` has nothing to resolve. Precedent:
`charts/tekton-dashboard`, `charts/cert-manager-webhook-linode`, `charts/kubeflow-pipelines`.

⚠ **A source-only chart may legitimately need patching, and patching it is safe.** Editing a
vendored chart is normally lossy here — `charts/gitea`'s statefulset edits were silently overwritten
by later version bumps. But the updater only touches charts listed in `dependencies.yaml`, so a chart
that is not listed cannot be clobbered. Say so in the chart's own header, and list every local
change, or the next person will assume it is pristine.

⛔ **Check the chart for the hooks you need before you plan around it.** An upstream chart written
for one deployment style may expose nothing you require: Turnstone's had no `extraEnv`, no `volumes`,
no `initContainers`, no `securityContext`, and a hardcoded container `command` — so no config file
could be mounted and no CLI flag passed. Missing hooks are worse than an awkward `merge`, because
there is no override to reason about at all. Grep for `extraEnv`, `volumes`, `envFrom`,
`securityContext` and `command` in `templates/` during Phase 0, not after writing your values.

⚠ Its `appVersion` may also be stale — Turnstone's said `0.3.0` against an app at `1.8.1`, and the
image helper falls back to `appVersion`, so the chart's default tag pointed at an image that may not
exist. Always pin `image.tag` explicitly.

⛔ **Rendering the chart before installing it catches object-name collisions.** A `-raw` release and
the chart itself can both claim one name — the chart's own fullname helper produced
`<app>-config`, exactly what the config ConfigMap had been called. Two releases owning one object is
a fight, not a merge. `helm template` with the values your gotmpl produces costs seconds and finds
this before Argo CD does.

**Then read `templates/`, specifically for what the chart refuses to let you override.** Two patterns
matter and both are cheaper to find by reading than by `helm lint`:

- a `merge` with the chart's hard-coded block as the *destination* — the chart wins, and your probes,
  security context or config mount silently do not apply
- a value the chart reads **unguarded** — you must set it even if you do not care, or templating
  fails on a nil comparison

---

## Phase 1 — let the app exist (`apl-api`)

✅ **Nothing in any other phase is visible until this lands.** The Console builds its tile list from
`GET /v1/apps`, which is derived from an enum baked into the API image:

```js
// apl-api, dist/src/app.js
const getAppList = () => getSpec().spec.components.schemas['AppList'].enum
```

Add `<app>` to `AppList.enum` in `src/openapi/app.yaml`. The image also bakes in a copy of
`apl-core/values-schema.yaml`, so `npm run schema:sync` must run **after** Phase 2's schema change or
the app's settings form comes out empty.

No publishing is needed: tag the image with the `docker.io/linode/…` name the chart already expects,
`kind load` it, and pin it from your `values.yaml`:

```yaml
versions:
  api: 0.0.0-<app>
```

⚠ **A version starting with a digit is treated as a semver** — the tag gets a `v` prefix and
`pullPolicy: IfNotPresent`, which is exactly what a `kind`-loaded image needs. A bare word like
`<app>` is treated as a branch and pulled `Always`, which will fail.

⛔ **`versions` overrides merged the wrong way for four commits, and failed silently.** sprig's
`merge dest src` lets the *destination* win, and a Go template pipeline puts the piped value last, so
`X | merge Y` calls `merge(Y, X)` and `Y` wins. Every pin in values was accepted, validated, and then
dropped — with nothing in any log.

The lesson generalizes past sprig: **an override that is silently ignored is worse than one that
errors.** When you add any values override, assert that setting it actually changes the rendered
output. Do not reason about the merge; render it both ways and diff.

---

## Phase 2 — deploy the app (`apl-core`)

Mirror Harbor unless you have a reason not to: a shared app, its own host, its own database, no
bootstrap-time dependency. (Gitea is the exception — it sits in `helmfile-03.init` because bootstrap
depends on it.)

### 2.1 Vendor the chart

```bash
helm pull <chart-ref> --version <x.y.z> --untar   # into charts/<app>/
```

⛔ **Then force-add its `values.yaml`.** This checkout has a bare `values.yaml` line in
`.git/info/exclude` (for the lab's own root `values.yaml`), and it matches at *every* depth. A newly
vendored chart's `values.yaml` is therefore invisible to `git add -A` — and so to the clean-context
build, which is built from `git ls-files`. The symptom is a nil-pointer deep inside the chart's
templates, and `git status` shows nothing wrong:

```bash
git add -f charts/<app>/values.yaml charts/<app>/charts/*/values.yaml
git ls-files charts/<app> | grep values.yaml     # must not be empty
```

### 2.2 Values — `values/<app>/<app>.gotmpl`

House pattern: **config in values, secrets in `secretKeyRef` env.**

Whether that works depends on whether the app's config loader can express *every* secret as an
environment variable — **nested map keys are where this breaks.** Read the loader's source. Many apps
split an env var on `_` into a nested path, which is what makes the plain pattern work for a nested
provider map. If the loader cannot express one, the fallback with a precedent here is an
ExternalSecret that templates the whole config file, mounted as a secret volume
(`values/loki/loki-raw.gotmpl`).

**Use the pre-derived OIDC endpoints; never assemble URLs.** `helmfile.d/snippets/derived.gotmpl`
exposes fully-formed `_derived.oidcBaseUrl`, `oidcAuthUrl`, `oidcTokenUrl`, `oidcJwksUrl`,
`oidcLogoutUrl`, plus `oidcClientSecretKey` / `oidcClientSecretProperty`.

⛔ **An in-cluster URL with no port resolves to :80 and hangs to a timeout, not a refusal.** A closed
port gives `ECONNREFUSED` immediately; a port nothing listens on gives silence until the client's
timeout, reported as something uninformative like `fetch failed`. When anything hangs and then
reports nothing useful, check the port first:

```bash
kubectl get svc <svc> -n <ns> -o jsonpath='{.spec.ports}'
```

### 2.3 Database (if needed)

Four things, not three. Copy Gitea:

1. `values/<app>/<app>-otomi-db.gotmpl`
2. `values/<app>-db-secret/<app>-db-secret-raw.gotmpl`
3. `databases.<app>` in `values-schema.yaml` and `defaults.yaml`, plus
   `platformBackups.database.<app>`
4. ⛔ **`<app>` in the list in `helmfile.d/snippets/defaults.gotmpl`** — that file injects
   `databases.<app>.storageClass` from `cluster.defaultStorageClass`. The db template reads
   `$vdb.storageClass` unguarded, so omitting this fails the install:

```
failed processing release <app>-otomi-db: ... executing "stringTemplate" at
<$vdb.storageClass>: map has no entry for key "storageClass"
```

Two `kind` storage properties, so they are not mistaken for faults: `volumeBindingMode:
WaitForFirstConsumer` means PVCs stay `Pending` until a pod is scheduled, and `rancher.io/local-path`
is **ReadWriteOnce only** — any chart defaulting to `ReadWriteMany` gets a permanently `Pending` PVC.

### 2.4 Schema, defaults and generated secrets

`definitions.apps.properties.<app>` in `values-schema.yaml`, following `apps.gitea`. `x-secret` is
what makes the platform generate a value and seal it into `apl-secrets`; the app reads it back
through an ExternalSecret against `core-secrets-store`.

**A credential you cannot generate needs no new mechanism — it needs a blank `x-secret`.** The
*value* of `x-secret` chooses the source (`src/common/values.ts`):

| `x-secret:` | Source |
|---|---|
| `'{{ randAlphaNum 20 }}'` | platform-generated |
| `''` (blank) | **operator-supplied** — blank ones are stripped from the generation template, so the only remaining source is the human's input values |

Both take the identical path afterwards: SealedSecret in `apl-secrets/<app>-secrets` → the
`core-secrets-store` ClusterSecretStore → an ExternalSecret in your namespace, with
`stripAllSecrets` removing it from the values repo. Precedent is everywhere —
`dns.provider.linode.apiToken`, `obj.provider.linode.secretAccessKey`, `alerts.slack.url`. Turnstone's
`anthropicApiKey` is one schema entry and nothing else.

⚠ **Say what happens when it is absent, in the schema description and in `SETUP.md`.** A blank
operator-supplied secret does not fail the install: the ExternalSecret simply never syncs, and the
pod sits in `CreateContainerConfigError`, which reads like a platform fault rather than "you forgot
to paste a key". Document the symptom next to the field, and give people the option of disabling the
app instead.

⛔ **Prefer a config file over a bootstrap API call, if the app reads one.** The obvious way to seed
app-side configuration is a Job that logs in and POSTs it. That path is long: mint a token with the
right scopes, satisfy a permission check, and — the step that is easy to miss — trigger whatever
fan-out reload makes *other* processes see the change. Turnstone's create call refreshes only the
calling process's registry, so without the reload the console listed a model the server could not
use.

Check first whether the setting can come from a file the app already reads, mounted as a ConfigMap.
If it can, that replaces the whole Job, and it is declarative and re-renders through GitOps like
everything else. Two things make it work well:

- **`${VAR}` expansion.** If the app expands environment variables inside its config file, the
  ConfigMap can hold a placeholder while the real secret stays in a Secret and reaches the pod as
  env. Check for this explicitly — it is the difference between a ConfigMap and a second
  ExternalSecret.
- ⚠ **Read the loader, not the example file.** Turnstone's own shipped example used the wrong key
  name for its model entries; the loader skips such an entry with a single `log.warning` and starts
  with an empty registry. Confirm your file loads by *reading back what the app parsed*, not by
  checking the pod is Running.

Network policies are optional — only `git-server`, `gitea` and `otomi-api` have them.

⚠ **Apps default to `enabled: false`**, which means clicking Activate in the Console after every
rebuild. Enable your app in the lab's own `values.yaml` (`SETUP.md` step 7), **not** by editing
`helmfile.d/snippets/defaults.yaml` — the effect is identical and it keeps this fork's deviation out
of a tracked upstream file.

### 2.5 The admin credential

Every integrated app solves this the same way: **the local admin account stays enabled for machines,
SSO is for humans, and the password is a platform-generated `x-secret`.** Argo CD states the
principle most clearly by keeping `admin.enabled: "true"` alongside SSO. So do not disable local auth
because SSO exists.

If the app has no first-run bootstrap and no chart hook for an existing secret, the precedent is
Gitea's exec workload: ServiceAccount + Role with `pods/exec` + RoleBinding + a workload running
`registry.k8s.io/kubectl`, as a `Job`.

⛔ **Both that image and many app images are distroless**, so `kubectl exec … -- /bin/sh -ec '…'`
fails with *executable file not found* and there is nowhere to run a guard. Use the kubelet's own
`$(VAR)` expansion over `env` to interpolate credentials, and exec the app's binary directly.

⛔ **Gate the Job on readiness.** A Job that `kubectl exec`s into a Deployment races it, and if the
app waits on Keycloak every attempt dies with `unable to upgrade connection: container not found`,
burning retries on a *predictable* wait. Add a `wait-for-<app>` init container running
`kubectl wait --for=condition=Available` — and grant the Role `list` and `watch` as well as `get`,
which `kubectl wait` needs.

Check whether re-running the create command is safe. Many CLIs log "already exists" and **still exit
0**, which makes the Job idempotent without a guard — but verify it rather than assuming.

### 2.6 Releases

Names must match exactly: the helmfile anchors derive chart and values paths from the release name.

```
helmfile-70.shared.yaml.gotmpl     <app>-artifacts, <app>,
                                   apl-<app>-operator-artifacts, apl-<app>-operator
helmfile-03.databases.yaml.gotmpl  <app>-db-secret-artifacts, <app>-otomi-db
```

Platform objects (HTTPRoute, ServiceEntry, the custom-CA secret) can go through the chart's
extra-objects hook or through the app's own `-raw` release. Both have precedent, so **prefer
whichever lints** — some charts' extra-object hooks emit malformed YAML and fail `helm lint`, which
the `-raw` release sidesteps at no cost.

### 2.7 Fixtures — or the suite proves nothing

`tests/fixtures/env/apps/<app>.yaml` with `enabled: true` is what makes `npm run test:ci` lint and
render your releases. Without it the suite passes on a branch where nothing works. Enable every
optional sub-feature in the fixture too, so its chart is exercised even when it ships off by default.

⛔ **A fixture that supplies a value production derives does not test the code; it replaces it.** In
the worked example the database fixture set `storageClass` explicitly, copying two existing fixtures
that do the same — which satisfied the template and left the injection in 2.3 completely untested.
The suite went green on a branch where the install could not render. Omit, in the fixture, anything
production derives.

### 2.8 Prefer a loud failure to a quiet one

Ask what the app does when a dependency is missing. If the answer is "logs a line and carries on",
find the switch that changes it.

Two settings in the worked example exist only to convert silence into a crash, and both were found by
checking a status endpoint rather than pod health:

- **OIDC discovery is startup-only and non-fatal by default.** The app retries a few times and then
  serves happily with an empty provider list — a Running, Ready pod with no SSO and nothing in the
  probe to notice. The app's `requireavailability`-style setting turns that into a fatal error, so
  the pod restarts until Keycloak answers. Several restarts on a cold install are this working, not
  failing.
- **Discovery fails on the platform's own certificate.** With `cert-manager.issuer: custom-ca`
  (the default), the public Keycloak host is signed by the platform CA and the app reports
  `x509: certificate signed by unknown authority`. Mount the CA, as `values/gitea/gitea.gotmpl` does.

⚠ **The `custom-ca` secret is per-namespace and each app creates its own** from `_derived.caCert`.
Nothing copies it around. Mounting a secret that does not exist keeps the pod in
`ContainerCreating` forever, with nothing in the app's own logs to explain it.

⛔ **The CA mount pattern in this repo is Go-shaped. Do not assume it generalizes.** Gitea and
Vikunja both mount the platform CA *over* `/etc/ssl/certs/ca-certificates.crt` with a `subPath`.
That replaces the image's whole trust store with one certificate — invisible for them, because
neither calls a public endpoint. **If your app also talks to the public internet** (an upstream API,
a model provider, a webhook), that mount breaks it. Turnstone needed `api.anthropic.com`, and the
Gitea pattern failed it with `unable to get local issuer certificate`.

For those apps, concatenate rather than replace: an initContainer running the app's own image, as
the app's own uid, joining the image bundle and the platform CA into an `emptyDir`. Then point
whatever variable the runtime honours at the result.

⛔ **Find out how your runtime is told about a CA, and whether the variable replaces or augments.**
This is per-language and the answers differ:

| Runtime | Variable | Semantics |
|---|---|---|
| Python / `httpx` / `requests` | `SSL_CERT_FILE`, `SSL_CERT_DIR` | **replaces** |
| Node | `NODE_EXTRA_CA_CERTS` | **augments** — used by `apl-keycloak-operator`, `otomi-api` |
| Go | the system store, or the app's own setting | replaces, when mounted over the bundle |

`REQUESTS_CA_BUNDLE` is `requests`-only; it does nothing for an app using `httpx`.

⛔ **The platform's auto-generated root CA cannot be validated by Python at all**, and this is the
single most expensive thing in either worked example. `createCustomCA` in `src/cmd/bootstrap.ts`
emits no `subjectKeyIdentifier`, so Go's `x509.CreateCertificate` gives cert-manager's leaves no
`authorityKeyIdentifier`, and Python 3.13+ (`VERIFY_X509_STRICT`, enforced by OpenSSL 3.5) rejects
the chain with `Missing Authority Key Identifier`. The fix is a root CA supplied through
`apps.cert-manager.customRootCA` + `customRootCAKey`, **before bootstrap**. Full account in
`TURNSTONE.md` §3, and the steps are in `SETUP.md` 6b.

⚠ **Two things make that class of bug expensive.** It presents as a healthy, Ready pod with no
sign-in button — nothing in the probe notices. And `openssl verify` reports the identical chain as
`OK`, because the CLI does not apply the strict flag. **When an app disagrees with `openssl` about a
certificate, believe the app.** Reproduce it in the app's own runtime — `kubectl exec … -- python -c
"import httpx; …"` — not with `openssl s_client`.

---

## Phase 3 — Console presence

### 3.1 `apl-core`

`core.yaml` gains the `<app>` (and `apl-<app>-operator`) namespaces and one `adminApps` entry:

```yaml
  - name: <app>
    tags: [<tags>]
    isShared: true
    ownHost: true
```

✅ That one entry does three jobs: `ownHost: true` registers `https://<app>.<domain>/*` as an OIDC
redirect URI (the Keycloak operator builds that list from `adminApps`, so no `apl-tasks` change is
needed), it puts the app on `/apps/admin`, and `isShared` both puts it in every team's list and
suppresses the per-team hostname suffix so every team links to the one instance.

`apps.yaml` gains an `appsInfo.<app>` block, copied in shape from `appsInfo.gitea`.

### 3.2 `apl-console`

`public/logos/<app>_logo.svg`. The path is built as `/logos/${appId}_logo.svg` with no lookup table,
so the filename must match `<app>` exactly. Use the project's own logo and record its license.

Do **not** mount the logo in from `apl-core`. It works — the directory is writable and nginx serves
whatever is dropped in — but all existing logos live in `apl-console`, and you are patching that
repo's siblings anyway.

---

## Phase 4 — team sync (`apl-tasks`)

Only if platform teams should exist inside the app. Every team sync in this platform is an operator
in `apl-tasks` that reads a ConfigMap generated by `apl-core` and pushes to the app's REST API:

```
Console → apl-api writes the values repo → Argo CD / apl-operator re-render
        → ConfigMap apl-<app>-operator-cm changes → operator reconciles → app's API
```

⚠ **`teamSync` should default to `false`.** The *published* `linode/apl-tasks` image has no
`operator:<app>` script, so pointing the release at it produces a crash-looping pod. It is only safe
to switch on once the patched image is built.

### 4.1 Choose a membership model — this is the important decision ⛔

There are three, and they are not equivalent. Two of them need no timer; one does.

| Model | Example | What makes membership converge |
|---|---|---|
| Delegate to the app's own OIDC group mapping | `operators/gitea/` — `--group-claim-name groups --group-team-map` | the user's login, handled inside the app |
| Bind a *group* to the app's object | `operators/harbor/` — `memberGroup` on a project | nothing needed; the app resolves it per request |
| Push individual users | the Vikunja operator — `PUT /teams/{id}/members` | **an unconditional timer, and nothing else** |

Prefer the first two. Reach for per-user push only when the app forces it — for Vikunja it did,
because teams the app creates from an OIDC claim are not editable through its API (so claim-driven
sync and operator-managed teams are mutually exclusive), and its teams take users, not groups.

✅ **Turnstone is the worked example of model one, and it needed no `apl-tasks` change at all.** Its
role mapping reads one flat claim and maps values to role IDs, re-evaluating on every login and
revoking what is no longer claimed. Two things to check before choosing it:

- ⛔ **Is the claim lookup flat or dotted?** Turnstone does a plain top-level `claims.get(name)` with
  no path traversal — so this platform's `groups` claim fits exactly, while the `realm_access.roles`
  form the app's *own* documentation recommends cannot work. Read the mapping code, not the docs.
- ⚠ **The claim must be in the ID token**, not only the access token. If everyone lands on the
  default role, that is the first thing to check: the rows will show as `oidc-default` rather than
  `oidc`.

Remember the `groups` claim carries realm roles, not Keycloak groups, and includes built-ins as
noise — anything consuming it must tolerate unmapped values.

⛔ **If you push individual users, a watch-only operator is a correctness bug.** Membership then
depends on two events Kubernetes emits nothing for:

- the user joining the Keycloak group
- the user's **first login to the app** — you usually cannot add a member who has never signed in,
  because the account does not exist yet

Watching your own Secret and ConfigMap therefore reconciles at all the wrong moments. Observed live:
a team created and synced immediately, the user created, grouped and logged in nine minutes later,
and membership still absent an hour after that — pod `1/1 Running`, no errors, `Success!` as its last
log line.

Follow `operators/harbor/harbor.ts`: a `<APP>_RECONCILE_INTERVAL` (default 60s) driving the reconcile
on a `setInterval`, plus a `reconciling` flag so a slow round trip cannot overlap two runs. Keep the
watches for responsiveness, but they are not what makes it correct — Harbor has none at all and
re-reads its config by polling.

**The generalization: a push-based integration is only as convergent as its slowest unconditional
retrigger.** If the state you push depends on anything outside Kubernetes, event-driven alone is a
bug — and it presents as a healthy pod with a success message.

### 4.2 What the operator must tolerate

- A user who has not signed in yet. Treat the resulting 4xx as normal, log it, and retry next cycle.
- Its own service account must never be removed from a team it created, or it locks itself out.
- Deprovisioning may be unavailable if the app's user-admin API is license-gated. Removing someone
  from their Keycloak group removing them from the app's team is the control that matters.

---

## Phase 5 — build, install, verify

### 5.1 Build and install

Follow `SETUP.md`. Two things about it are load-bearing for a *new* app:

1. ⛔ **Push the branch before building the image.** Argo CD fetches `charts/*` from `APPS_REPO_URL`
   at `APPS_REVISION` over the network — a new chart directory does not exist for it until it is on a
   pushed commit. And a mismatch does not error: your templates set keys the older chart does not
   have, they are dropped silently, and the Application still reports Synced and Healthy.
2. **Generate the chart schema** (`bin/gen-chart-schema.sh`). It is gitignored and generated; without
   it Helm validates *nothing*, silently.

⚠ **Do not try to enable a new app on a cluster that is already installed.** Argo CD's own
`apl-operator` Application fights `helm upgrade` for the operator Deployment and wins, the two charts
render deliberately different specs, and repeated attempts grow the values secret until the cluster
is unrecoverable. Recreate the cluster; it is faster. `SETUP.md` has the full mechanism.

⚠ **Argo CD self-heals**, so live patches to platform manifests are reverted within seconds —
including patches to the `Application` itself, and including the ExternalSecret behind a generated
secret. There is no quick way to try a `values/` change on a running cluster. **Prove the diagnosis
in place** (`kubectl exec` in and reproduce the call by hand), then rebuild to prove the fix.

### 5.2 The verification ladder

Work outward. Each rung has a cheap check that fails loudly, and a rung passing does **not** imply
the one below it.

```bash
# Derive the domain from YOUR app's route -- never from an unrelated app's, which may be disabled.
D=$(kubectl get httproute <app> -n <app> -o jsonpath='{.spec.hostnames[0]}' | sed 's/^<app>\.//')
[ -n "$D" ] || echo "D is empty -- nothing below will work" >&2
```

1. **Install completed.** `kubectl get cm apl-installation-status -n apl-operator -o jsonpath='{.data}'`
   reads `completed`, and `attempt` stays at `1`.
2. **The GitOps layer ran.** Pods Running and releases at revision 1 prove only the operator's own
   helmfile pass; everything Argo CD owns is a separate layer that fails silently. This must be empty:
   ```bash
   kubectl get applications -n argocd \
     -o custom-columns='N:.metadata.name,S:.status.sync.status,H:.status.health.status' \
     --no-headers | awk '$2!="Synced" || $3!="Healthy"'
   ```
3. **The app runs.** Pods up in `<app>`; the database `Cluster in healthy state`; all ExternalSecrets
   `SecretSynced`; and the app's status endpoint returns 200 **and reports its identity provider** —
   an empty provider list means discovery failed on a pod that looks perfectly healthy.
4. **The tile exists.** The one command that matters; empty output means Phase 1 did not land, and no
   amount of `core.yaml` will help:
   ```bash
   curl -sk -H "Authorization: Bearer $ID_TOKEN" "https://api.$D/v1/apps" | jq '.[] | select(.id=="<app>")'
   ```
5. **SSO.** A real browser login through Keycloak, which also auto-creates the account. There is no
   command that substitutes for doing this once.
6. **Team sync.** Read the operator's log for *both* outcomes, and then check the effect:
   ```bash
   kubectl logs -n apl-<app>-operator deploy/apl-<app>-operator | grep -E 'Success!|Errors found'
   ```
7. **Convergence.** Add a team, log in as one of its members, then **touch nothing** and wait one
   reconcile interval. Membership must appear on its own. This is the rung that was missing.
8. **The suite.** `npm run test:ci` from a clean context.

For an `ID_TOKEN` in rungs 4–5: the `otomi` client has `directAccessGrantsEnabled`, so a password
grant works — but ✅ the client secret in `otomi-generated-passwords` does **not** authenticate; read
it from the Keycloak admin API instead. The worked example has the exact commands.

### 5.3 Three checks that lie

- **`1/1 Running` is not "working"** for an event-driven operator. It logs the failure and then sits
  silent. Read the log; grep for the failure string, not only the success one.
- **A Job reporting `Complete` is not evidence it did anything.** A re-run that did nothing also
  reports `Complete`. Test the effect — log in with the credential it was supposed to create.
- **An app's own "does this user exist" search endpoint may be useless.** One returned `null`
  regardless of input and sent this session down a wrong diagnosis. When an app's API disagrees with
  its database, the database is right:
  ```bash
  kubectl exec -n <app> <app>-db-1 -c postgres -- psql -U postgres -d <app> -c 'select * from users;'
  ```

---

## Traps, in one list

Each of these cost real time. The first four are fatal-but-silent.

| Trap | Consequence |
|---|---|
| Chart's `values.yaml` hidden by `.git/info/exclude` | vendored chart reaches the build without defaults; nil-pointer deep in its templates, `git status` clean |
| Platform root CA has no `subjectKeyIdentifier` | any **Python** app rejects Keycloak's certificate with `Missing Authority Key Identifier`; `openssl verify` says the same chain is `OK`, and the pod is Ready with no sign-in button |
| Mounting the CA over `ca-certificates.crt` | replaces the whole trust store; fine for Go apps that call nothing public, breaks any app needing an upstream API |
| An upstream chart with no `extraEnv`/`volumes` hooks | nothing to override — no config file can be mounted and no flag passed; found late if not grepped in Phase 0 |
| A `-raw` object colliding with a chart object name | two releases fight over one object; `helm template` finds it in seconds |
| Seeding app config through its admin API | needs a scoped token, a permission, *and* a fan-out reload — omit the reload and one process sees the change while another does not |
| An operator-supplied secret left blank | ExternalSecret never syncs, pod sits in `CreateContainerConfigError`, reads like a platform fault |
| Planning a team-sync operator before checking the app has teams | an operator with nothing to push into; claim-driven role mapping was the answer and deletes the phase |
| App missing from `defaults.gotmpl`'s database list | install dies rendering `<app>-otomi-db` |
| A fixture supplying what production derives | suite goes green on a branch whose install cannot render |
| A values override merged the wrong way | override accepted, validated, then silently dropped |
| Building the image before pushing the branch | Argo CD cannot see `charts/<app>`; or renders a *different* revision's chart and drops your keys, still reporting Healthy |
| Skipping `bin/gen-chart-schema.sh` | Helm validates nothing, silently |
| Per-user push with no reconcile timer | membership never converges; pod healthy, log says `Success!` |
| An in-cluster URL with no port | resolves to :80, hangs to a timeout, reports something useless |
| `kubectl exec … -- /bin/sh` on a distroless image | *executable file not found*; no shell to run a guard in |
| A bootstrap Job not gated on readiness | retries burnt on a predictable wait for a dependency |
| Deriving the test domain from another app's route | `D` silently empty, every check afterwards targets nothing |
| Enabling a new app on a running cluster | unrecoverable; rebuild instead |

---

## Rejected patterns

Recorded so they are not re-proposed. Each failed the ground rule — the *mechanism* had no
counterpart elsewhere in the platform.

- **Hand-writing the chart.** Every third-party app vendors its upstream chart. First-party charts
  exist only where no upstream one does.
- **Mounting the logo into `otomi-console` from `apl-core`.** Works, but all logos live in
  `apl-console`, which you are patching anyway.
- **A `Job` for team sync instead of an operator.** Every existing team sync is an operator, and a
  Job cannot handle the membership timing problem in 4.1.
- **A `*jobs` anchor Job for the admin bootstrap.** The anchor exists and is documented, but
  `values/jobs/` holds only scripts — documentation with no working example. The Gitea-style exec
  workload has both.
- **Claim-driven team sync via a custom OIDC claim**, where the app supports it. Proven to work with
  stock Keycloak, but bespoke, and pull-on-login rather than push. Note it is **mutually exclusive**
  with API-managed membership. See the worked example for the known-good mapper configuration if you
  ever need the fallback.

---

## Appendix — platform facts worth not rediscovering ✅

- **One OIDC client for the whole platform.** The `otomi` realm has a single confidential client,
  `otomi`, and every app is a redirect URI on it. There is no client-per-app.
- **The `groups` claim is realm roles, not Keycloak groups.** It carries built-in roles as noise
  (`offline_access`, `default-roles-otomi`, `uma_authorization`), so anything consuming it must
  filter. `helmfile.d/snippets/authpolicy-jwt.gotmpl` gates on it via `allowGroups` and is the
  existing way to group-restrict a host at the Istio layer.
- **Keycloak group membership is the platform's source of truth for who is in a team** — the same
  groups `apl-keycloak-operator` maintains. Read it with a master-realm `admin-cli` password grant.
- **The Keycloak operator does not prune.** It creates protocol mappers only when absent and PUTs
  groups with a `{name}`-only representation, leaving attributes intact.
- **Operators can use the internal Keycloak address** (`keycloak-keycloakx-http.keycloak.svc.cluster.
  local:8080`) and skip the CA problem entirely. An app whose `authurl` must be the browser-facing
  issuer cannot, and needs the CA mount instead.
- **Object storage is `linode` or `disabled`; there is no in-cluster option.** Apps that need S3
  (Loki, the CNPG backups) cannot be activated in this lab. Harbor *can* — it falls back to
  `imageChartStorage: type: filesystem` on a PVC.
