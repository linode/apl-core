# Vikunja webhook → Tekton → Turnstone workstream — a proof-of-flow

This is fork-only and not intended for upstream. It is a record of a live experiment, not a plan —
read `CLAUDE.md` first for how this file fits with the others.

**Goal, explicitly scoped down by the person who asked for it:** prove that a Vikunja event can
trigger a Tekton pipeline that talks to Turnstone through its real Python SDK and starts a
workstream. The task title, the Vikunja project, and the workstream content are all
placeholders — nothing here is meant to be a real automation.

**Status at the time this was written: proof-of-concept, not a platform feature.** Every object
below was created with `kubectl apply` directly against the live cluster, not through Helm charts,
`values/*.gotmpl`, or the console.

**Update: this has since moved into a git-tracked chart.** Rather than `charts/team-ns` +
`values/vikunja` in apl-core, it now lives in a team-owned Gitea repo
(`team-labteam/team-pipelines`, chart `agentic-sdlc`) deployed through the platform's own
`workloads`/`catalogs` mechanism — see `TEAM-WORKLOAD-CATALOG.md` for the full account, including
why that mechanism (not an apl-core change) is the preferred way to do this. The rest of this file
still accurately records the four bugs and the SDK usage that made the pipeline work; only the
"kubectl-applied, nothing survives a rebuild" framing below is now out of date.

## The flow

```
Vikunja task.created event
  → Vikunja project webhook (POST, in-cluster target)
  → Tekton EventListener (team-labteam namespace)
  → TriggerBinding extracts event_name / task.title / task.id as scalars
  → TriggerTemplate creates a PipelineRun
  → Pipeline → Task, image built from `pip install turnstone`
  → Task imports turnstone.sdk.TurnstoneServer, logs in, calls create_workstream()
  → new workstream appears in Turnstone
```

Objects live in `team-labteam`: `Secret/turnstone-admin-credentials`,
`Task/vikunja-to-turnstone`, `Pipeline/vikunja-to-turnstone`,
`TriggerBinding/vikunja-triggerbinding`, `TriggerTemplate/vikunja-trigger-template`,
`EventListener/vikunja-webhook-labteam`. The webhook itself is registered on Vikunja project 1
("Inbox") via `PUT /api/v1/projects/1/webhooks`, `target_url` pointing at
`http://el-vikunja-webhook-labteam.team-labteam.svc.cluster.local:8080`.

## Four real bugs, all found by running it, not by reading docs

**1. Vikunja's own outbound webhook client refuses cluster-internal IPs.** Vikunja vendors
`code.dny.dev/ssrf` for SSRF protection on every outgoing HTTP call it makes (webhooks included),
and its default deny list includes `10.0.0.0/8` — which covers both this kind cluster's pod CIDR
and its Service CIDR. Every webhook delivery failed with:

```
prohibited IP address: 10.96.x.x is not a permitted destination (denied by: 10.0.0.0/8)
```

Fix: `VIKUNJA_OUTGOINGREQUESTS_ALLOWNONROUTABLEIPS=true` on the Vikunja Deployment
(`pkg/utils/httpclient.go` in `go-vikunja/vikunja`, config key `outgoingrequests.allownonroutableips`
— the older `webhooks.*` config keys are deprecated aliases for the same thing). Set live via
`kubectl set env deployment/vikunja -n vikunja ...` for this experiment; a real rollout would set it
through `values/vikunja/vikunja.gotmpl` instead.

⚠ This is a genuine security control being turned off, not a misconfiguration — outside a lab this
trades SSRF protection for the ability to call cluster-internal services. Fine here; would need a
real risk decision anywhere else.

**2. Missing NetworkPolicy: nothing let Vikunja's namespace reach the EventListener pod.**
`charts/team-ns` already ships `default-from-gitea`, an ingress-only NetworkPolicy scoped to pods
labeled `app.kubernetes.io/managed-by: EventListener`, allowing traffic only from the `gitea`
namespace's `app: gitea` pods (this is what makes the existing Gitea-triggered docker-build pipeline
work). Nothing analogous exists for Vikunja, so the webhook was silently dropped at the network layer
— no log entry anywhere, on either side, which is what made this the hardest of the four to find.
Fix: a same-shaped `default-from-vikunja` NetworkPolicy, matching `namespaceSelector: {name: vikunja}`
+ `podSelector: {app.kubernetes.io/instance: vikunja}`.

**3. Embedding the whole webhook body as a TriggerTemplate string param breaks Tekton's own
templating.** The natural-looking approach —
`TriggerBinding: {name: body, value: $(body)}` then
`TriggerTemplate: {params: [{name: body}], resourcetemplates: [{... value: $(tt.params.body)}]}` —
fails because Tekton Triggers does a raw text substitution of the resolved param value into the
resourcetemplate's JSON, with no escaping. A JSON object substituted into a JSON string field
produces invalid JSON:

```
couldn't unmarshal json from the TriggerTemplate: invalid character 'd' after object key:value pair
```

(the `d` is from `"doer"`/`"data"` inside the raw payload, landing where a closing quote was
expected). Fix: extract scalar fields in the TriggerBinding instead of the whole body —
`value: $(body.event_name)`, `value: $(body.data.task.title)`, `value: $(body.data.task.id)` — and
give the Task/Pipeline one string param per field. Scalars survive the substitution because they
contain no unescaped structural characters.

**4. `pip install turnstone` fails on Alpine (musl), works on Debian (glibc).** `turnstone` on PyPI
is the *whole* server package (SDK, server, CLI all in one `pyproject.toml`), so installing it pulls
every dependency the full app has — including `vl-convert-python` (used for chart export), which
ships no `musllinux` wheel and falls back to building from its Rust source via `maturin`. That build
needs a C toolchain to link against, which a bare `python:3.12-alpine` doesn't have — `cargo` itself
fails to even run (`Error relocating ... symbol not found`, a musl/glibc ABI mismatch inside the
downloaded `rustup` toolchain, not a missing package). Switching the base image to `python:3.12-slim`
gives every dependency a prebuilt `manylinux` wheel and the build finishes in about 20 seconds with
no compilation at all.

## The image

`harbor.<domainSuffix>/team-labteam/turnstone-sdk:1.8.1`, built from:

```dockerfile
FROM python:3.12-slim
RUN pip install --no-cache-dir turnstone==1.8.1
```

**Built on the host and pushed with `skopeo`, never pulled by a pod from PyPI or Docker Hub** —
the same `POD-EGRESS-INVESTIGATION.md` workaround as every other image on this lab. `docker push`
itself doesn't work here either: the host's Docker daemon doesn't trust the platform's custom CA any
more than a pod does, so pushing needs `skopeo copy docker-daemon:... docker://harbor.../...
--dest-tls-verify=false`, not a plain `docker push` (which fails with the same
`certificate signed by unknown authority` this whole platform's self-signed CA always produces
outside Go clients — see `CLAUDE.md`'s CA note).

Pin the version (`turnstone==1.8.1`) to whatever this cluster's Turnstone chart is actually running
(`kubectl get deploy turnstone-server -n turnstone -o jsonpath='{..image}'` will show the tag) — the
SDK and server are the same package release-for-release, and nothing here checked whether the SDK
tolerates a version skew against an older or newer server.

## The Turnstone side — using the real SDK, not raw REST

Once the image exists, the Task's script is exactly what a human would write locally:

```python
from turnstone.sdk import TurnstoneServer

base_url = "http://turnstone-server.turnstone.svc.cluster.local:8080"

with TurnstoneServer(base_url) as anon:
    login = anon.login(username=..., password=...)

with TurnstoneServer(base_url, token=login.jwt) as client:
    ws = client.create_workstream(name=..., initial_message=...)
```

Two things worth knowing about the SDK's shape, found by reading `/app/turnstone/sdk/server.py`
inside the running `turnstone-console` pod (there is no public API reference beyond the package's
own docstrings):

- `login()` does **not** mutate the client it was called on — it just returns an
  `AuthLoginResponse` with a `.jwt`. A second client has to be constructed with `token=login.jwt`
  to actually use it. The alternative is `token_factory=` at construction time, for a token that
  needs to be refreshed mid-session.
- `client.create_workstream(...)` returns a typed `CreateWorkstreamResponse` (`.ws_id`, `.name`,
  ...), not a raw dict — this is the actual difference between using the SDK and reimplementing its
  HTTP calls by hand with `urllib`, which is what the first version of this pipeline did before this
  file existed.

Credentials used: `turnstone-admin-credentials` Secret in the `turnstone` namespace
(`apl-turnstone-admin` / bootstrap password), copied into a same-named Secret in `team-labteam` for
the Task to mount. A real integration would scope this to a purpose-made Turnstone user/role instead
of the platform admin — not done here, this is a proof of flow.

## How to watch a run happen

See "Watching a PipelineRun" in this file's companion section below, or just:

```bash
# after creating a task in Vikunja project 1 ("Inbox")
kubectl get pipelinerun -n team-labteam -l tekton.dev/pipeline=vikunja-to-turnstone \
  --sort-by=.metadata.creationTimestamp
kubectl logs -n team-labteam -l tekton.dev/pipelineRun=<name> --all-containers
```

The Tekton Dashboard is also live and SSO-protected exactly like Harbor and Argo CD (see
`SETUP.md`'s Tekton section): `https://tekton-labteam.<domainSuffix>/`.
