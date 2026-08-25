# Vikunja integration

[Vikunja](https://github.com/go-vikunja/vikunja) as a first-class platform app, at the same level as
Gitea, Harbor and Argo CD: one shared instance, its own host, Keycloak SSO, a Console tile, and
platform teams pushed into Vikunja teams.

This file is fork-only and is not intended for upstream. It started as a plan; it is now a **record**
of what was built, what was measured, and what is still unproven. It is evidence, not a plan — the
work is done and on `feat/vikunja-integration`. Do not execute it.

➡ **Integrating a *different* app? Read [`INTEGRATING-AN-APP.md`](INTEGRATING-AN-APP.md) instead.**
That is this file's Phase 5 generalized into a full playbook, with everything learned since. Come
back here for the concrete detail behind any rule in it — this file is the worked example it cites.

Status legend: ✅ verified by running it · ⚠ built but not run end to end · ⬜ not done

## The ground rule

**Every mechanism must already exist for another app. The content may be Vikunja-specific.**

The test is on the *mechanism*, not the code. A script modelled on one that serves a different tool
but written for Vikunja is fine — expected, even. A script with no counterpart anywhere in the
platform is not: that is where Vikunja becomes the odd one out and the next person has nothing to
reason from.

Every decision below is anchored to a file that already does the same job for another app. Appendix
B lists approaches rejected on exactly this test; do not re-derive them.

| What you need | Copied from |
| --- | --- |
| Vendoring an upstream chart | `charts/gitea/` + entry in `charts/dependencies.yaml` |
| HTTPRoute + ServiceEntry | `values/harbor/harbor-raw.gotmpl` |
| CNPG database | `values/gitea/gitea-otomi-db.gotmpl` + `values/gitea-db-secret/` |
| Admin credential into the app | `values/harbor/harbor-raw.gotmpl` (ExternalSecret → env) |
| Running an app's own CLI in-cluster | `values/gitea/gitea-raw.gotmpl` (SA + Role + `kubectl exec`) |
| Custom-CA mount | `values/gitea/gitea.gotmpl` `extraContainerVolumeMounts` |
| A team-sync operator | `charts/apl-gitea-operator/` + `values/apl-gitea-operator/` |
| Operator's config channel | `apl-gitea-operator-cm` ConfigMap carrying `teamConfig` JSON |
| App settings + generated secrets | `definitions.apps.gitea` in `values-schema.yaml` |
| Console tile | `core.yaml` `adminApps[]` + `apps.yaml` `appsInfo` |
| Console logo | `apl-console/public/logos/<name>_logo.svg` |

---

## Scope

**In:** deploying Vikunja, SSO login, the Console tile, and syncing platform teams and their
membership into Vikunja.

**Out:** projects — APL has no project concept, so Vikunja projects stay a user-facing concern.
User *de*provisioning is also out; see Phase 3.

## Four repos

✅ This is a multi-repo change. Discovering that late is what made the first pass wrong.

| Repo | Why | Where it lives now |
| --- | --- | --- |
| `apl-api` | hard-coded `AppList` enum gates whether the app can exist at all | `vikunja-patches/apl-api.patch` |
| `apl-core` | the app: chart, values, schema, database, routing, Console wiring | this branch |
| `apl-console` | the logo file | `vikunja-patches/apl-console/` |
| `apl-tasks` | the team-sync operator | `vikunja-patches/apl-tasks.patch` |

The three foreign repos are shipped as patches rather than forks — see `vikunja-patches/README.md`
for why, and for the exact build and load commands.

---

## Phase 0 — `apl-api`: let the app exist

✅ Nothing in any other phase is visible until this lands. `GET /v1/apps` is what the Console builds
its tile list from, and it is derived from a hand-maintained enum baked into the API image:

```js
// apl-api, dist/src/app.js
const getAppList = () => getSpec().spec.components.schemas['AppList'].enum
```

`vikunja-patches/apl-api.patch` adds `vikunja` to `AppList.enum` in `src/openapi/app.yaml`. The
image also bakes in a copy of `apl-core/values-schema.yaml`, so `npm run schema:sync` must run
**after** Phase 1's schema change or the app's settings form comes out empty.

✅ Built as `docker.io/linode/apl-api:v0.0.0-vikunja` (717 tests pass). No publishing needed: tag it
with the `docker.io/linode/…` name the chart already expects, `kind load` it, and pin
`versions.api: 0.0.0-vikunja` in your `values.yaml`.

⚠ `versions` was not settable from values before this branch — `helmfile.d/snippets/derived.gotmpl`
read `versions.yaml` and nothing else. It now merges values over the file, which is also the fix
`UPGRADE.md` asks for: four components float on `main` and an installation could not pin them
without editing a tracked upstream file.

⛔ **That merge was backwards for four commits, and it failed silently.** sprig's `merge dest src`
lets the *destination* win, and a Go template pipeline puts the piped value last: `X | merge Y` calls
`merge(Y, X)`, so `Y` wins. Written as `($v | get "versions" dict) | merge $versions`, the
destination was `versions.yaml` — every pin in values was accepted, validated against the schema,
and then dropped. No error, no warning. Every `versions:` line in `SETUP.md` and
`vikunja-patches/README.md` was a no-op, so `apl-api` would have kept running `:main` without the
`AppList` enum and there would have been no Vikunja tile — with nothing in any log to say why.

Confirmed empirically rather than by reasoning about sprig, which is the only way to be sure here:

```console
$ helm template t ./t              # $file = {api: main}, $vals = {api: 0.0.0-vikunja}
asWritten:  {api: main}            # ($vals | merge $file) -- values silently lost
flipped:    {api: 0.0.0-vikunja}   # ($file | merge $vals) -- correct
```

The fix applies the override as the *argument* (`$versions | merge (deepCopy $valuesVersions)`),
with `deepCopy` because `merge` mutates its destination, and re-applies the derived `core` last so
it stays authoritative. The Phase 5 lesson is Step 8's, one layer down: **an override that is
silently ignored is worse than one that errors.** When you add a values override, assert that
setting it actually changes the rendered output — do not assume the merge went the way it reads.

---

## Phase 1 — `apl-core`: deploy the app

Mirrors Harbor: a shared app, own host, own CNPG database, no bootstrap-time dependency.

### 1.1 Chart — vendored, not written ✅

`charts/vikunja/`, chart `2.2.1` / appVersion `2.5.0`, with its bjw-s `common` subchart, exactly as
`charts/gitea/charts/` vendors `postgresql` and friends.

✅ **The chart repository is OCI, not HTTP.** `vikunja.io/charts` 404s and so does every
`…github.io/helm-chart` guess. The real one is `oci://ghcr.io/go-vikunja/helm-chart/vikunja`, found
through the Artifact Hub API. `charts/dependencies.yaml` already has OCI entries (`kserve`, `loki`),
so it follows the existing convention.

```bash
helm pull oci://ghcr.io/go-vikunja/helm-chart/vikunja --version 2.2.1 --untar
```

### 1.2 Values — `values/vikunja/vikunja.gotmpl` ✅

The chart is a bjw-s `common` wrapper, so value names differ from Gitea's, but the shape is the
same: config from `.Values`, secrets via `secretKeyRef` env.

✅ Facts about the container, all verified by running `vikunja/vikunja:2.5.0`:

| Concern | Value |
| --- | --- |
| Image | `vikunja/vikunja` — API and frontend in one container |
| Port | `3456` |
| Probe | `GET /api/v1/info` — also reports which OIDC providers are live |
| Config | `/etc/vikunja/config.yml` from a ConfigMap |
| Uploads | `/app/vikunja/files` — needs a PVC, and it must be writable or the process exits |
| Pod security | `fsGroup: 1000`, runs as uid 1000 |
| Shell | **none.** Distroless. This breaks the obvious `kubectl exec … -- /bin/sh -c` shape |

Config set (see [reference](https://vikunja.io/docs/config-options/)):

- `service.publicurl` — required since app version 1.0.0
- `service.secret` — JWT signing key. ✅ Regenerated per process start if unset, logging everyone
  out on restart. Comes from an `x-secret`.
- `service.enableregistration: false`
- `auth.local.enabled: true` — counter-intuitive but correct; see 1.5
- `database.*` — `type: postgres`, host `vikunja-db-rw.vikunja.svc.cluster.local:5432`
- `auth.openid.providers.otomi.*` — `authurl` is `_derived.oidcBaseUrl`, `clientid` is
  `_derived.oidcClientID`
- `auth.openid.providers.otomi.requireavailability: true` — see 1.8
- `keyvalue.type: memory` — safe at one replica. ⬜ Multiple replicas need `redis`; `charts/valkey`
  is vendored and `gitea-valkey` shows the pattern.

✅ **Secrets reach the app through env, including the nested provider map.** Vikunja's
`setConfigFromEnv` splits `VIKUNJA_A_B_C` on `_` into a nested map and merges it over the config
file, so `VIKUNJA_AUTH_OPENID_PROVIDERS_OTOMI_CLIENTSECRET` lands in
`auth.openid.providers.otomi.clientsecret`. Verified: the provider came up with a secret that
appears nowhere in the ConfigMap. This is what makes the plain Gitea-style "config in values,
secrets in env" split work here — no templated config file, no secret in a ConfigMap.

⚠ The chart's hard-coded values win over yours. `templates/vikunja.yaml` does
`include "…hardcodedValues" . | fromYaml | merge $ctx.Values` — `merge` lets the *destination* win,
and the destination is the hard-coded block. Probes, `fsGroup` and the config mount cannot be
overridden. It also reads `.Values.vikunja.env.VIKUNJA_DATABASE_TYPE` unguarded, so that key must be
set or templating fails on a nil comparison.

### 1.3 Database ✅

Two releases, copied from Gitea:

- `values/vikunja/vikunja-otomi-db.gotmpl`
- `values/vikunja-db-secret/vikunja-db-secret-raw.gotmpl`

plus `databases.vikunja` defaults and schema, and `platformBackups.database.vikunja`.

⛔ **A new database needs a fourth entry, in `helmfile.d/snippets/defaults.gotmpl`.** That file
injects `databases.<name>.storageClass` from `cluster.defaultStorageClass`, and it lists each
database by name. `vikunja-otomi-db.gotmpl` reads `$vdb.storageClass` unguarded — copied verbatim
from Gitea, which does the same — so a database missing from that list fails the install with:

```
failed processing release vikunja-otomi-db: ... executing "stringTemplate" at
<$vdb.storageClass>: map has no entry for key "storageClass"
```

That is a *hand-maintained registry* of exactly the kind Phase 5 Step 0 warns about, and it is the
one that was missed. It is not in `values-schema.yaml`, not in `defaults.yaml`, and not next to
anything else Vikunja-shaped.

⚠ **`npm run test:ci` cannot catch it, and the fixture is why.**
`tests/fixtures/env/databases/vikunja.yaml` originally set `storageClass: vikunja-storage-class`,
copying `gitea.yaml` and `keycloak.yaml`, which both do the same. That satisfies the template from
the fixture and leaves the injection untested — the suite went green on a branch where the install
could not render. The fixture now deliberately omits the key, so it exercises the path production
uses. **A fixture that supplies a value production derives does not test the code; it replaces it.**

### 1.4 Schema and defaults ✅

`definitions.apps.properties.vikunja` in `values-schema.yaml`, following `apps.gitea`:
`enabled`, `adminUsername`, `adminPassword`, `jwtSecret`, `postgresqlPassword`,
`databaseMaxConnections`, `databaseMaxIdleConnections`, `persistence.size`, `teamSync.enabled`,
`resources.vikunja`.

`x-secret` is what makes the platform generate the value and seal it into `apl-secrets` as
`vikunja-secrets`; the app reads it back through an ExternalSecret against `core-secrets-store`.
✅ Confirmed working — `bootstrap-dev` writes `…/apl-secrets/sealedsecrets/vikunja-secrets.yaml`.

Network policies are optional — only `git-server`, `gitea` and `otomi-api` have them; Harbor and
Argo CD do not. Skipped.

### 1.5 The admin credential ✅

Every integrated app solves this identically: **the local admin account stays enabled for machines,
SSO is for humans, and the password is a platform-generated `x-secret`.** Argo CD is the clearest
statement of the principle, keeping `admin.enabled: "true"` alongside SSO — which is why 1.2 keeps
`auth.local.enabled: true`.

Vikunja has no first-run admin bootstrap and no chart hook like Gitea's `admin.existingSecret`, so
the account only exists once someone runs its CLI. `values/vikunja/vikunja-raw.gotmpl` does that
with the same four objects as Gitea's backup CronJob — ServiceAccount, Role with `pods/exec`,
RoleBinding, and a workload running `registry.k8s.io/kubectl` — as a `Job` rather than a `CronJob`.

✅ **Neither image has a shell.** `vikunja/vikunja` is distroless and so is
`registry.k8s.io/kubectl`, so `kubectl exec … -- /bin/sh -ec '…'` fails with *executable file not
found* on the first and there is nowhere to run the guard on the second. The Job therefore uses the
kubelet's own `$(VAR)` expansion over `env` to interpolate the credentials, and execs the Vikunja
binary directly.

✅ **Re-running is safe.** `vikunja user create` for an existing username logs
`User with that username already exists` and **still exits 0** — Vikunja's `log.Fatalf` does not set
a non-zero status. So the Job is idempotent without a guard. (`vikunja user list -e <address>`
*does* exit non-zero for an unknown address, which is the cheap existence check if you ever want
one.)

### 1.6 Releases ✅

Harbor's placement, not Gitea's — Gitea sits in `helmfile-03.init` because bootstrap depends on it,
which Vikunja does not.

```
helmfile-70.shared.yaml.gotmpl     vikunja-artifacts, vikunja,
                                   apl-vikunja-operator-artifacts, apl-vikunja-operator
helmfile-03.databases.yaml.gotmpl  vikunja-db-secret-artifacts, vikunja-otomi-db
```

The anchors derive chart and values paths from the release name, so names must match exactly.

### 1.7 Fixtures ✅

`tests/fixtures/env/apps/vikunja.yaml`, `tests/fixtures/env/apps/apl-vikunja-operator.yaml` and
`tests/fixtures/env/databases/vikunja.yaml`, in the current CRD-shaped format (`kind: AplApp`).
These are what make `npm run test:ci` actually exercise the new templates.

### 1.8 Two failure modes worth the config they cost ✅

**OIDC discovery happens once, at startup, and failing is not fatal by default.** Vikunja logs three
retries and then serves happily with `openid_connect.providers: []` — a running, healthy pod with no
SSO button and nothing in the probe to notice it. `requireavailability: true` turns that into
`log.Fatalf`, so the pod restarts until Keycloak answers. Verified both ways.

**Discovery fails on the platform's own certificate.** With the default `cert-manager.issuer:
custom-ca`, `https://keycloak.<domain>` is signed by the platform CA, and Vikunja reports
`x509: certificate signed by unknown authority` — then, without the setting above, comes up with no
providers. The fix is the same custom-CA mount `values/gitea/gitea.gotmpl` already uses, expressed
through the bjw-s `persistence` block with `type: secret`. ✅ Verified against the running lab's real
Keycloak: without the mount, `providers: []`; with it, the provider is listed with its discovered
`auth_url`.

✅ **The `custom-ca` secret is per-namespace and each app creates its own.** Nothing copies it
around — `values/gitea/gitea-raw.gotmpl` emits it from `_derived.caCert`, and on the running lab it
exists in exactly four namespaces, one per app that mounts it. `values/vikunja/vikunja-raw.gotmpl`
does the same. Mounting a secret that does not exist would keep the pod in `ContainerCreating`
forever with nothing in the app's own logs to explain it.

⚠ The operator sidesteps all of this by talking to `http://keycloak-keycloakx-http.keycloak.svc.
cluster.local` rather than the public host — the address `apl-keycloak-operator` already passes as
`KEYCLOAK_ADDRESS_INTERNAL`. Vikunja itself cannot: its `authurl` has to be the browser-facing
issuer, so it needs the CA.

---

## Phase 2 — Console presence ✅

### 2.1 `apl-core`

`core.yaml` gains the `vikunja` and `apl-vikunja-operator` namespaces and one `adminApps` entry:

```yaml
  - name: vikunja
    tags: [productivity, tasks]
    isShared: true
    ownHost: true
```

✅ That one entry does three jobs. It registers `https://vikunja.<domain>/*` as an OIDC redirect URI
— `values/apl-keycloak-operator/apl-keycloak-operator-raw.gotmpl` builds the list from `adminApps`
where `ownHost` is true, so no `apl-tasks` change is needed. It puts the app on `/apps/admin` **and**
in every team's list, via `adminApps.filter(app => app.isShared)` in the Console. And `isShared`
suppresses the per-team hostname suffix, so every team links to the one instance.

`apps.yaml` gains an `appsInfo.vikunja` block, copied in shape from `appsInfo.gitea`.

### 2.2 `apl-console`

✅ `public/logos/vikunja_logo.svg` (Vikunja's own `frontend/src/assets/logo.svg`, AGPL-3.0). The
Console builds the path as `/logos/${appId}_logo.svg` with no lookup table, so the file name must
match the app name exactly. Built as `docker.io/linode/apl-console:v0.0.0-vikunja`.

Do **not** mount the logo in from `apl-core` — see Appendix B.

---

## Phase 3 — `apl-tasks`: the team-sync operator ⚠

✅ Every team sync in this platform is an operator in `apl-tasks` that watches a ConfigMap generated
by `apl-core` and pushes to the app's REST API:

```
Console → apl-api writes the values repo → Argo CD / apl-operator re-render
        → ConfigMap apl-vikunja-operator-cm changes → operator's watch fires → Vikunja API
```

### 3.1 In `apl-core` ✅

- `charts/apl-vikunja-operator/` — copied from `charts/apl-gitea-operator/`, with the `pods/exec`
  Role and the Tekton ClusterRole dropped: this operator only reads its own ConfigMap and Secret and
  talks HTTP.
- `values/apl-vikunja-operator/apl-vikunja-operator.gotmpl` — image `linode/apl-tasks` at
  `$v.versions.tasks`, so no new `versions.yaml` entry is needed.
- `values/apl-vikunja-operator/apl-vikunja-operator-raw.gotmpl` — the `teamConfig` ConfigMap and an
  ExternalSecret with the Vikunja service account and the Keycloak admin credential.
- Releases gated on `vikunja.enabled` **and** `vikunja.teamSync.enabled`.

⚠ **`teamSync` defaults to `false`, and that is not timidity.** The published `linode/apl-tasks`
image has no `operator:vikunja` script, so pointing the release at it produces a crash-looping pod.
It is only safe to switch on once you have built the patched image, below.

### 3.2 In `apl-tasks` ✅ built

`vikunja-patches/apl-tasks.patch` adds `src/operators/vikunja/`, modelled on `src/operators/gitea/`
for the manager layout and two-object watch, and on `src/operators/harbor/` for the reconcile timer
that makes membership converge (see 3.3). It creates a `team-<id>` per platform team and reconciles
membership every `VIKUNJA_RECONCILE_INTERVAL` seconds, default 60.

✅ **It builds with no credentials**, via `vikunja-patches/apl-tasks-vikunja.Dockerfile`.

`apl-tasks`' own `Dockerfile` cannot be used: it runs `npm ci` against GitHub Packages, which
requires authentication even for public packages — anonymous and a `gh` token without
`read:packages` both return 403. The way past that is not a token. The published
`linode/apl-tasks:main` image already ships a fully resolved `/app/node_modules` with all four
`@linode/*` packages in it, so **the published image is the dependency source**; only `typescript`
and its `@types` come from public npm.

The generalization, and the reason this sat blocked for a session: *a private dependency registry
blocks resolution, not consumption.* If a published image of the same project exists, it has already
paid that cost. Look for the resolved artifact before looking for the credential.

Verified on the artifact, not the exit code: `dist/src/operators/vikunja/vikunja.js` plus its `lib/`
exist, `node_modules` is byte-identical to `:main`, `npm run operator:vikunja` is unchanged so
`charts/apl-vikunja-operator` needs no special-casing, and running the entrypoint reaches the
operator's own `envalid` check and reports `VIKUNJA_URL` missing — which proves it compiled *and*
resolved every `@linode/*` import at runtime.

⚠ Two ways this build exits `0` having produced nothing usable, both hit here:

- `tsc` infers `rootDir` from the files it finds. `tsconfig.json`'s `include` lists `jest.config.ts`
  next to `./src/**/*.ts`; omit that file and `rootDir` collapses to `src/`, output lands in
  `dist/operators/` instead of `dist/src/operators/`, and `tsc` still exits `0`.
- `docker build ... > log 2>&1; echo "EXIT=$?"` reports *`echo`'s* status. See `CLAUDE.md` rule 2 —
  the pipe is not the only way to lose an exit code.

✅ The API surface it targets *was* exercised, by hand, against a real Vikunja with a plain local
account — no admin license, no Pro features:

| Need | Endpoint | Result |
| --- | --- | --- |
| Log in | `POST /login` | 200, JWT |
| Create team | `PUT /teams` | 201, creator auto-added as a member |
| List teams | `GET /teams` | 200 |
| Read a team's members | `GET /teams/{id}` | 200 |
| Add a member who has never signed in | `PUT /teams/{id}/members` | **404**, not 400 |

⛔ **Do not use `/admin/*`.** Those endpoints are the Vikunja Pro admin panel and need a license;
`vikunja user set-admin` carries the same restriction and refuses with *the admin-panel license
feature is not active*. Nothing above needs it. The cost is that user *de*provisioning is
unavailable, which is acceptable: removing someone from their Keycloak group removes them from the
Vikunja team on the next reconcile, which is the control that matters.

✅ Users are never created by the operator — Vikunja auto-registers them on first OIDC login, the
same choice Gitea makes with `ENABLE_AUTO_REGISTRATION`. ✅ And a username collision does not shadow
anything: `getOrCreateUser` calls `CreateUserWithRandomUsername`, so an SSO user whose preferred
username is taken gets a random one instead. It is still worth avoiding, which is why the service
account defaults to `apl-vikunja-admin` and not `otomi-admin`.

⚠ **A consequence to design for:** a user only exists in Vikunja after their first login, so
membership cannot be fully reconciled when a team is created; it fills in as people sign in. A
continuously-running operator is a precondition for handling this, which is a further reason not to
use a one-shot Job — but it is **not sufficient on its own**, and the first version of this operator
got that wrong. See 3.3.

### 3.3 Why the operator needs a timer, not just watches ⛔ found live, fixed

The first version watched only its own Secret and ConfigMap, exactly as `operators/gitea/` does, and
reconciled on those events alone. That cannot converge membership, and the reason is worth stating
generally: **the two events membership depends on are both invisible to Kubernetes.**

| the operator needs | happens in | k8s event |
|---|---|---|
| the user joins the Keycloak group | Keycloak | none |
| the user logs into Vikunja for the first time | Vikunja | none |

Observed on a clean lab install: a team created at 12:19 got its Vikunja team immediately, the
Keycloak user was created and joined the group at 12:28, the user logged in at 12:28 — and
membership never appeared, because no Secret or ConfigMap changed again. `1/1 Running`, no errors in
the log, `Success!` as its last line. Everything needed had been in place for an hour and nothing
would ever look again.

**Neither reference operator has this problem, and they avoid it in two different ways — but note
that neither pushes individual users.**

| | membership model | what makes it converge |
|---|---|---|
| `operators/gitea/` | delegated to Gitea's own OIDC group→team map (`gitea-oidc.ts`: `--group-claim-name groups --group-team-map`) | the user's login, handled inside Gitea |
| `operators/harbor/` | a *group* bound to the project (`harbor-project.ts`: `memberGroup`) | an unconditional 60s `setInterval` — **no watches at all** |
| Vikunja (ours) | per-user push, `PUT /teams/{id}/members` | needed a timer; had none |

Gitea's model is unavailable to us for the reason in `keycloak-groups.ts`: teams Vikunja creates from
an OIDC claim are not editable through its API, so claim-driven sync and operator-managed teams are
mutually exclusive. Harbor's group binding is unavailable too — Vikunja teams take users, not groups.
Per-user push is therefore forced, and per-user push is exactly the model that needs a timer.

So the fix follows Harbor: `VIKUNJA_RECONCILE_INTERVAL` (default **60**s) drives `setupVikunja()` on
a `setInterval`, with a `reconciling` flag so a slow Keycloak round trip cannot overlap two runs. The
watches are kept, but only for responsiveness when a team is added — they are not what makes the
system correct. Harbor proves they are not even necessary: it re-reads its Secret and ConfigMap by
polling every cycle.

**The generalization: a push-based integration is only as convergent as its slowest unconditional
retrigger.** If the state you are pushing depends on anything outside Kubernetes, event-driven alone
is a correctness bug — and it is one that presents as a healthy pod with a success message, which is
why it survived a full verification pass.

---

## Phase 4 — verification

### What has been verified ✅

- `npm run test:ci` from a clean context: 535 tests, `lint`, `validate-values`,
  `validate-templates`, `bootstrap-dev`. All four Vikunja releases and the operator release lint and
  render.
- `apl-api` builds with the enum change (717 tests) as `linode/apl-api:v0.0.0-vikunja`.
- `apl-console` builds with the logo as `linode/apl-console:v0.0.0-vikunja`.
- `vikunja/vikunja:2.5.0` runs against Postgres with the exact `config.yml` and env this branch
  generates: migrations succeed, `GET /api/v1/info` answers.
- OIDC discovery against the running lab's real Keycloak, with and without the custom-CA mount.
- `vikunja user create` / `user list -e`, including re-runs.
- The full team API the operator uses, against a local account.

### What has not ⬜

**No Kubernetes deployment of this has been completed.** Three attempts were made and none was
watched to `completed`, so the wiring — Argo CD sync, the CNPG database, the ExternalSecrets
resolving, the HTTPRoute, the bootstrap Job, the Console tile, a real SSO round trip, the operator —
remains unverified. What the attempts *did* buy was two real bugs, both of which passed the full test
suite and would have been invisible from any amount of reading:

- `databases.vikunja.storageClass` was missing from `helmfile.d/snippets/defaults.gotmpl`, so the
  install died rendering `vikunja-otomi-db`. See Phase 1.3 — including why `test:ci` could not see it.
- The `versions` override merged the wrong way and was silently discarded, so every image pin in
  `SETUP.md` was a no-op. See Phase 0.

The lesson is not "test more", it is that **this integration's failure modes live in the install, not
in the templates.** The suite renders with fixtures that supply what production derives. Until an
install reaches `completed`, treat the Phase 1 and 2 ✅ marks as "renders and lints", not "works".

⚠ **Do not try to enable this on a cluster that is already installed.** Argo CD's own
`apl-operator` Application fights `helm upgrade` for the operator Deployment and wins, and the two
charts render deliberately different specs. `SETUP.md` § "Do not use this to enable a new app on a
running cluster" has the full mechanism. Recreate the cluster; it is faster.

⚠ **Argo CD fetches `charts/*` from a git URL, not from the image.** `charts/vikunja` exists only on
this branch, so the `vikunja` Application cannot sync until `APPS_REPO_URL` and `APPS_REVISION`
point at a commit that has it. `SETUP.md` step 5 now covers this. Getting it wrong does not error:
the Application just reports the path missing, or worse, a chart from a different revision renders
fine while silently dropping every key your templates set.

Work outward. Each step has a cheap check that fails loudly.

1. **App runs.** Pods up in `vikunja`; CNPG cluster healthy; `GET /api/v1/info` returns 200 **and
   lists the OIDC provider** — an empty `providers: []` means discovery failed.
2. **Tile exists.** The one command that matters — empty output means Phase 0 did not land, and no
   amount of `core.yaml` will help:
   ```bash
   curl -sk -H "Authorization: Bearer $ID_TOKEN" \
     "https://api.<domainSuffix>/v1/apps" | jq '.[] | select(.id=="vikunja")'
   ```
3. **Console.** `/apps/admin` shows a Vikunja tile with its logo, linking to
   `https://vikunja.<domainSuffix>/`. Check a team view too — `isShared` should put it there with
   the same URL.
4. **SSO.** Log in as a team member through Keycloak; the account is auto-created.
5. **Team sync.** Needs `teamSync.enabled` and the patched `apl-tasks` image, which builds without
   credentials — see § 3.2. Expect `apl-vikunja-operator` `1/1 Running`; a `CrashLoopBackOff` almost
   certainly means the released `linode/apl-tasks` image is in use and has no `operator:vikunja`.
6. **Suite.** `npm run test:ci` from a clean context — see `CLAUDE.md`.

For a token in steps 2–4: the `otomi` client has `directAccessGrantsEnabled`, so a password grant
works. Read the client secret from the Keycloak admin API — ✅ the value in the
`otomi-generated-passwords` secret does **not** authenticate:

```bash
CS=$(curl -sk -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://keycloak.<domainSuffix>/admin/realms/otomi/clients/otomi/client-secret" | jq -r .value)
curl -sk -X POST "https://keycloak.<domainSuffix>/realms/otomi/protocol/openid-connect/token" \
  -d client_id=otomi -d "client_secret=$CS" -d grant_type=password -d scope=openid \
  -d "username=<user>" -d "password=<pass>" | jq -r .id_token
```

⚠ **Argo CD self-heals.** These apps have `syncPolicy.automated.selfHeal: true`, so any live patch to
a platform manifest is reverted within seconds — including patches to the `Application` resource
itself. Suspend automation for the duration of any live experiment, or go through the values repo.

---

## Phase 5 — doing this again for another app

The order below is the order that costs least. Most of the pain in this integration came from doing
things in a different one.

### Step 0. Find every repo the change touches, before writing anything

`apl-core` is not enough on its own. An app is only visible if `apl-api`'s hand-maintained `AppList`
enum knows the name, only pretty if `apl-console` has the logo, and only team-aware if `apl-tasks`
has an operator. Grep for an app that already works — `gitea`, `harbor` — across all four
repositories and see everywhere its name appears. That list is your work plan.

The generalization: **look for hand-maintained registries.** Any enum, any `switch`, any directory
where files are named after apps. They are invisible from `apl-core` and each one silently drops
your app.

Then check you can *build* each one before you write code for it, because that is a hard blocker
found late. Two of the three built with `docker build .`; `apl-tasks` needs a GitHub Packages token,
which stopped this work for a session. It should not have: **a private dependency registry blocks
resolution, not consumption.** The project's own published image has already resolved those
dependencies, so a build stage that copies `node_modules` out of it needs no credential at all.
Look for the resolved artifact before you go looking for the token.

### Step 1. Pin what Argo CD fetches before you deploy anything

The platform is assembled from two halves: the image carries `values/*.gotmpl` and `helmfile.d/`;
Argo CD fetches `charts/*` from `APPS_REPO_URL` at `APPS_REVISION`. **A new chart directory does not
exist for Argo CD until it is on a commit that URL can reach.** And a mismatch does not error —
templates set keys the older chart does not have and they are dropped silently, while the
Application still reports Synced and Healthy.

So: push the branch, then build the image with `APPS_REPO_URL` and `APPS_REVISION` pointing at it.

### Step 2. Run the app's container before you write a line of Helm

This is the single highest-value hour. `docker run` it with a throwaway database and the config you
intend to ship. In this case that produced, in about twenty minutes, five findings that would each
have cost a full deploy-debug cycle:

- no shell in the image, which invalidated the bootstrap-job design
- the uploads directory must be writable or the process exits immediately
- the exact env-var spelling that reaches a nested config map
- OIDC discovery is startup-only, non-fatal, and silent
- discovery fails against the platform CA unless you mount it

Then point it at something real from the running lab — the lab's Keycloak is reachable from the
`kind` docker network — and check the app's own status endpoint, not just that the process is alive.
`GET /api/v1/info` reporting `providers: []` is the difference between "it started" and "it works".

### Step 3. Vendor the upstream chart, and read its templates

Never write a chart for a third-party app; every one here is vendored and overridden through values.
Finding the repository can be the hard part — the docs URL 404'd, the GitHub Pages guesses 404'd,
and the answer (an OCI registry) came from the Artifact Hub API:

```bash
curl -s "https://artifacthub.io/api/v1/packages/search?ts_query_web=<app>&kind=0" | jq '.packages[]'
```

Then read `templates/`. Specifically look for what the chart refuses to let you override. A
`merge` with the hard-coded block as the destination means the chart wins; a value the chart reads
unguarded means you must set it even when you do not care. Both are cheaper to find by reading than
by `helm lint`.

### Step 4. Split config from secrets the way the app allows, not the way you prefer

The house pattern is config in values, secrets in `secretKeyRef` env. Whether that works depends on
whether the app's config loader can express *every* secret as an environment variable — nested map
keys are where this usually breaks. Check the loader's source. If it cannot, the fallback with a
precedent here is an ExternalSecret that templates the whole config file, mounted as a secret volume
(`values/loki/loki-raw.gotmpl`).

### Step 5. Put platform objects wherever the chart lets you, and lint early

The HTTPRoute and ServiceEntry can go through the chart's extra-objects hook (Gitea's `extraDeploy`)
or through the app's own `-raw` release (Harbor). Both both have a precedent, so prefer whichever lints —
Vikunja's `additionalObjects` emits `---` and the object on the same line and fails `helm lint`,
which the `-raw` release sidesteps at no cost.

### Step 6. Write the fixtures, or the test suite proves nothing

`tests/fixtures/env/apps/<name>.yaml` with `enabled: true` is what makes `npm run test:ci` lint and
render your releases. Without it the suite passes on a branch where nothing works. Enable every
optional sub-feature in the fixture too, so its chart is exercised even when it ships off by default.

### Step 7. Only then, run the suite in a clean context

Everything above is cheaper to fix before a five-minute build. And read `CLAUDE.md` first — the
build copies `git ls-files`, so anything git does not track does not reach the build.

⚠ **The trap that cost the most here:** this checkout has `values.yaml` in `.git/info/exclude`
(for the lab's own `values.yaml` from `SETUP.md`). That silently excluded
`charts/vikunja/values.yaml` and `charts/vikunja/charts/common/values.yaml` from `git add`, so the
vendored chart reached the build without its defaults and failed with a nil-pointer deep inside the
bjw-s library. `git status` showed nothing wrong. After vendoring any chart:

```bash
git add -f charts/<name>/values.yaml charts/<name>/charts/*/values.yaml
git ls-files charts/<name> | grep values.yaml     # must not be empty
```

### Step 8. Prefer a loud failure to a quiet one

Two settings in this integration exist only to convert silence into a crash: `requireavailability`
on the OIDC provider, and the custom-CA mount that makes it reachable. Both were found by checking
a status endpoint, not by watching pod health. When you integrate an app, ask what it does when its
dependency is missing — if the answer is "logs a line and carries on", find the switch that changes
it.

---

## Appendix A — verified findings worth not rediscovering

**One OIDC client for the whole platform.** ✅ The `otomi` realm has a single confidential client,
`otomi`, and every app is a redirect URI on it. There is no client-per-app.

**The `groups` claim is realm roles, not Keycloak groups.** ✅ It carries built-in roles as noise, so
anything consuming it must filter:

```
groups: ['offline_access', 'platform-admin', 'default-roles-otomi', 'uma_authorization']
```

`helmfile.d/snippets/authpolicy-jwt.gotmpl` already gates on this claim via `allowGroups`, and is
the existing way to group-restrict a host at the Istio layer.

**OIDC endpoints are pre-derived.** ✅ `helmfile.d/snippets/derived.gotmpl` exposes fully-formed
`_derived.oidcBaseUrl`, `oidcAuthUrl`, `oidcTokenUrl`, `oidcJwksUrl`, `oidcLogoutUrl`, plus
`oidcClientSecretKey` / `oidcClientSecretProperty` so consumers never hardcode the store location.
Use them; do not assemble URLs.

**The Keycloak operator does not prune.** ✅ It creates protocol mappers only when absent and PUTs
groups with a `{name}`-only representation, leaving attributes intact.

**A latent upstream bug.** ✅ `apl-tasks` `keycloak.ts` finds the client with
`allClients.find(el => el.name === client.name)`, but the live `otomi` client has no `name` field —
so `undefined === undefined` matches the first nameless client in the realm. No visible harm so far.

---

## Appendix B — rejected approaches

Recorded so they are not re-proposed. Each was rejected by the ground rule — the *mechanism* had no
counterpart elsewhere in the platform.

**Hand-writing `charts/vikunja`.** Tempting because the official chart wraps the bjw-s `common`
library and assumes an nginx `Ingress`. Rejected: every third-party app here vendors its upstream
chart and overrides through values. `charts/git-server` and `charts/otomi-console` are first-party
only because no upstream chart exists for them.

**Mounting the logo into `otomi-console` from `apl-core`.** Technically works — ✅ tested: the logo
directory is writable, nginx serves whatever is dropped in, and `charts/otomi-console` is
first-party with an `extraManifests` hook. Rejected: all 35 existing logos live in
`apl-console/public/logos/`, and we are patching that repo's siblings anyway.

**A `*jobs` Job for team sync instead of an operator.** Rejected: every existing team sync is an
operator in `apl-tasks`. A Job also cannot handle the membership timing problem in Phase 3.

**Claim-driven team sync via a `vikunja_groups` OIDC claim.** Vikunja can create and maintain teams
from an OIDC claim, and ✅ this was proven to work with stock Keycloak — no custom mapper plugin
needed, despite Vikunja's docs pointing at one. A user-attribute mapper with `jsonType.label: JSON`,
`multivalued: true` and `aggregate.attrs: true`, over a `vikunja_groups` attribute on the Keycloak
group, produces exactly the required structure:

```
vikunja_groups: [{"name": "platform-admin", "oidcID": "kc-platform-admin"}]
```

Rejected on two grounds. It is bespoke — no other app maps platform teams through a custom claim.
And it is pull-on-login rather than push: a team would not exist until one of its members first
signed in. Note the two mechanisms are **mutually exclusive** — OIDC-created teams are not editable,
so membership cannot also be managed by API. If the operator ever proves unworkable, this is the
fallback, and the mapper configuration above is known-good.

**A `*jobs` anchor Job for the admin bootstrap.** `helmfile.d/snippets/templates.gotmpl` has one and
`docs/development.md` documents it, but `values/jobs/` holds only `scripts`, so it has documentation
and no working example. The Gitea-style exec workload has both.

---

## Appendix C — open questions, and their answers

1. ✅ **The chart's Helm repository URL.** `oci://ghcr.io/go-vikunja/helm-chart/vikunja`. Neither
   `vikunja.io/charts` nor any `github.io` variant exists.
2. ✅ **Does an OIDC login adopt or shadow a pre-existing local user?** Neither. With
   `usernamefallback` and `emailfallback` off (the defaults), Vikunja looks the user up by
   issuer+subject only, and `CreateUserWithRandomUsername` gives a colliding preferred username a
   random suffix. The service account still uses a name no human will have — `apl-vikunja-admin`.
3. ✅ **Does Vikunja tolerate `vikunja user create` being re-run?** Yes. It logs an error and exits
   0.
4. ✅ **Nothing Vikunja-side had ever been run.** It has now — see Phase 4. What remains unproven is
   the Kubernetes wiring, not Vikunja itself.
