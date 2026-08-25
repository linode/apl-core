# Turnstone integration — the other two repositories

Turnstone is a **three**-repo change, not four. Everything that lives in `apl-core` is committed
normally; this directory carries the parts that belong to the other two, following the same
convention as `vikunja-patches/`.

There is no `apl-tasks` patch. Turnstone has no team object at all — only orgs and roles — so team
membership is delegated to its own OIDC role mapping instead of an operator. That is the model
`INTEGRATING-AN-APP.md` 4.1 tells you to prefer, and it removes the whole of Phase 4. See
`TURNSTONE.md`.

| File | Repo | What it does | Needed for |
| --- | --- | --- | --- |
| `apl-api.patch` | `linode/apl-api` | adds `turnstone` to the `AppList` enum | **everything** — nothing is visible without it |
| `apl-console/public/logos/turnstone_logo.svg` | `linode/apl-console` | the Console tile logo | cosmetic |

**These stack on top of `vikunja-patches/`.** This lab runs both apps, and there is only one
`apl-api` image and one `apl-console` image, so each must carry both changes. Apply the vikunja
patch first — `apl-api.patch` here has `- vikunja` in its context lines and will not apply otherwise.

---

## apl-api — required

```bash
git clone https://github.com/linode/apl-api.git && cd apl-api
git apply /path/to/apl-core/vikunja-patches/apl-api.patch
git apply /path/to/apl-core/turnstone-patches/apl-api.patch

# The image bakes in a copy of apl-core's values-schema.yaml. It must be the one from THIS
# branch, or apps.turnstone has no schema and the Console renders an empty settings form --
# including the anthropicApiKey field, which is the one value an operator has to fill in.
APL_CORE_PATH=/path/to/apl-core npm run schema:sync

docker build -t docker.io/linode/apl-api:v0.0.0-turnstone .
docker images docker.io/linode/apl-api:v0.0.0-turnstone   # verify; do not trust the exit code
kind load docker-image docker.io/linode/apl-api:v0.0.0-turnstone --name apl
```

```yaml
versions:
  api: 0.0.0-turnstone
```

`0.0.0-…` matters: `values/otomi-api/otomi-api.gotmpl` treats a version starting with a digit as a
semver, which prefixes the tag with `v` and sets `pullPolicy: IfNotPresent` — exactly what a
kind-loaded image needs. A bare word like `turnstone` would be treated as a branch and pulled
`Always`, which fails for an image that only exists inside the cluster.

Verify the enum actually landed, rather than assuming the patch applied:

```bash
docker run --rm --entrypoint sh docker.io/linode/apl-api:v0.0.0-turnstone \
  -c 'grep -c turnstone dist/src/openapi/app.yaml && grep -c "apps:" values-schema.yaml'
```

## apl-console — cosmetic

The Console builds the logo path as `/logos/${appId}_logo.svg` with no lookup table, so the file
name has to be exactly `turnstone_logo.svg`. The tile works without it; it just shows a broken image.

```bash
git clone https://github.com/linode/apl-console.git && cd apl-console
cp /path/to/apl-core/vikunja-patches/apl-console/public/logos/vikunja_logo.svg public/logos/
cp /path/to/apl-core/turnstone-patches/apl-console/public/logos/turnstone_logo.svg public/logos/
docker build -t docker.io/linode/apl-console:v0.0.0-turnstone .
kind load docker-image docker.io/linode/apl-console:v0.0.0-turnstone --name apl
```

```yaml
versions:
  console: 0.0.0-turnstone
```

### On the logo

**Turnstone ships no logo.** There is no `logo.svg`, no favicon, no brand asset and no inline SVG
mark anywhere in the repository — verified across `turnstone/`, `turnstone/console/static/`,
`turnstone/ui/static/` and `turnstone/shared_static/`. The only images are documentation diagrams.

So unlike `vikunja_logo.svg`, which is the project's own asset under its own licence, this file is
an **original placeholder authored for this integration**: an abstract console-routing-to-three-nodes
mark, deliberately not an imitation of any Turnstone Labs branding. If upstream later publishes a
logo, replace it — and note that the tile is purely cosmetic, so there is no rush.
