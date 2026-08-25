# Vikunja integration plan

Plan for adding [Vikunja](https://github.com/go-vikunja/vikunja) to the platform at the same level as
Gitea, Harbor and Argo CD: one shared instance, its own host, Keycloak SSO, a Console tile, and platform
teams pushed into Vikunja teams.

This file is fork-only and is not intended for upstream. It is written to be picked up in a fresh
session with no prior context.

## The ground rule

**Every mechanism must already exist for another app. The content may be Vikunja-specific.**

The test is on the *mechanism*, not the code. A script modelled on one that serves a different tool but
written for Vikunja is fine — expected, even. A script with no counterpart anywhere in the platform is
not: that is where Vikunja becomes the odd one out and the next person has nothing to reason from.

So every decision below is anchored to a file that already does the same job for another app. If you
cannot name that file, stop — either you have missed the precedent, or you are inventing one. Appendix
B lists approaches rejected on exactly this test; do not re-derive them.

| What you need | Copy from |
| --- | --- |
| Vendoring an upstream chart | `charts/gitea/` + entry in `charts/dependencies.yaml` |
| HTTPRoute + ServiceEntry | `values/gitea/gitea.gotmpl` `extraDeploy:` (line 242) |
| CNPG database | `values/gitea/gitea-otomi-db.gotmpl` + `values/gitea-db-secret/` |
| Admin credential into the app | `values/harbor/harbor-raw.gotmpl` (ExternalSecret → env) |
| A team-sync operator | `charts/apl-gitea-operator/` + `values/apl-gitea-operator/` |
| Operator's config channel | `apl-gitea-operator-cm` ConfigMap carrying `teamConfig` JSON |
| Running an app's own CLI in-cluster | `values/gitea/gitea-raw.gotmpl:111-201` (SA + Role + `kubectl exec`) |
| App settings + generated secrets | `definitions.apps.gitea` in `values-schema.yaml` |
| Console tile | `core.yaml` `adminApps[]` + `apps.yaml` `appsInfo` |
| Console logo | `apl-console/public/logos/<name>_logo.svg` |

Status legend used throughout: ✅ verified on the lab or read from source · ⬜ not yet verified.

---

## Scope

**In:** deploying Vikunja, SSO login, the Console tile, and syncing platform teams and their membership
into Vikunja.

**Out:** projects (APL has no project concept — confirmed, the Console's routes are `/apps/admin`,
`/teams`, `/users`, `/workloads`, `/services`, `/settings/*`). Vikunja projects stay a user-facing
concern. User *de*provisioning is also out — see Phase 3.

## Four repos

✅ This is a multi-repo change. Discovering that late is what made the first pass wrong, so treat it as
given:

| Repo | Why | Blocking? |
| --- | --- | --- |
| `apl-api` | Hard-coded `AppList` enum gates whether the app can exist at all | **yes — do first** |
| `apl-core` | The app: chart, values, schema, database, routing, Console wiring | yes |
| `apl-console` | The logo file | no — cosmetic |
| `apl-tasks` | The team-sync operator | only for Phase 3 |

---

## Phase 0 — `apl-api`: let the app exist

Nothing in any other phase is visible until this lands.

✅ `GET /v1/apps` is what the Console builds its tile list from, and it is derived from a hand-maintained
enum baked into the API image:

```js
// apl-api, dist/src/app.js
const getAppList = () => getSpec().spec.components.schemas['AppList'].enum
```

1. Fork `linode/apl-api`.
2. Add `vikunja` to `AppList.enum` in `src/openapi/app.yaml`. It currently lists 21 names,
   `alertmanager … trivy`, in no particular order.
3. Run `npm run schema:sync` — it copies `values-schema.yaml` from a sibling `apl-core` checkout into
   `src/values-schema.yaml`, which the build bakes into the image. Do this **after** Phase 1's schema
   change, or the app's settings schema will be missing.
4. Build, publish, and point `versions.yaml: api` at the new tag.

⚠ Per `UPGRADE.md`, `versions.yaml` entries that float on `main` are already a known hazard. Pin this
one to an immutable tag and record it there.

---

## Phase 1 — `apl-core`: deploy the app

Mirrors Harbor: a shared app, own host, own CNPG database, no bootstrap-time dependency.

### 1.1 Chart — vendor, do not write

Add to `charts/dependencies.yaml`:

```yaml
  - name: vikunja
    version: 2.2.1
    repository: <the chart repo for go-vikunja/helm-chart>
```

Then vendor it into `charts/vikunja/`, including its `common` subchart from bjw-s — exactly as
`charts/gitea/charts/` vendors `postgresql`, `valkey` and friends.

⬜ Resolve the chart's repository URL first. The chart lives at `github.com/go-vikunja/helm-chart`
(v2.2.1, appVersion 2.5.0) and publishes to Artifact Hub as `vikunja/vikunja`, but `vikunja.io/charts`
404s, so the actual `helm repo add` URL is unconfirmed.

### 1.2 Values — `values/vikunja/vikunja.gotmpl`

Model on `values/gitea/gitea.gotmpl`. The chart is a bjw-s `common` wrapper, so its value names differ
from Gitea's, but the *shape* is the same: config from `.Values`, secrets via `secretKeyRef` env, extra
manifests appended at the end.

✅ Facts about the container, taken from the chart's `templates/vikunja.yaml`:

| Concern | Value |
| --- | --- |
| Image | `vikunja/vikunja` — API and frontend in one container |
| Port | `3456` |
| Probe | `GET /api/v1/info` — also reports which OIDC providers are live |
| Config | `/etc/vikunja/config.yml` from a ConfigMap |
| Uploads | `/app/vikunja/files` — needs a PVC |
| Pod security | `fsGroup: 1000` |

Config to set ([reference](https://vikunja.io/docs/config-options/) — every key also has a
`VIKUNJA_SECTION_KEY` env form, and env wins over the file):

- `service.publicurl` — `https://vikunja.<domainSuffix>`; required since app version 1.0.0
- `service.secret` — JWT signing key. ⬜ If unset it is regenerated **per process start**, logging
  everyone out on restart. Must come from an `x-secret` (1.4).
- `service.enableregistration: false`
- `auth.local.enabled: **true**` — counter-intuitive but correct; see 1.5
- `database.*` — `type: postgres`, host `vikunja-db-rw.vikunja.svc.cluster.local:5432`
- `auth.openid.providers.<key>` — `authurl` is `_derived.oidcBaseUrl`, which does discovery;
  `clientid` is `_derived.oidcClientID`; `scope: openid profile email`
- `keyvalue.type` — leave `memory` at one replica. ⬜ Multiple replicas need `redis`;
  `charts/valkey` is already vendored and `gitea-valkey` shows the pattern.

Append the HTTPRoute and ServiceEntry through the chart's `additionalObjects:` value, which is this
chart's equivalent of Gitea's `extraDeploy:`. Copy both blocks from `values/gitea/gitea.gotmpl:242-264`
verbatim, changing name, hostname and backend port to `3456`.

### 1.3 Database

Two releases, copied from Gitea:

- `values/vikunja/vikunja-otomi-db.gotmpl` ← `values/gitea/gitea-otomi-db.gotmpl`
- `values/vikunja-db-secret/vikunja-db-secret-raw.gotmpl` ← `values/gitea-db-secret/`

Add `databases.vikunja` defaults and schema alongside `databases.gitea`.

### 1.4 Schema and defaults

`definitions.apps.properties.vikunja` in `values-schema.yaml`, following `apps.gitea`:

```yaml
vikunja:
  properties:
    _rawValues: { $ref: '#/definitions/rawValues' }
    enabled: { type: boolean }
    adminUsername: { type: string, default: otomi-admin }
    adminPassword: { type: string, x-secret: '{{ randAlphaNum 20 }}' }
    jwtSecret:
      type: string
      x-secret: '{{ randAlphaNum 32 }}'
      description: This secret was generated and cannot be changed without logging out every user.
      readOnly: true
    postgresqlPassword:
      type: string
      description: This password was generated and cannot be changed without manual intervention.
      x-secret: '{{ randAlphaNum 20 }}'
      readOnly: true
    resources: { properties: { vikunja: { $ref: '#/definitions/resources' } } }
    networkPolicies: { $ref: '#/definitions/appNetworkPolicyConfig' }
```

`x-secret` is what makes the platform generate the value and seal it into `apl-secrets` as
`vikunja-secrets`; the app reads it back through an ExternalSecret against `core-secrets-store`.

⬜ `src/common/values-schema.test.ts` asserts a platform-generated `x-secret` is never also `required`.
Keep these out of any `required` list.

Matching defaults go in `helmfile.d/snippets/defaults.yaml` under `apps.vikunja`, next to `apps.gitea`.

Network policies are **optional** — only `git-server`, `gitea` and `otomi-api` have them; Harbor and
Argo CD do not. Skip unless asked.

### 1.5 The admin credential

✅ Every integrated app solves this identically: **the local admin account stays enabled for machines,
SSO is for humans, and the password is a platform-generated `x-secret`.**

| App | Credential | How it reaches the app |
| --- | --- | --- |
| Gitea | `adminUsername` + `adminPassword` | chart's `gitea.admin.existingSecret` |
| Harbor | `adminPassword` | `HARBOR_ADMIN_PASSWORD` env from an ExternalSecret |
| Keycloak | `adminUsername` + `adminPassword` | chart admin secret |
| Argo CD | local admin | `configs.cm."admin.enabled": "true"`, kept on *alongside* SSO |

Argo CD is the clearest statement of the principle. Disabling local auth entirely is not the house
style, which is why 1.2 keeps `auth.local.enabled: true`.

Create the ExternalSecret in `values/vikunja/vikunja-raw.gotmpl`, copying
`values/harbor/harbor-raw.gotmpl`.

Vikunja has no first-run admin bootstrap and no chart hook like Gitea's `admin.existingSecret`, so the
account only exists once someone runs its CLI:

```bash
/app/vikunja/vikunja user create -u "$ADMIN_USER" -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD"
```

✅ **There is a precedent for exactly this shape** — `values/gitea/gitea-raw.gotmpl:111-201` runs
Gitea's own CLI inside the running pod from a Kubernetes workload:

```yaml
- kind: ServiceAccount        # gitea-backup
- kind: Role                  # pods/exec: create, pods: get/list, deployments: get
- kind: RoleBinding
- kind: CronJob               # image registry.k8s.io/kubectl
    command: [kubectl, exec, deployments/gitea, '--', /bin/sh, -ec, '... gitea dump ...']
```

Copy that structure into `values/vikunja/vikunja-raw.gotmpl`, as a `Job` rather than a `CronJob`, execing
`vikunja user create` with the credentials from the ExternalSecret. Same four objects, same kubectl
image, Vikunja-specific command.

The job must be idempotent — creating an existing user must not be fatal (Appendix C.3).

⬜ The `*jobs` anchor in `helmfile.d/snippets/templates.gotmpl` is the other candidate, and
`docs/development.md` documents it for "configuration that cannot be expressed declaratively". Prefer
the Gitea-style exec Job: the anchor is currently unused (`values/jobs/` holds only `scripts`), so it
has documentation but no working example to copy. Reach for it only if you need its `OnSpecChange`
re-run semantics, which this bootstrap does not.

### 1.6 Releases

Follow Harbor's placement, not Gitea's — Gitea sits in `helmfile-03.init` because bootstrap depends on
it, which Vikunja does not.

```gotmpl
# helmfile.d/helmfile-70.shared.yaml.gotmpl
  - name: vikunja-artifacts        # <<: *raw
  - name: vikunja                  # <<: *default

# helmfile.d/helmfile-03.databases.yaml.gotmpl
  - name: vikunja-db-secret-artifacts   # <<: *raw
  - name: vikunja-otomi-db              # <<: *otomiDb
```

The anchors derive chart and values paths from the release name, so names must match exactly.

### 1.7 Fixtures

`tests/fixtures/env/apps/vikunja.yaml` and `tests/fixtures/env/databases/vikunja.yaml`. ✅ **Copy an
existing fixture** — the current format is CRD-shaped (`kind: AplApp`, `metadata.name`, `spec:`) and
`src/dev/bootstrapCoreApp.ts` still emits the older `apps.<name>: {enabled: true}` shape.

---

## Phase 2 — Console presence

### 2.1 `apl-core`

`core.yaml` — two namespaces and the app entry:

```yaml
k8s.namespaces:
  - name: vikunja
  - name: apl-vikunja-operator
    disableIstioInjection: true

adminApps:
  - name: vikunja
    tags: [productivity, tasks]
    isShared: true
    ownHost: true
```

✅ This one entry does three jobs. It registers `https://vikunja.<domain>/*` as an OIDC redirect URI
(`values/apl-keycloak-operator/apl-keycloak-operator-raw.gotmpl:22-33` generates the list from
`adminApps` where `ownHost` is true — no `apl-tasks` change needed). It puts the app on `/apps/admin`
**and** in every team's list, via `adminApps.filter(app => app.isShared)` in the Console. And
`isShared` suppresses the per-team hostname suffix, so every team links to the one instance.

Then `apps.yaml` — an `appsInfo.vikunja` block with title, appVersion, repo, license, about and
integration text, copied in shape from `appsInfo.gitea`.

### 2.2 `apl-console`

Fork and add `public/logos/vikunja_logo.svg`. ✅ The Console builds the path as
`/logos/${appId}_logo.svg` with no lookup table, so the filename must match the app name exactly. There
are 35 logos there now.

Do **not** mount the logo in from `apl-core` — see Appendix B.

---

## Phase 3 — `apl-tasks`: the team-sync operator

✅ Every team sync in this platform is an operator in `apl-tasks` that watches a ConfigMap generated by
`apl-core` and pushes to the app's REST API. The chain:

```
Console → apl-api writes the values repo → Argo CD / apl-operator re-render
        → ConfigMap apl-vikunja-operator-cm changes → operator's watch fires → Vikunja API
```

### 3.1 In `apl-core`

- `charts/apl-vikunja-operator/` ← copy `charts/apl-gitea-operator/` (Chart.yaml, values.yaml,
  templates: `deployment.yaml`, `rbac.yaml`, `_helpers.tpl`, `NOTES.txt`)
- `values/apl-vikunja-operator/apl-vikunja-operator.gotmpl` — image `linode/apl-tasks` at
  `$v.versions.tasks`, so no new `versions.yaml` entry is needed
- `values/apl-vikunja-operator/apl-vikunja-operator-raw.gotmpl` ← copy the Gitea one: a ConfigMap
  carrying `teamConfig` as JSON plus `domainSuffix`, and an ExternalSecret carrying the Vikunja admin
  password and the OIDC client details
- releases in `helmfile-70.shared.yaml.gotmpl`, gated on `vikunja.enabled`

### 3.2 In `apl-tasks`

Fork and add `src/operators/vikunja/`, modelled on `src/operators/gitea/`. That operator watches
exactly two objects in its own namespace and reconciles through per-concern managers:

```ts
if (object.kind === 'Secret'    && metadata.name === 'apl-gitea-operator-secret') { ... }
else if (object.kind === 'ConfigMap' && metadata.name === 'apl-gitea-operator-cm') { ... }
```

Managers needed: teams and membership. That is all — see Scope.

✅ API surface (from Vikunja's OpenAPI spec, 126 paths). Authenticate with `POST /login` for a JWT
using the service account from 1.5:

| Need | Endpoint |
| --- | --- |
| Create team | `PUT /teams` |
| Add / remove member | `PUT /teams/{id}/members`, `DELETE /teams/{id}/members/{username}` |
| Promote to team admin | `POST /teams/{id}/members/{userID}/admin` |

⛔ **Do not use `/admin/*`.** Those endpoints are the Vikunja Pro admin panel and need a license plus an
admin user; `vikunja user set-admin` carries the same restriction. Nothing above needs admin rights —
creating a team and adding members is core AGPL functionality any user may perform. The cost is that
user *de*provisioning is unavailable, which is acceptable: removing someone from their Keycloak group
removes them from the Vikunja team on the next reconcile, which is the control that matters.

✅ Users are never created by the operator. Vikunja auto-registers them on first OIDC login — the same
choice Gitea makes here with `ENABLE_AUTO_REGISTRATION: true` and
`ALLOW_ONLY_EXTERNAL_REGISTRATION: true`.

⚠ **A consequence to design for:** `PUT /teams/{id}/members` takes a username, and a user only exists in
Vikunja after their first login. Membership therefore cannot be fully reconciled when a team is
created; it fills in as people sign in. A continuously-running operator handles this naturally, which
is a further reason not to use a one-shot Job (Appendix B).

---

## Phase 4 — verification

Work outward. Each step has a cheap check that fails loudly.

1. **App runs.** Pods up in `vikunja`; CNPG cluster healthy; `GET /api/v1/info` returns 200 and lists
   the OIDC provider.
2. **Tile exists.** The one command that matters — empty output means Phase 0 did not land, and no
   amount of `core.yaml` will help:
   ```bash
   curl -sk -H "Authorization: Bearer $ID_TOKEN" \
     "https://api.<domainSuffix>/v1/apps" | jq '.[] | select(.id=="vikunja")'
   ```
3. **Console.** `/apps/admin` shows a Vikunja tile with its logo, linking to
   `https://vikunja.<domainSuffix>/`. Check a team view too — `isShared` should put it there with the
   same URL.
4. **SSO.** Log in as a team member through Keycloak; the account is auto-created.
5. **Team sync.** Create a team in the Console, confirm it appears in Vikunja, then log in as a member
   and confirm they land in it.
6. **Suite.** `npm run test:ci` from a clean context — see `CLAUDE.md` for why the context must be
   clean and why the exit code must not pass through a pipe.

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

⚠ **Argo CD self-heals.** These apps have `syncPolicy.automated.selfHeal: true`, so any live patch to a
platform manifest is reverted within seconds — including patches to the `Application` resource itself.
An early attempt to test the Console tile by patching a ConfigMap silently proved nothing for exactly
this reason. Suspend automation for the duration of any live experiment, or go through the values repo.

---

## Appendix A — verified findings worth not rediscovering

**One OIDC client for the whole platform.** ✅ The `otomi` realm has a single confidential client,
`otomi`, and every app is a redirect URI on it. There is no client-per-app.

**The `groups` claim is realm roles, not Keycloak groups.** ✅ It carries built-in roles as noise, so
anything consuming it must filter:

```
groups: ['offline_access', 'platform-admin', 'default-roles-otomi', 'uma_authorization']
```

`helmfile.d/snippets/authpolicy-jwt.gotmpl` already gates on this claim via `allowGroups`, and is the
existing way to group-restrict a host at the Istio layer.

**OIDC endpoints are pre-derived.** ✅ `helmfile.d/snippets/derived.gotmpl` exposes fully-formed
`_derived.oidcBaseUrl`, `oidcAuthUrl`, `oidcTokenUrl`, `oidcJwksUrl`, `oidcLogoutUrl`, plus
`oidcClientSecretKey` / `oidcClientSecretProperty` so consumers never hardcode the store location. Use
them; do not assemble URLs.

**The Keycloak operator does not prune.** ✅ It creates protocol mappers only when absent and PUTs
groups with a `{name}`-only representation, leaving attributes intact. Verified by adding both, forcing
a full reconcile via `rollout restart`, and confirming survival. Relevant if the claim path in
Appendix B is ever revisited.

**A latent upstream bug.** ✅ `apl-tasks` `keycloak.ts` finds the client with
`allClients.find(el => el.name === client.name)`, but the live `otomi` client has no `name` field — so
`undefined === undefined` matches the first nameless client in the realm. No visible harm so far.

---

## Appendix B — rejected approaches

Recorded so they are not re-proposed. Each was rejected by the ground rule — the *mechanism* had no
counterpart elsewhere in the platform.

**Hand-writing `charts/vikunja`.** Tempting because the official chart wraps the bjw-s `common` library
and assumes an nginx `Ingress`. Rejected: every third-party app here vendors its upstream chart and
overrides through values, injecting platform objects via the chart's own extra-objects hook. Vikunja's
`additionalObjects:` is that hook. Writing a chart would make Vikunja the only app that does not follow
the vendoring pattern. `charts/git-server` and `charts/otomi-console` are first-party only because no
upstream chart exists for them.

**Mounting the logo into `otomi-console` from `apl-core`.** Technically works — ✅ tested: the logo
directory is writable, nginx serves whatever is dropped in, and `charts/otomi-console` is first-party
with an `extraManifests` hook, so a ConfigMap plus a `subPath` mount would do it. Rejected: all 35
existing logos live in `apl-console/public/logos/`, and we are forking that repo's sibling anyway. A
mount would be a mechanism unique to Vikunja.

**A `*jobs` Job for team sync instead of an operator.** Rejected: every existing team sync is an
operator in `apl-tasks`. A Job also cannot handle the membership timing problem in Phase 3, since it
would never re-run when a user logs in for the first time.

**Claim-driven team sync via a `vikunja_groups` OIDC claim.** Vikunja can create and maintain teams
from an OIDC claim, and ✅ this was proven to work with stock Keycloak — no custom mapper plugin needed,
despite Vikunja's docs pointing at one. A user-attribute mapper with `jsonType.label: JSON`,
`multivalued: true` and `aggregate.attrs: true`, over a `vikunja_groups` attribute on the Keycloak
group, produces exactly the required structure:

```
vikunja_groups: [{"name": "platform-admin", "oidcID": "kc-platform-admin"}]
```

Rejected on two grounds. It is bespoke — no other app maps platform teams through a custom claim. And
it is pull-on-login rather than push: a team would not exist until one of its members first signed in,
so a Console change would be invisible until then. Note the two mechanisms are **mutually exclusive** —
OIDC-created teams are not editable, so membership cannot also be managed by API. If the operator ever
proves unworkable, this is the fallback, and the mapper configuration above is known-good.

---

## Appendix C — open questions

Resolve these before or during the phase that depends on them.

1. ⬜ **The chart's Helm repository URL** (Phase 1.1). `vikunja.io/charts` 404s.
2. ⬜ **Does an OIDC login adopt or shadow a pre-existing local user?** (Phase 1.5). The service account
   is local; a platform admin logging in via SSO with a colliding username could end up with a
   duplicate. This repo already treats the hazard as real — `values/gitea/gitea.gotmpl:78` sets
   `ACCOUNT_LINKING: disabled` with the comment *"so that when a user with the same username is created
   in gitea, it will not be linked to another account"*. Pick a service-account username that cannot
   collide.
3. ⬜ **Does Vikunja tolerate `vikunja user create` being re-run?** (Phase 1.5). Decides whether the
   bootstrap job needs a guard.
4. ⬜ **Nothing Vikunja-side has ever been run.** No instance has been deployed; every Vikunja claim
   here comes from its docs, its OpenAPI spec, or its chart. Phase 1 is the first contact with reality.
