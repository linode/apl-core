# Adding Vikunja as a first-class platform app

Research notes for wiring [Vikunja](https://github.com/go-vikunja/vikunja) into `apl-core` at the same
level as Gitea, Argo CD and the Console: one shared instance, its own host, Keycloak SSO, and platform
teams mapped onto Vikunja teams.

This file is fork-only. It is research, not a runbook — nothing here has been implemented. Claims are
marked as follows:

- ✅ **verified** — observed on the running lab or read directly from source
- ⬜ **unverified** — reasoned from documentation, not yet exercised

Verified against the lab described in `SETUP.md`, domain suffix `172.18.255.200.nip.io`,
image `apl-core-local:v6.2.1-fork`.

---

## 1. What "a native app" means in this repo

`src/dev/bootstrapCoreApp.ts` is the first-party scaffolder (`npm run dev:bootstrapCoreApp <name>`). It
writes `.chunk` files that you merge by hand into their real peers. Reading it, plus tracing Gitea
end-to-end, gives the authoritative file inventory:

| File | Purpose |
| --- | --- |
| `values-schema.yaml` | `definitions.apps.properties.<name>` — the app's settings and its `x-secret` fields |
| `helmfile.d/snippets/defaults.yaml` | `environments.default.values[0].apps.<name>` — defaults for those settings |
| `core.yaml` | `k8s.namespaces[]` entry, **and** an `adminApps[]` entry |
| `apps.yaml` | `appsInfo.<name>` — title, version, about/integration text shown in the Console |
| `helmfile.d/helmfile-NN.*.yaml.gotmpl` | the Helmfile release(s) |
| `values/<name>/<name>.gotmpl` | chart values, templated from `.Values` |
| `values/<name>/<name>-raw.gotmpl` | extra manifests via the `*raw` anchor |
| `charts/<name>/` | the chart itself |
| `tests/fixtures/env/apps/<name>.yaml` | fixture consumed by `validate-templates` / `validate-values` |

Two gaps in the scaffolder, worth knowing before you trust its output:

- ✅ It does **not** emit the `adminApps[]` entry, which is what actually publishes the app to the
  Console and — see §2 — what registers its OIDC redirect URI. Scaffolding alone produces an app that
  installs but cannot be reached or logged into.
- ✅ Its fixture format is stale. It writes `apps.<name>: {enabled: true}`, but the current fixtures in
  `tests/fixtures/env/apps/` are CRD-shaped (`kind: AplApp` / `metadata.name` / `spec:`). Copy an
  existing fixture instead of using the generated one.

The `*default`, `*raw`, `*otomiDb` and `*jobs` anchors in `helmfile.d/snippets/templates.gotmpl` derive
chart and values paths from the release name by convention, so names must line up exactly:
`<name>` → `charts/<name>` + `values/<name>/<name>.gotmpl`; `<name>-artifacts` → `charts/raw` +
`values/<name>/<name>-raw.gotmpl`; `<name>-otomi-db` → `charts/otomi-db`.

---

## 2. How the identity layer actually works

This is the part that decides the whole design, and it is not what the app-per-client convention would
lead you to expect.

✅ **There is exactly one OIDC client for the entire platform.** The `otomi` realm contains a single
confidential client, `otomi`. Every platform app is a redirect URI on that one client:

```
otomi | public=False | redirects=[
  https://argocd.172.18.255.200.nip.io/*, https://gitea.172.18.255.200.nip.io/*,
  https://harbor.172.18.255.200.nip.io/*, https://keycloak.172.18.255.200.nip.io/*,
  https://console.172.18.255.200.nip.io/*, ...  ]
```

✅ **That list is generated in this repo**, from `core.yaml`. See
`values/apl-keycloak-operator/apl-keycloak-operator-raw.gotmpl:22-33`:

```gotmpl
{{- range $coreApp := $v.adminApps }}
  {{- if $coreApp | get "ownHost" false }}
    {{ $redirectUrls = append $redirectUrls (printf "https://%s.%s/*" $coreApp.name $domainSuffix) }}
```

The live client's redirect list matches `adminApps` with `ownHost: true` exactly, plus the `teamApps`
cross-product with team IDs. **Adding `- name: vikunja` with `ownHost: true` to `adminApps` is
sufficient to register `https://vikunja.<domain>/*` as a redirect URI.** No change to `apl-tasks` is
needed for the app to be able to log in.

✅ **The `groups` claim is realm roles, not Keycloak groups.** The `openid` client scope carries a
mapper of type `oidc-usermodel-realm-role-mapper` writing to `claim.name: groups`. Keycloak groups
(`platform-admin`, `team-admin`, `all-teams-admin`, `team-<id>`) each have a same-named realm role
mapped onto them, which is what makes the claim look like group membership. The claim therefore also
carries Keycloak's built-in roles as noise:

```
groups: ['offline_access', 'platform-admin', 'default-roles-otomi', 'uma_authorization']
```

Anything consuming `groups` must filter, not trust the whole list. `helmfile.d/snippets/authpolicy-jwt.gotmpl`
already gates on `request.auth.claims[groups]` via its `allowGroups` parameter, and is the platform's
existing mechanism for group-restricting a host at the Istio layer.

✅ **The client secret is shared and already plumbed.** `helmfile.d/snippets/derived.gotmpl` exposes
`_derived.oidcClientSecretKey` (`keycloak-secrets`) and `_derived.oidcClientSecretProperty`
(`idp_clientSecret`) precisely so consumers do not hardcode the store location, alongside fully-formed
`_derived.oidcBaseUrl`, `oidcAuthUrl`, `oidcTokenUrl`, `oidcJwksUrl` and `oidcLogoutUrl`. A Vikunja
ExternalSecret should use these rather than assembling URLs itself.

### What the Keycloak operator will and will not overwrite

`apl-keycloak-operator` runs `linode/apl-tasks:main` — an external repo — as a continuously reconciling
Deployment. Whether it would erase hand-added realm objects is the central risk for any SSO work here,
so it was read from source and then tested.

✅ From `linode/apl-tasks/src/operators/keycloak/keycloak.ts`, protocol mappers on the `otomi` client
are created **only when absent**, and never enumerated for deletion:

```ts
if (!allClientClaimMappers.some((el) => el.name === 'email')) { ...create... }
```

✅ `manageGroups` does issue an unconditional `PUT` for every existing group each loop, but the
representation it sends is `{name}` only — `createGroups` in `realm-factory.ts` builds
`defaultsDeep(new GroupRepresentation(), { name })`. Keycloak leaves attributes untouched when the
representation omits `attributes`.

✅ **Tested on the lab, not just inferred.** A custom protocol mapper and a group attribute were added,
`apl-keycloak-operator` was restarted to force a full reconcile (logs confirmed `Updating groups
team-admin` … `Updated Config`), and both survived:

```
=== otomi client mappers after reconcile ===
 - vikunja_groups
 - name
 - sub
 - email
 - aud-mapper-otomi
 - nickname
=== group attribute after reconcile ===
{'vikunja_groups': ['{"name":"platform-admin","oidcID":"kc-platform-admin"}']}
```

Both were removed again afterwards; the realm is back to its original state.

---

## 3. What Vikunja needs

From the [configuration reference](https://vikunja.io/docs/config-options/) and the
[official Helm chart](https://github.com/go-vikunja/helm-chart) v2.2.1 (appVersion 2.5.0):

| Concern | Value |
| --- | --- |
| Image | `vikunja/vikunja` — single container, API and frontend together |
| Port | `3456` |
| Health probe | `GET /api/v1/info` (also reports which OIDC providers are enabled — useful to verify SSO) |
| Config file | `/etc/vikunja/config.yml`, mounted from a ConfigMap |
| Uploads | `/app/vikunja/files`, needs a PVC (or S3 via `files.s3.*`) |
| Pod security | `fsGroup: 1000` |
| Database | PostgreSQL supported — `database.type: postgres`, plus `host`, `user`, `password`, `database`, `sslmode` |

Every key has an environment-variable form (`service.publicurl` → `VIKUNJA_SERVICE_PUBLICURL`), and
environment wins over the config file — so secrets can come from `secretKeyRef` env vars while the rest
stays in a ConfigMap, exactly as `values/gitea/gitea.gotmpl` does with `additionalConfigFromEnvs`.

Settings that matter for a platform install:

- `service.publicurl` — must be `https://vikunja.<domainSuffix>`; required since app version 1.0.0.
- `service.secret` — the JWT signing secret. ⬜ If unset, Vikunja generates a random one **per process
  start**, so every restart logs everyone out and no second replica can validate the first's tokens.
  This must become an `x-secret` in `values-schema.yaml` so the platform generates and stores it.
- `service.enableregistration: false` and `auth.local.enabled: false` — SSO only.
- `keyvalue.type` — defaults to `memory`. ⬜ Multi-replica requires `redis`. `charts/valkey` is already
  vendored and used by Gitea (`gitea-valkey`), so the precedent exists; single replica is fine to start.
- `auth.openid.providers.<key>` — `name`, `authurl`, `clientid`, `clientsecret`, `scope`.

### OIDC specifics

`authurl` takes the **issuer** and performs discovery, so it maps onto `_derived.oidcBaseUrl`
(`https://keycloak.<domain>/realms/otomi`) directly. The redirect URI Vikunja uses is
`https://vikunja.<domain>/auth/openid/<provider-key>` — covered by the `/*` wildcard that `adminApps`
generates, whatever key is chosen.

✅ The `scope` value does not need to request the groups claim. The mapper tested in §2 sits on the
**client**, not on a client scope, so the claim is emitted for every token from that client — it was
observed with `scope=openid` alone. `scope: openid profile email` is sufficient.

---

## 4. Team sync — the one genuinely hard part

Vikunja can create and maintain teams from an OIDC claim ([docs](https://vikunja.io/docs/openid/)), but
it requires a `vikunja_groups` claim shaped as an array of *objects*, not strings:

```json
{ "vikunja_groups": [ { "name": "team 1", "oidcID": 33349,
                        "description": "optional", "isPublic": false } ] }
```

Teams created this way get an `(OIDC)` suffix, are not editable in Vikunja, and are reconciled on every
login: a user missing from the claim is removed from the team, and a team that loses all members is
deleted. A missing `oidcID` produces `The custom scope set by the OIDC provider is malformed`. That
lifecycle matches how APL treats teams, which makes it the right mechanism rather than a workaround.

The platform's existing `groups` claim is a flat list of role-name strings, so it cannot be used as-is.
Vikunja's own docs point at a [third-party Keycloak mapper plugin](https://github.com/makerspace-darmstadt/keycloak-vikunja-mapper)
for this, which would mean building and shipping a custom Keycloak image — an unattractive dependency
for a platform whose Keycloak comes from an upstream chart.

### That plugin is not necessary

✅ Stock Keycloak can emit the required structure. A `oidc-usermodel-attribute-mapper` with
`jsonType.label: JSON`, `multivalued: true` and `aggregate.attrs: true` collects a named attribute from
every group the user belongs to and parses each value as JSON. With a `vikunja_groups` attribute set on
the Keycloak group, the resulting ID token claim is exactly what Vikunja wants.

Mapper on client `otomi`:

```json
{ "name": "vikunja_groups", "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": { "user.attribute": "vikunja_groups", "claim.name": "vikunja_groups",
              "jsonType.label": "JSON", "multivalued": "true", "aggregate.attrs": "true",
              "id.token.claim": "true", "access.token.claim": "true",
              "userinfo.token.claim": "true" } }
```

Attribute on group `team-<id>`:

```json
{ "attributes": { "vikunja_groups": ["{\"name\":\"team-demodevs\",\"oidcID\":\"team-demodevs\"}"] } }
```

Observed ID token — a real JSON array of objects, not strings:

```
groups        : ['offline_access', 'platform-admin', 'default-roles-otomi', 'uma_authorization']
vikunja_groups: [{"name": "platform-admin", "oidcID": "kc-platform-admin"}]
py type       : list
```

Using the team name as `oidcID` keeps it stable and human-readable across rebuilds, which matters
because Vikunja keys team identity on it.

### Who writes those realm objects

The mapper and the group attributes have to be created by something. Three options:

1. **An in-repo Job/CronJob** using the `*jobs` anchor (`helmfile.d/snippets/templates.gotmpl`, documented
   in `docs/development.md` under "Adding maintenance Job or CronJob"). It patches the mapper once and
   sets `vikunja_groups` on each `team-*` group. Entirely within this fork, and §2 proves the result
   survives reconciliation.
2. **Upstream `apl-tasks`.** The correct long-term home — the Keycloak operator already owns groups and
   mappers — but it is a second repo, a second release cycle, and outside this fork's control.
3. **Skip the claim; sync via Vikunja's API.** Mirrors `apl-gitea-operator`, which reconciles platform
   teams into Gitea orgs/teams (`src/operators/gitea/lib/managers/gitea-teams.ts` in `apl-tasks`). Most
   faithful to existing platform patterns, but it is a whole new operator, and it fights Vikunja's own
   OIDC team lifecycle rather than using it.

**Recommendation: option 1**, with option 2 as the upstream follow-up. It is the smallest change that
is verified to work, it keeps everything in one repo and one release, and it uses Vikunja's supported
mechanism instead of reimplementing it.

> **This whole section is conditional.** It describes the *claim-driven* path. §6 shows that
> claim-driven and API-driven team management are mutually exclusive, and recommends API-driven —
> which means not emitting this claim at all. Read §6 before implementing any of the above. What
> survives regardless is the proof that stock Keycloak can express the claim without a custom plugin,
> which is what makes claim-driven a viable fallback.

---

## 5. Console presence: tile, logo and link

The Console is a React app (`linode/apl-console`, public, Apache-2.0) driven entirely by data the API
serves from `core.yaml` and `apps.yaml`. ✅ Reading `src/utils/data.ts` shows there is **no allow-list
of known apps anywhere** — every property of a tile is derived from the app's name:

```ts
// getApps — which tiles a viewer sees
return (teamId === 'admin' ? adminApps : adminApps.filter((app) => app.isShared).concat(teamApps))
         .filter((app) => !app.hide)

// getAppData — what each tile renders
const hostSuffix = `${!(isShared || teamId === 'admin') ? `-${teamId}` : ''}`
const baseUrl    = `https://${useHost || appId}${hostSuffix}.${cluster.domainSuffix}`
logo:        `${coreAppId}_logo.svg`,
appInfo:     appsInfo[coreAppId],
externalUrl: ownHost || useHost ? `${baseUrl}${path ? rePlace(path, teamId) : '/'}` : undefined,
schema:      spec.components.schemas[modelName] ? ... : {},
```

Three consequences, all of which are what we want:

- ✅ **`isShared: true` puts the app in every team's list too**, not just `/apps/admin` — that is exactly
  what the `adminApps.filter((app) => app.isShared)` branch does. One `adminApps` entry covers both.
- ✅ **`isShared: true` suppresses the team suffix**, so every team's tile links to the same
  `https://vikunja.<domainSuffix>/` instance. That is the correct behavior for a singleton. (Dropping
  `isShared` would instead produce per-team hostnames `vikunja-<team>.<domain>` — a different,
  multi-instance design.)
- ✅ **An unknown app does not crash the Console.** The API schema lookup falls back to `{}`. Title,
  description and links come from `appsInfo[<name>]` in `apps.yaml`.

### The logo is solvable from this repo

`logo` resolves to `/logos/vikunja_logo.svg`, served as a static file. The earlier assumption that this
could only be fixed upstream was wrong on two counts:

- ✅ `charts/otomi-console/` is **first-party in this repo** — it is not in `charts/dependencies.yaml`
  and is a `helm create` scaffold. It already exposes an `extraManifests` escape hatch
  (`templates/extra-manifests.yaml`).
- ✅ The logo directory is writable and nginx serves whatever is in it. Tested by writing a file into
  the running Console pod and fetching it back:

```
$ kubectl -n otomi exec $POD -- sh -c 'echo "<svg/>" > /app/build/logos/vikunja_logo.svg'
WROTE_OK
$ kubectl -n otomi exec $POD -- wget -qO- http://127.0.0.1:8080/logos/vikunja_logo.svg
<svg/>
```

(The test file was removed afterwards; the directory is back to its original 35 entries.)

So the fix is entirely in-repo: add `extraVolumes` / `extraVolumeMounts` to
`charts/otomi-console/templates/deployment.yaml` (which currently has neither), ship the SVG as a
ConfigMap through `extraManifests` in `values/otomi-console/otomi-console.gotmpl`, and mount it with
`subPath: vikunja_logo.svg` at `/app/build/logos/vikunja_logo.svg`. A `subPath` mount places one file
into an existing directory without hiding its siblings — which is why the other 35 logos survive.

⬜ `subPath` mounts do not receive ConfigMap updates without a pod restart. Irrelevant for a static
logo, but worth knowing if this mechanism is reused for anything that changes.

Upstreaming `vikunja_logo.svg` into `linode/apl-console/public/logos/` remains the tidier long-term
fix, and this fork can carry the mount until then.

### ⚠ `apl-api` has a hard-coded app allow-list — this repo alone is not enough

The Console has no allow-list. **`apl-api` does**, and it is the one that decides whether a tile exists
at all. This was found the hard way: the live test below produced a correct-looking API payload and
still showed nothing in the browser.

✅ A `vikunja` entry was injected into the `otomi-api-core` ConfigMap and the API restarted. It came
back `2/2 Running` with no config error, and `GET /v1/session` served the new app alongside the other
25:

```json
{"isShared": true, "name": "vikunja", "ownHost": true, "tags": ["productivity", "tasks"]}
```

✅ But no tile appeared, because **the tile list is a different API call.** In
`apl-console/src/components/Apps.tsx` the app list arrives as a prop (`apps: GetAppsApiResponse`);
`session.core.adminApps` only supplies per-app metadata (`ownHost`, `isShared`, `path`). `GET /v1/apps`
returned 21 apps with no `vikunja` among them, and the reason is in the API image:

```js
// /app/dist/src/app.js
const getAppList = () => {
    const appsSchema = getSpec().spec.components.schemas['AppList']
    return appsSchema.enum          // <- a hand-maintained enum, baked into the image
}
```

✅ That enum is authored in `linode/apl-api/src/openapi/app.yaml` and lists exactly those 21 names
(`alertmanager … trivy`). An app absent from it can never appear in `/v1/apps`, so it can never get a
tile, however complete its `core.yaml`, `apps.yaml` and values entries are.

**Consequence: `apl-api` must be forked and rebuilt.** Three changes there:

1. add `vikunja` to `AppList.enum` in `src/openapi/app.yaml`;
2. re-run `npm run schema:sync`, which copies `values-schema.yaml` from `apl-core` into
   `src/values-schema.yaml` — the API bakes its own snapshot of our schema (`copyup … src/values-schema.yaml
   dist/src` in the `build` script), so a schema change here does not reach it otherwise;
3. publish the image and point `versions.yaml: api` at it.

✅ `apl-console` does **not** need forking for this. `src/common/api-spec.ts` holds the spec in a
mutable module variable populated by `setSpec()` at runtime, and the API serves it (`/v1/spec` responds
`401`, not `404`), so the Console picks up whatever the API knows. The only Console-side gap is the
logo file, and that is solved by the mount above.

This also revises §1: the file inventory covers what `apl-core` owns, but a genuinely first-party app
spans two repos. `apl-tasks` is optional (§2 shows the redirect URI comes from here); **`apl-api` is
not.**

⚠ **Argo CD self-heals these ConfigMaps.** `otomi-otomi-api` has `syncPolicy.automated.selfHeal: true`,
so a patched ConfigMap is reverted within seconds — the first attempt at this test silently restarted
the API against the *original* config and proved nothing. Auto-sync must be suspended for the duration
of any live-patch experiment on a platform manifest. This does not apply to the §2 realm test: Keycloak
objects are rows in Keycloak's database, not manifests Argo tracks, which is why those survived.

---

## 6. Propagating teams and users

This is what actually makes an app first-party, and it deserves more than the one line the first draft
gave it.

**Scope.** Teams and their membership, and nothing else. APL has no project concept — it was considered
and ruled out, so Vikunja projects are left entirely to users inside Vikunja. The project endpoints are
listed below only because a team is worthless until something can be shared with it, and whoever
implements this will want to know the sharing call exists.

### How Gitea receives Console changes today

✅ There are no APL CRDs in the cluster (`kubectl get crd` returns nothing matching `apl`/`otomi`) — the
`kind: AplApp` fixtures are a values-repo file format, not Kubernetes resources. The propagation chain
is instead:

```
Console → apl-api writes the values repo → Argo CD / apl-operator re-render
        → ConfigMap apl-gitea-operator-cm changes
        → operator's Kubernetes watch fires  → pushes to Gitea's REST API
```

`linode/apl-tasks/src/operators/gitea/gitea.ts` watches exactly two objects in its own namespace:

```ts
if (object.kind === 'Secret'    && metadata.name === 'apl-gitea-operator-secret') { ... }
else if (object.kind === 'ConfigMap' && metadata.name === 'apl-gitea-operator-cm') { ... }
```

and reconciles through managers for organizations, teams, users, repositories, OIDC and webhooks. ✅
The ConfigMap it watches is generated **in this repo**, by
`values/apl-gitea-operator/apl-gitea-operator-raw.gotmpl`, and carries `teamConfig` as JSON. Adding a
team in the Console changes that JSON, which is what triggers the sync.

So "first-party propagation" means: *render the team list into a ConfigMap from this repo, and have
something watch it and push to the app's API.* The first half is entirely ours. Only the watcher needs
a home.

### Where the watcher can live

`helmfile.d/snippets/templates.gotmpl` has a `*jobs` anchor whose presync hook (`bin/job-presync.sh`)
runs with policy `OnSpecChange` — it diffs the rendered release and destroys the old Job so it re-runs
only when the spec actually changed. That is a values-change trigger without writing an operator, and
✅ nothing currently uses it (`values/jobs/` contains only `scripts`), so it is free to take.

| Option | Trigger | Lives in | Cost |
| --- | --- | --- | --- |
| `*jobs` Job, `OnSpecChange` | re-render of the values repo | this fork | low — a script and a chart values file |
| New `apl-vikunja-operator` | Kubernetes watch, like Gitea's | `apl-tasks` (or a fork) | high — new image, new release cycle |

**Recommendation: the `*jobs` Job.** It reacts to the same signal as the Gitea operator (a values
change), it is idempotent by construction, and it stays in one repo. Promote it to a real operator only
if sub-minute propagation or event-level granularity turns out to matter.

### What Vikunja's API supports

✅ From the OpenAPI spec (`/api/v1/docs.json`, 126 paths), everything needed exists:

| Need | Endpoint | In scope |
| --- | --- | --- |
| Create team | `PUT /teams` | yes |
| Add / remove member | `PUT /teams/{id}/members`, `DELETE /teams/{id}/members/{username}` | yes |
| Promote to team admin | `POST /teams/{id}/members/{userID}/admin` | yes |
| Disable / delete user | `PATCH /admin/users/{id}/status`, `DELETE /admin/users/{id}` | deprovisioning only |
| Create user | `POST /admin/users` | no — see the trap below |
| Create project | `PUT /projects` | no — users do this themselves |
| Share project with team | `PUT /projects/{id}/teams`, `POST /projects/{projectID}/teams/{teamID}` | no — reference only |

Permissions on a project↔team relation are `0` read, `1` read & write, `2` admin (`models.TeamProject`).
Authentication is a bearer API token, or a JWT from `POST /login`.

### The decision this forces: claim-driven or API-driven

These two mechanisms **conflict, and you must pick one**. Vikunja marks teams created from the OIDC
claim as not editable — so membership cannot also be managed through the API — while teams created via
the API are editable but are not linked to the claim.

- **Claim-driven** (§4). Zero moving parts and already verified end-to-end at the Keycloak end. But it
  is *pull-on-login*, not push: a team appears only when one of its members first signs in, and a
  Console change is invisible until then.
- **API-driven.** A sync Job creates teams and memberships eagerly, the moment the values change —
  exactly the Gitea behavior, and exactly what "pushed to Vikunja like a first-party app" asks for.
  Requires *not* emitting the `vikunja_groups` claim.

**Recommendation: API-driven**, because it is what the requirement actually describes. Keep §4 in the
back pocket — it is the fallback if the sync Job proves troublesome, and it is worth keeping the
research because it independently proves stock Keycloak can express the claim without a custom plugin.

⬜ A possible hybrid deserves a test before the design is fixed: `models.Team.external_id` — "the team's
external id provided by the openid or ldap provider" — is not marked read-only in the spec. If
`PUT /teams` honours it on create, a Job could create teams *pre-linked* to the OIDC identity, getting
eager creation and claim-based membership together. The spec's `readOnly` flags look unreliable
(`created` is documented as immutable yet carries no `readOnly`), so this must be tested against a real
instance rather than believed.

### The user-provisioning trap

⚠ `POST /admin/users` creates a **local** account. An OIDC login creates a *separate* identity. Whether
a pre-created local user is adopted by a later OIDC login with the same username, or shadowed by a
duplicate, is ⬜ untested — and this repo already treats that exact hazard as real elsewhere:
`values/gitea/gitea.gotmpl:78` sets `ACCOUNT_LINKING: disabled` with the comment *"so that when a user
with the same username is created in gitea, it will not be linked to another account"*.

Recommended default: **do not pre-create users.** Vikunja auto-registers them on first OIDC login, which
is how Gitea is configured here too (`ENABLE_AUTO_REGISTRATION: true`,
`ALLOW_ONLY_EXTERNAL_REGISTRATION: true`). Reserve `/admin/users` for *deprovisioning* — `PATCH
/admin/users/{id}/status` when a user leaves the platform — which has no such ambiguity. If eager
creation is required, test the linking behavior first.

---

## 7. Proposed shape

### Chart: write one, do not vendor

The official chart is a thin wrapper over the [bjw-s common library](https://github.com/bjw-s/helm-charts)
and assumes an nginx `Ingress`. The platform needs a Gateway API `HTTPRoute`, an Istio `ServiceEntry`, a
CNPG database and the platform's security context — so a vendored copy would be mostly overridden. A
first-party chart modelled on `charts/git-server/` (`Chart.yaml`, `values.yaml`, and templates for
`deployment`, `service`, `httproute`, `pvc`, `_helpers.tpl`) is the better fit and matches existing
precedent for small in-repo apps.

Mine the official chart for the details worth copying rather than rediscovering: port `3456`, probe
`/api/v1/info`, `fsGroup: 1000`, config mounted at `/etc/vikunja/config.yml` via `subPath`.

### Follow Harbor, not Gitea

Harbor is the closest structural precedent: a shared app with its own host, its own CNPG database, no
bespoke operator. Its releases live in `helmfile-70.shared.yaml.gotmpl` with the database in
`helmfile-03.databases.yaml.gotmpl`. Gitea's placement in `helmfile-03.init` reflects it being needed
during bootstrap, which Vikunja is not.

```gotmpl
# helmfile.d/helmfile-70.shared.yaml.gotmpl
  - name: vikunja-artifacts
    installed: {{ $a | get "vikunja.enabled" }}
    namespace: vikunja
    labels: {pkg: vikunja}
    <<: *raw
  - name: vikunja
    installed: {{ $a | get "vikunja.enabled" }}
    namespace: vikunja
    labels: {pkg: vikunja}
    <<: *default

# helmfile.d/helmfile-03.databases.yaml.gotmpl
  - name: vikunja-db-secret-artifacts   # ExternalSecret, basic-auth type
  - name: vikunja-otomi-db              # <<: *otomiDb
```

### Schema and defaults

`definitions.apps.properties.vikunja`, following `apps.gitea` in `values-schema.yaml`:

```yaml
vikunja:
  properties:
    _rawValues: { $ref: '#/definitions/rawValues' }
    enabled: { type: boolean }
    jwtSecret:
      type: string
      x-secret: '{{ randAlphaNum 32 }}'
      description: This secret was generated and cannot be changed without logging out every user.
      readOnly: true
    postgresqlPassword:
      type: string
      x-secret: '{{ randAlphaNum 20 }}'
      readOnly: true
    resources: { properties: { vikunja: { $ref: '#/definitions/resources' } } }
    networkPolicies: { $ref: '#/definitions/appNetworkPolicyConfig' }
```

`x-secret` is what makes the platform generate a value and seal it into `apl-secrets` as
`vikunja-secrets`; the app then reads it back through an ExternalSecret against `core-secrets-store`,
the pattern `values/gitea/gitea-raw.gotmpl` uses. ⬜ `src/common/values-schema.test.ts` asserts that a
platform-generated `x-secret` is never also `required` — keep both fields out of any `required` list.

### `core.yaml`

```yaml
k8s.namespaces:
  - name: vikunja

adminApps:
  - name: vikunja
    tags: [productivity, tasks]
    isShared: true
    ownHost: true
```

`isShared: true` marks it as one instance serving all teams rather than per-team; `ownHost: true` gives
it `vikunja.<domainSuffix>` and, per §2, its OIDC redirect URI. It belongs in `adminApps`, not
`teamApps` — `teamApps` entries generate a *per-team hostname* (`vikunja-<team>.<domain>`), which is the
opposite of a singleton.

### Network policies — optional

`values/apl-network-policies/apl-network-policies.gotmpl` covers only `git-server`, `gitea` and
`otomi-api`; Harbor and Argo CD have none. Parity does not require one. If added, it needs both a flag
there and a template in `charts/apl-network-policies/templates/networkpolicies/`.

---

## 8. Known gaps and risks

- ⬜ **No end-to-end proof of anything Vikunja-side.** No Vikunja has been deployed. The claim structure
  is verified at the Keycloak end only; the API surface is read from the OpenAPI spec, not exercised.
  The three things to test first, in order: does Vikunja accept the `vikunja_groups` claim; does
  `PUT /teams` honour `external_id`; does an OIDC login adopt or shadow a pre-created local user.
- ✅ **The Console tile needs an `apl-api` fork.** Settled by §5: `AppList.enum` in `apl-api` gates
  `/v1/apps`, which is what the tile list is built from. Confirmed in the browser — a `core.yaml`-only
  patch renders nothing. Treat "add an app" as a two-repo change from the start.
- ⬜ **The tile has still never been seen rendered**, because that needs the forked API image. Once one
  exists, the §9 test becomes the real end-to-end check.
- ✅ **Projects are deliberately out of scope.** APL has no project concept — the Console's routes are
  `/apps/admin`, `/teams`, `/teams/create`, `/users`, `/workloads`, `/services` and `/settings/*`, and
  `projects` appears nowhere in `values-schema.yaml`. Vikunja projects stay a user-facing concern. Do
  not add a project sync later without revisiting §6's team model first: project sharing targets a team
  id, so it inherits whichever of the two team mechanisms is chosen.
- ✅ **A latent upstream bug, noted in passing.** `keycloak.ts:547` finds the client with
  `allClients.find((el) => el.name === client.name)`, but the live `otomi` client has no `name` field
  (`name: None`). Matching `undefined === undefined` will select the first nameless client in the realm,
  which is not necessarily `otomi`. It has not caused visible harm here and is out of scope, but it is
  worth knowing before relying on that reconcile path.
- ⬜ **`versions.yaml` does not apply.** Vikunja's version is pinned by the chart's `appVersion` and the
  image tag in `values/vikunja/vikunja.gotmpl`, not by `versions.yaml`, which tracks the `apl-*` images.
  See `UPGRADE.md` for why several of those float on `main`.

---

## 9. Reproducing the findings

Set up admin access to the realm:

```bash
KC=https://keycloak.$(yq '.cluster.domainSuffix' values.yaml)
KCP=$(kubectl --context kind-apl -n keycloak get secret keycloak-initial-admin \
        -o jsonpath='{.data.password}' | base64 -d)
TOKEN=$(curl -sk -X POST "$KC/realms/master/protocol/openid-connect/token" \
  -d client_id=admin-cli -d username=otomi-admin -d "password=$KCP" \
  -d grant_type=password | jq -r .access_token)
```

Confirm the single-client model and that redirect URIs track `core.yaml`:

```bash
curl -sk -H "Authorization: Bearer $TOKEN" "$KC/admin/realms/otomi/clients" \
  | jq -r '.[] | select(.clientId=="otomi") | .redirectUris[]' | sort
```

Add the mapper and a group attribute, then read a real token back. `directAccessGrantsEnabled` is true
on the `otomi` client, so a password grant works for inspection:

```bash
GID=$(curl -sk -H "Authorization: Bearer $TOKEN" "$KC/admin/realms/otomi/groups" \
        | jq -r '.[] | select(.name=="team-demodevs") | .id')

curl -sk -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  "$KC/admin/realms/otomi/groups/$GID" \
  -d '{"name":"team-demodevs","attributes":{"vikunja_groups":["{\"name\":\"team-demodevs\",\"oidcID\":\"team-demodevs\"}"]}}'

curl -sk -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  "$KC/admin/realms/otomi/clients/otomi/protocol-mappers/models" \
  -d '{"name":"vikunja_groups","protocol":"openid-connect",
       "protocolMapper":"oidc-usermodel-attribute-mapper",
       "config":{"user.attribute":"vikunja_groups","claim.name":"vikunja_groups",
                 "jsonType.label":"JSON","multivalued":"true","aggregate.attrs":"true",
                 "id.token.claim":"true","access.token.claim":"true",
                 "userinfo.token.claim":"true"}}'

CS=$(curl -sk -H "Authorization: Bearer $TOKEN" \
       "$KC/admin/realms/otomi/clients/otomi/client-secret" | jq -r .value)
curl -sk -X POST "$KC/realms/otomi/protocol/openid-connect/token" \
  -d client_id=otomi -d "client_secret=$CS" -d grant_type=password -d scope=openid \
  -d "username=<a-team-member>" -d "password=<their-password>" \
  | jq -r .id_token | cut -d. -f2 | base64 -d 2>/dev/null | jq .vikunja_groups
```

Read the client secret from the admin API as shown. The value in the `otomi-generated-passwords` secret
did **not** authenticate against the realm — using it returns `unauthorized_client`.

Prove survival by forcing a full reconcile, then re-reading both objects:

```bash
kubectl --context kind-apl -n apl-keycloak-operator rollout restart deploy/apl-keycloak-operator
kubectl --context kind-apl -n apl-keycloak-operator rollout status \
  deploy/apl-keycloak-operator --timeout=110s
kubectl --context kind-apl -n apl-keycloak-operator logs deploy/apl-keycloak-operator \
  --tail=200 | grep -E 'Updating groups|Updated Config'
```

Clean up afterwards — `DELETE` the mapper by its id and `PUT` the group back with `"attributes":{}`.

### The Console tile test (§5)

The cheapest way to confirm a brand-new app is accepted, needing no chart work. It injects a `vikunja`
entry into the config the API already serves, without touching the values repo. **Suspend auto-sync
first** or Argo CD reverts the ConfigMap before the new pod mounts it:

```bash
kubectl --context kind-apl -n otomi get cm otomi-api-core \
  -o jsonpath='{.data.core\.yaml}' > core-live.yaml
# add a `- name: vikunja / isShared: true / ownHost: true` item under adminApps:
# and a `vikunja:` block with title/about under appsInfo:

kubectl --context kind-apl -n argocd patch application otomi-otomi-api \
  --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
kubectl --context kind-apl -n otomi create configmap otomi-api-core \
  --from-file=core.yaml=core-patched.yaml --dry-run=client -o yaml \
  | kubectl --context kind-apl -n otomi apply -f -
kubectl --context kind-apl -n otomi rollout restart deploy/otomi-api
kubectl --context kind-apl -n otomi rollout status deploy/otomi-api --timeout=110s
```

Check the served payload directly — this is what the Console renders from, so it is the real assertion.
The `otomi` client has `directAccessGrantsEnabled`, so a password grant yields a usable bearer token
(see the §2 snippet for fetching the client secret):

```bash
curl -sk -H "Authorization: Bearer $ID_TOKEN" \
  "https://api.<domainSuffix>/v1/session" \
  | jq '.core.adminApps[] | select(.name=="vikunja")'
```

⚠ On a stock `apl-api` image this returns nothing and `/apps/admin` shows no tile, because `vikunja` is
not in `AppList.enum` — see §5. The check that matters is therefore:

```bash
curl -sk -H "Authorization: Bearer $ID_TOKEN" \
  "https://api.<domainSuffix>/v1/apps" | jq '.[] | select(.id=="vikunja")'
```

Empty means the API image still lacks the enum entry, and no amount of `core.yaml` patching will help.
Once a forked API image is in place, open `https://console.<domainSuffix>/apps/admin`: the tile appears,
its title and description come from `appsInfo`, and it links to `https://vikunja.<domainSuffix>/`. A
broken logo and a 404 on the link are both expected at that point — nothing is deployed behind that
hostname and the §5 mount is not built yet.

Restore auto-sync when done; Argo then reverts the ConfigMap for you:

```bash
kubectl --context kind-apl -n argocd patch application otomi-otomi-api --type merge \
  -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
kubectl --context kind-apl -n otomi rollout restart deploy/otomi-api
```

Per `CLAUDE.md`, every command above is bounded or backgrounded, and nothing is piped before its exit
code has been checked.
