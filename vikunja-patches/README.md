# Vikunja integration — the other two repositories

Vikunja is a three-repo change. Everything that lives in `apl-core` is committed normally; this
directory carries the parts that belong to the other two, because forking and publishing two more
repositories is a decision for the reader, not for this branch.

Each patch was generated against `main` of the upstream repository and verified with
`git apply --check` on a fresh clone at the time of writing. If upstream has moved, expect to
re-roll them.

| File | Repo | What it does | Needed for |
| --- | --- | --- | --- |
| `apl-api.patch` | `linode/apl-api` | adds `vikunja` to the `AppList` enum | **everything** — nothing is visible without it |
| `apl-console/public/logos/vikunja_logo.svg` | `linode/apl-console` | the Console tile logo | cosmetic |

There used to be a third: `apl-tasks.patch`, a team-sync operator that pushed platform teams and
their Keycloak group membership into Vikunja teams (plus, later, a per-team project). Removed
deliberately — not because it didn't work; both the team sync and the later project-sync extension
were built, debugged and verified live. The decision was that a standing operator pushing platform
state into every team's Vikunja workspace was more ongoing risk (see the commit that added project
sync for the specific concern: it acts on *any* team in `teamConfig`, not just demo ones, with a
hardcoded "Demo project" description) than the team was getting value from, for now. This is a
**revisit-able decision, not a permanent architectural one** — if OIDC-native claim-driven team
creation (recorded as proven-working, config included, in `VIKUNJA.md` Appendix B) or the operator
approach is wanted again, the removal commit and everything it deleted is in `git log`, not gone.

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
