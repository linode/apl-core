# Vikunja integration — the three other repositories

Vikunja is a four-repo change. Everything that lives in `apl-core` is committed normally; this
directory carries the parts that belong to the other three, because forking and publishing three
more repositories is a decision for the reader, not for this branch.

Each patch was generated against `main` of the upstream repository and verified with
`git apply --check` on a fresh clone at the time of writing. If upstream has moved, expect to
re-roll them.

| File | Repo | What it does | Needed for |
| --- | --- | --- | --- |
| `apl-api.patch` | `linode/apl-api` | adds `vikunja` to the `AppList` enum | **everything** — nothing is visible without it |
| `apl-console/public/logos/vikunja_logo.svg` | `linode/apl-console` | the Console tile logo | cosmetic |
| `apl-tasks.patch` | `linode/apl-tasks` | `src/operators/vikunja/` — the team-sync operator | `apps.vikunja.teamSync.enabled` |

---

## apl-api — required

```bash
git clone https://github.com/linode/apl-api.git && cd apl-api
git apply /path/to/apl-core/vikunja-patches/apl-api.patch

# The image bakes in a copy of apl-core's values-schema.yaml. It must be the one from THIS
# branch, or the app's settings schema is missing and the Console renders an empty form.
APL_CORE_PATH=/path/to/apl-core npm run schema:sync

docker build -t docker.io/linode/apl-api:v0.0.0-vikunja .
docker images docker.io/linode/apl-api:v0.0.0-vikunja   # verify; do not trust the exit code
kind load docker-image docker.io/linode/apl-api:v0.0.0-vikunja --name apl
```

Then point the platform at it from your `values.yaml`:

```yaml
versions:
  api: 0.0.0-vikunja
```

`0.0.0-…` matters: `values/otomi-api/otomi-api.gotmpl` treats a version starting with a digit as a
semver, which prefixes the tag with `v` and sets `pullPolicy: IfNotPresent` — exactly what a
kind-loaded image needs. A tag like `vikunja` would be treated as a branch and pulled `Always`.

`versions` being settable from values at all is a change on this branch
(`helmfile.d/snippets/derived.gotmpl`); upstream reads `versions.yaml` and nothing else.

## apl-console — cosmetic

The Console builds the logo path as `/logos/${appId}_logo.svg` with no lookup table, so the file
name has to be exactly `vikunja_logo.svg`. The tile works without it; it just shows a broken image.

```bash
git clone https://github.com/linode/apl-console.git && cd apl-console
cp /path/to/apl-core/vikunja-patches/apl-console/public/logos/vikunja_logo.svg public/logos/
docker build -t docker.io/linode/apl-console:v0.0.0-vikunja .
kind load docker-image docker.io/linode/apl-console:v0.0.0-vikunja --name apl
```

```yaml
versions:
  console: 0.0.0-vikunja
```

The SVG is Vikunja's own `frontend/src/assets/logo.svg` at v2.5.0, AGPL-3.0 like the rest of the
project.

## apl-tasks — needed only for team sync

`apl-tasks`' own `Dockerfile` cannot be used here: it runs `npm ci` against GitHub Packages, and
GitHub Packages requires authentication **even for public packages**. Anonymous gets `403`, and so
does a `gh` token whose scopes lack `read:packages`.

No token is needed anyway. The published `linode/apl-tasks:main` image already ships a fully
resolved `/app/node_modules` containing all four `@linode/*` packages, so it can serve as the
dependency source. Only `typescript` and the `@types/*` it needs come from public npm.
`apl-tasks-vikunja.Dockerfile` in this directory does exactly that.

```bash
git clone https://github.com/linode/apl-tasks.git && cd apl-tasks
git apply /path/to/apl-core/vikunja-patches/apl-tasks.patch
docker build -f /path/to/apl-core/vikunja-patches/apl-tasks-vikunja.Dockerfile \
             -t docker.io/linode/apl-tasks:v0.0.0-vikunja .
docker images docker.io/linode/apl-tasks:v0.0.0-vikunja   # verify; do not trust the exit code
kind load docker-image docker.io/linode/apl-tasks:v0.0.0-vikunja --name apl
```

Verify the artifact rather than the build's exit status — this build has two ways to exit `0`
having produced nothing useful (see the comments in the Dockerfile):

```bash
docker run --rm --entrypoint sh docker.io/linode/apl-tasks:v0.0.0-vikunja \
  -c 'ls dist/src/operators/vikunja/vikunja.js && node dist/src/operators/vikunja/vikunja.js'
```

The expected output is the operator's `envalid` report listing `VIKUNJA_URL`, `VIKUNJA_URL_PORT` and
`VIKUNJA_OPERATOR_NAMESPACE` as missing. That proves the module compiled, resolved every
`@linode/*` import at runtime, and reached its own entrypoint. `VIKUNJA_RECONCILE_INTERVAL` is
deliberately absent from that list — it defaults to 60, so nothing has to set it.

### What the patch contains

`src/operators/vikunja/` — a team-sync operator that creates a `team-<id>` per platform team and
pushes Keycloak group membership into it. Its layout follows `src/operators/gitea/`; its reconcile
loop follows `src/operators/harbor/`, which matters more than it sounds:

**Membership cannot be event-driven.** The operator needs a user to be in the Keycloak group *and*
to have logged into Vikunja once (`PUT /teams/{id}/members` 404s for an account that does not exist
yet). Neither event produces anything Kubernetes can watch, so a watch-only operator reconciles at
the wrong moments forever, reporting `Success!` each time. `VIKUNJA_RECONCILE_INTERVAL` (default 60s)
plus a `reconciling` overlap guard is what makes it converge; the Secret and ConfigMap watches are
retained only for fast reaction when a team is added. Full account in `VIKUNJA.md` 3.3.

`npm run operator:vikunja` is unchanged by this build (`node dist/src/operators/vikunja/vikunja.js`),
so `charts/apl-vikunja-operator` needs no special-casing — it runs the same
`command: [npm, run, operator:<name>]` as the Gitea operator.

```yaml
versions:
  tasks: 0.0.0-vikunja
apps:
  vikunja:
    teamSync:
      enabled: true
```

### What the operator does

`src/operators/vikunja/vikunja.ts` watches exactly two objects in `apl-vikunja-operator`, the same
shape as the Gitea operator:

- `ConfigMap/apl-vikunja-operator-cm` — `teamConfig` as JSON plus `domainSuffix`
- `Secret/apl-vikunja-operator-secret` — the Vikunja service account and the Keycloak admin
  credential

On every change it logs in to Vikunja with `POST /login`, creates a `team-<id>` for each platform
team via `PUT /teams`, then reconciles each team's membership against the members of the Keycloak
group of the same name.

Two constraints shaped it:

- **No `/admin/*`.** Those endpoints are the Vikunja Pro admin panel and need a licence.
  `PUT /teams`, `PUT /teams/{id}/members` and `DELETE /teams/{id}/members/{username}` are core
  AGPL functionality any authenticated user may perform on teams they own. The cost is that user
  *de*provisioning is unavailable — removing someone from their Keycloak group removes them from
  the Vikunja team on the next reconcile, which is the control that matters.
- **A user only exists in Vikunja after their first OIDC login.** Adding a member who has not
  signed in yet returns 400. The operator treats that as normal and retries on the next reconcile,
  which is precisely why this is an operator and not a one-shot Job.
