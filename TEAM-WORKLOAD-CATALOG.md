# Self-service team workload catalogs — the preferred way to add a team pipeline

Fork-only, not intended for upstream. Read `CLAUDE.md` first for how this file fits with the
others.

**This is the correct, preferred way to give a team a pipeline (or any other workload) on this
platform** — not a one-off hack and not one option among several. `workloads` + `catalogs` are
genuine, already-shipped platform features (`apl-api`/`apl-console`), reachable entirely through
git and the console, with no apl-core change, no image rebuild, and no sibling-repo patch required.
Compare that to `VIKUNJA-TURNSTONE-PIPELINE.md`'s original approach — six objects `kubectl
apply`'d straight against the live cluster — which was only ever a way to *prove the mechanism
works*, never something to build on or hand to a team. If you're asked to add a pipeline, a
workload, or anything a team should own and iterate on going forward, this is the pattern to
reach for; reserve raw `kubectl apply` for genuinely disposable, throwaway experiments (like
`throwaway-graph-demo` in that same file).

Everything *specific* below (the repo, the chart, the catalog entry) was set up by hand against a
live cluster, not through `apl-core`, and needs a deliberate step to survive a rebuild — that part
is still true and matters. See "Surviving a rebuild" at the bottom before assuming any of this is
still there.

## The problem this solves

`VIKUNJA-TURNSTONE-PIPELINE.md` records a Tekton pipeline built entirely with `kubectl apply` —
useful to prove a mechanism works, useless as something a team could adopt, extend, or even find
again later. The natural next question was: what's the *real*, git-tracked way to own a pipeline
like that, and can a team member add one without an apl-core change?

Two platform features already answer this, both discovered by reading `apl-api`'s source
(`src/otomi-stack.ts`, `src/api/v2/{teams,catalogs}.ts` — a sibling repo, not in this checkout) and
`charts/team-ns/templates/argocd/argocd-application-workload.yaml` here in apl-core:

- **`workloads`** — a team's `env/teams/<team>/workloads/<name>.yaml` (`kind: AplTeamWorkload`)
  points at *any* Helm chart in *any* git repo (`url`/`revision`/`path`/`chart`). `team-ns` turns
  each entry into its own ArgoCD `Application`, scoped to the `team-<id>` ArgoCD project and
  namespace, `automated: {prune: false, selfHeal: true}` — same shape as the console's built-in
  "green" sample app, which uses this exact mechanism against `linode/apl-charts.git`.
- **`catalogs`** — a short list of `{repositoryUrl, branch, chartsPath, enabled}` entries
  (`env/catalogs/<name>.yaml`, `kind: AplCatalog`), rendered as the "Select Catalog" dropdown on
  the console's Workloads → Add New screen. Picking a chart there writes a `workloads` entry for
  you — it's the self-service front end for the same mechanism. The platform ships one default
  catalog (`linode/apl-charts.git`); nothing stops adding more.

Neither of these needed an apl-core code change, an image rebuild, or a sibling-repo patch — both
are just files in the `otomi/values` git repo (`http://git-server.git-server.svc.cluster.local` /
`https://git.<domainSuffix>`, credentials in `argocd-repo-creds-git-server` Secret, `argocd`
namespace).

## What's actually deployed

**A new Gitea repo**, `team-labteam/team-pipelines` (created via Gitea's API with the
`gitea-admin-secret` credential), structured as a chart-per-subfolder monorepo so a team can hold
more than one pipeline without spinning up a new repo each time:

```
team-pipelines/
  charts/
    agentic-sdlc/
      Chart.yaml       # icon: data:image/svg+xml;base64,... (see "Icons" below)
      values.yaml       # teamId, vikunjaTurnstone.*, helloWorld.who, scheduledCleanup.retentionDays
      templates/
        vikunja-turnstone.yaml   # Pipeline, Task, TriggerBinding, TriggerTemplate, EventListener, NetworkPolicy
        hello-world.yaml         # Pipeline, Task -- trivial, copy this to start a new pipeline
        scheduled-cleanup.yaml   # Pipeline, Task -- placeholder, no RBAC wired up
  README.md
```

**One chart, three Pipelines, one workload.** This was a deliberate correction mid-build: the first
version was three separate charts (`vikunja-turnstone/`, `hello-world/`, `scheduled-cleanup/`),
which meant three catalog tiles and three separate workloads/ArgoCD Applications. The person running
this wanted one self-service catalog entry that visibly bundles a few pipelines together, so all
three chart's `templates/` were merged into a single `agentic-sdlc` chart instead (`git rm -r` the
three, `git mv`/recreate under one chart, one values.yaml with a sub-key per pipeline). Nothing in
Tekton requires a 1-chart-1-Pipeline split — a chart is just a bag of manifests, and grouping related
pipelines into one workload is a legitimate way to keep a team's catalog from becoming one tile per
pipeline.

**A second catalog entry**, `env/catalogs/team-pipelines.yaml`:

```yaml
kind: AplCatalog
metadata:
    name: team-pipelines
spec:
    branch: main
    chartsPath: charts
    enabled: true
    name: team-pipelines
    repositoryUrl: http://gitea-http.gitea.svc.cluster.local:3000/team-labteam/team-pipelines.git
```

`chartsPath: charts` matters — without it, `apl-api` looks for chart folders at the repo root, and
finds nothing (the default `linode/apl-charts` catalog has no `chartsPath` because its charts *are*
at the root).

**The registered workload**, created live through the console (not by hand) once the catalog above
existed: `env/teams/labteam/workloads/agenticbaseline.yaml`, `chartProvider: git`,
`imageUpdateStrategy.type: disabled` (nothing here has an image that gets rebuilt — see "Traps"
below for why that matters).

## Traps found building this

**1. The repo URL must be reachable from `apl-api`'s pod, and the public `nip.io` route isn't the
safe bet.** `apl-api` fetches catalog chart listings itself (`getBYOWorkloadCatalog` in
`otomi-stack.ts`), so the `repositoryUrl` needs to resolve and be trusted from *inside* the
`otomi` namespace, not from a browser. Confirmed live: `gitea-http.gitea.svc.cluster.local:3000`
(the Gitea Service's own ClusterIP DNS, plain HTTP, no TLS) works cleanly (`kubectl exec` into
`otomi-api` and `wget` the `git-upload-pack` refs endpoint returned a real response); the public
`https://gitea.<domainSuffix>/...` route was never actually tested against `apl-api`, but per
`POD-EGRESS-INVESTIGATION.md`'s pattern of pods hairpinning badly through the cluster's own external
IP, the in-cluster Service DNS is the one to reach for by default, not the ingress route.

**2. The chart's `icon:` field takes any string that's a valid `<img src>`, including a `data:`
URI.** `CatalogCard.tsx` in `apl-console` just does `<img src={img} onError={... fallback ...}>` —
no scheme validation anywhere between `Chart.yaml`'s `icon:` field and the browser. A `data:` URI
means the icon has zero external dependency (no image host, no egress, no broken-link risk if a
public URL ever disappears) — inline SVGs, base64-encoded, work directly:

```yaml
icon: data:image/svg+xml;base64,<...encoded SVG...>
```

**3. `apl-api` caches a catalog's chart listing on disk after first fetch — pushing new charts to
git doesn't show them until "Refresh Charts" is clicked.** The console has a `REFRESH CHARTS`
button next to the repo URL for exactly this; without it, the catalog picker can look stale (fewer
tiles than the repo actually has) for an indeterminate time after a push.

**4. `helm lint`/`helm template` catch the same problems here as everywhere else in this repo** —
run them on any new chart before pushing (see the "Build from a clean context" trap in `CLAUDE.md`,
same principle: verify the artifact, don't assume the YAML is right because it looks right).

**5. A Task's container image is subject to the same pod-egress rule as everything else on this
lab.** `hello-world` and `scheduled-cleanup` both needed a plain `alpine:3.20` — pulling that
straight from Docker Hub inside a pod fails per `POD-EGRESS-INVESTIGATION.md`. Mirrored it into
Harbor from the host first:

```bash
docker run --rm --network host quay.io/skopeo/stable:latest copy --dest-tls-verify=false \
  --dest-creds "<team>:<password from harbor-pushsecret-builds Secret's config.json>" \
  docker://docker.io/library/alpine:3.20 \
  docker://harbor.<domainSuffix>/team-labteam/alpine:3.20
```

`--network host` is required on the `docker run` itself (without it, the skopeo container can't
route to the `kind` node's Docker network at all — a generic `i/o timeout`, not an auth or TLS
error, which is what made this one slower to diagnose than the credential issue that came right
after it). The credential lives in the team's own `harbor-pushsecret-builds` Secret, key
`config.json` (not `.dockerconfigjson` — a different shape than a typical imagePullSecret), decode
and pull out `auths."<harborDomain>".password`.

**6. A stale `workloads` entry pointing at a now-deleted chart path doesn't error until ArgoCD's
next refresh.** When the three original charts were deleted in favor of `agentic-sdlc`, an earlier
workload created against the old `charts/vikunja-turnstone` path kept showing `Synced`/`Healthy` in
`kubectl get applications` for a while afterward — ArgoCD was serving its last-known-good cached
manifest, not re-checking the repo on every `kubectl get`. Don't trust a green status as proof a
workload's chart path still exists; check the chart is actually still in the repo.

## Extending this

This is the pattern to reuse for the next team pipeline too, not just this one bundle. Add a new
`templates/<name>.yaml` (Pipeline + Task, following the existing three as examples) to
`charts/agentic-sdlc/` for another pipeline in the same bundle, or start a new chart under
`charts/<bundle-name>/` in the same repo if it deserves its own separate workload lifecycle (its own
ArgoCD Application, its own prune/sync history, independent of the other three). Either way: `helm
lint` before pushing, and remember any credential Secret a new pipeline needs must be created
out-of-band in the target namespace — never committed to this repo.

## Surviving a rebuild

**None of this is wired into `SETUP.md`.** The Gitea repo, the `env/catalogs/team-pipelines.yaml`
file, and the `env/teams/labteam/workloads/agenticbaseline.yaml` file all live in git repos that are
themselves recreated empty by a fresh `kind` cluster install (Gitea starts with no repos; the
`otomi/values` repo is bootstrapped fresh from `values.yaml` + `values.env.yaml`, not from a
snapshot of a previous cluster's edits). A `kind delete cluster` + reinstall per `SETUP.md` loses
all three files above, exactly the same caveat `VIKUNJA-TURNSTONE-PIPELINE.md` already carries for
the pipeline these charts are built from. If this is ever meant to persist across rebuilds, the real
fix is a `SETUP.md` step (or a small bootstrap script) that recreates the Gitea repo, pushes
`charts/agentic-sdlc`, and writes both env files — not a manual redo each time.
