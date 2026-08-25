# APL local lab on kind — reproducible setup

Brings up Akamai App Platform on a local `kind` cluster, installed **from this fork** with an
operator image you build yourself.

Takes roughly **15 minutes**, most of it the image build and the platform install. Needs ~30 GB free
disk, 6+ vCPU, 12+ GB RAM.

**Status legend:** ✅ verified on this machine · ⬜ written but not yet executed

Only steps marked ✅ have actually been run. Nothing here is copied from upstream documentation
without checking it.

If you are an agent working through this file, read [`CLAUDE.md`](CLAUDE.md) first — it carries the
operational rules and the traps that are expensive to rediscover.

---

## Why from this fork, and not the published chart

The fixes this lab depends on live **inside the operator image** — in `src/operator/`,
`helmfile.d/`, `values/` and `values-schema.yaml`, all of which the `Dockerfile` bakes in. The
published `apl/apl` chart deploys *upstream's* image, so none of them take effect. Installing it
reproduces the bugs rather than avoiding them.

| fix | what it prevents | reference |
|---|---|---|
| quote `defaultStorageClass` | `provider: custom` renders `null`, platform rejects its own config | [#3](https://github.com/qvest-digital/apl-core/pull/3) |
| require `domainSuffix` for `provider: custom` | template crash inside a retry loop instead of a clear error | [#4](https://github.com/qvest-digital/apl-core/pull/4), [#6](https://github.com/qvest-digital/apl-core/pull/6) |
| honour `INSTALL_RETRIES` | unbounded retry loop, releases driven to revision 37 | [#5](https://github.com/qvest-digital/apl-core/pull/5) |
| settable image repository and pull policy | a self-built image cannot be used at all | [#7](https://github.com/qvest-digital/apl-core/pull/7) |
| overridable toolchain base image | build depends on a Linode-published artifact | [#8](https://github.com/qvest-digital/apl-core/pull/8) |

Three open items not fixed here, all worked around rather than patched:
[#2](https://github.com/qvest-digital/apl-core/issues/2) (`helm upgrade` server-side-apply conflict),
[#10](https://github.com/qvest-digital/apl-core/issues/10) (`APPS_REVISION` unset leaves every Argo
CD application unresolvable while the install still reports `completed` — see step 5), and upstream's
`custom.md` inaccuracies.

---

## Quickstart

Copy-pasteable end to end. Every environment-specific value is derived, not hardcoded.

```bash
set -e

# 1. clean slate (skip if this machine never had the lab)
kind delete cluster --name apl

# 2. cluster
kind create cluster --name apl
kubectl --context kind-apl wait --for=condition=Ready node --all --timeout=120s

# 3. MetalLB -- derive the range from the live docker network, IPv4 line only
SUBNET=$(docker network inspect kind --format '{{range .IPAM.Config}}{{println .Subnet}}{{end}}' | grep -v ':')
PREFIX=$(echo "$SUBNET" | cut -d. -f1-2)
POOL_START="$PREFIX.255.200"; POOL_END="$PREFIX.255.250"
echo "pool: $POOL_START-$POOL_END"

kubectl create namespace mlb
helm repo add metallb https://metallb.github.io/metallb && helm repo update
helm install metallb metallb/metallb -n mlb
sleep 60
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: {name: default-pool, namespace: mlb}
spec: {addresses: ["$POOL_START-$POOL_END"]}
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata: {name: default-pool, namespace: mlb}
EOF

# 4. CNI
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.3/manifests/calico.yaml
kubectl wait --for=condition=Ready pod -l k8s-app=calico-node -n kube-system --timeout=120s

# 5. build the operator image from a CLEAN context (see Traps)
#    APPS_REPO_URL + APPS_REVISION decide where Argo CD fetches charts/* from. They must
#    point at a pushed commit that HAS the charts this image's templates expect -- on this
#    branch that means the fork, because charts/vikunja does not exist upstream.
#    Derived, never copied -- see step 5.
CTX=$(mktemp -d)
git ls-files -z | tar --null -T - -c | tar -x -C "$CTX"
APPS_REPO_URL=https://github.com/qvest-digital/apl-core.git
APPS_REVISION=$(git rev-parse HEAD)               # must already be pushed to APPS_REPO_URL
git branch -r --contains "$APPS_REVISION" | grep -q origin || \
  { echo "commit not pushed -- Argo CD will not find it"; exit 1; }
echo "apps: $APPS_REPO_URL @ $APPS_REVISION"
docker build --build-arg VERSION=6.2.1-fork \
             --build-arg APPS_REVISION="$APPS_REVISION" \
             --build-arg APPS_REPO_URL="$APPS_REPO_URL" \
             -t apl-core-local:v6.2.1-fork "$CTX"
docker images apl-core-local:v6.2.1-fork        # MUST show the image; do not trust the exit code
kind load docker-image apl-core-local:v6.2.1-fork --name apl

# 5b. Vikunja needs a patched apl-api (the AppList enum) and, for the tile logo, apl-console.
#     Both are tagged with the names the charts already expect, so no registry is involved.
#     See vikunja-patches/README.md for the full explanation.
VP=$PWD/vikunja-patches
rm -rf /tmp/apl-api /tmp/apl-console
git clone --depth 1 https://github.com/linode/apl-api.git /tmp/apl-api
git -C /tmp/apl-api apply "$VP/apl-api.patch"
( cd /tmp/apl-api && APL_CORE_PATH="$VP/.." npm run schema:sync )   # bakes in THIS values-schema
docker build -t docker.io/linode/apl-api:v0.0.0-vikunja /tmp/apl-api
docker images docker.io/linode/apl-api:v0.0.0-vikunja
kind load docker-image docker.io/linode/apl-api:v0.0.0-vikunja --name apl

git clone --depth 1 https://github.com/linode/apl-console.git /tmp/apl-console
cp "$VP/apl-console/public/logos/vikunja_logo.svg" /tmp/apl-console/public/logos/
docker build -t docker.io/linode/apl-console:v0.0.0-vikunja /tmp/apl-console
docker images docker.io/linode/apl-console:v0.0.0-vikunja
kind load docker-image docker.io/linode/apl-console:v0.0.0-vikunja --name apl

# 6. generate the chart schema -- REQUIRED, silently skipped validation otherwise
bin/gen-chart-schema.sh

# 7. values + install
cat > values.yaml <<EOF
cluster:
  name: apl-local
  provider: custom
  domainSuffix: $POOL_START.nip.io
  defaultStorageClass: standard
otomi:
  version: v6.2.1-fork
  coreImageRepository: apl-core-local
  coreImagePullPolicy: IfNotPresent
operator:
  installRetries: 3
versions:
  # The locally built images from step 5b. A version starting with a digit is treated as a
  # semver, which prefixes the tag with 'v' and sets pullPolicy IfNotPresent -- exactly what a
  # kind-loaded image needs. 'vikunja' as a tag would be treated as a branch and pulled Always.
  api: 0.0.0-vikunja
  console: 0.0.0-vikunja
apps:
  metrics-server:
    extraArgs: ["--kubelet-insecure-tls=true"]
  vikunja:
    enabled: true
    # teamSync needs a patched apl-tasks image, which cannot be built without a GitHub
    # Packages token. Leave it off. See vikunja-patches/README.md.
EOF
helm install -f values.yaml apl ./chart/apl

# 8. watch
kubectl get cm apl-installation-status -n apl-operator -o jsonpath='{.data}'
```

Done when `status` reads `completed`. On a 12-vCPU machine that took **~4 minutes** and **1 attempt**.

---

## 0. Prerequisites ✅

| Needed | This machine |
|---|---|
| Kubernetes ≥ 1.33 | kind v0.32.0 → node image v1.36.1 |
| 6 vCPU / 12 GB RAM | 12 / 31 GB |
| Default StorageClass | kind ships `standard` (`rancher.io/local-path`) |
| LoadBalancer with external IP | **not in kind** → MetalLB, step 3 |
| netpol-capable CNI | **not in kind** → Calico, step 4 |
| DNS zone | **none** → `nip.io`, see step 7 |

Client tools: `kubectl` v1.36.3, `helm` v4.2.2, `kind` v0.32.0, `docker` 29.6.2.

**No host Node.js required.** Every Node step runs inside a container. The machine this was built on
has a broken host Node and never needed it.

Two properties of kind's StorageClass, worth knowing before they look like faults:

- `volumeBindingMode: WaitForFirstConsumer` — PVCs stay `Pending` until a pod is scheduled.
- `rancher.io/local-path` is **ReadWriteOnce only**. Any chart defaulting to `ReadWriteMany` gets a
  permanently `Pending` PVC.

## 1. Reset ✅

```bash
kind delete cluster --name apl
```

That is the whole reset — everything the platform created lives inside the kind node. Verify:

```bash
kind get clusters                                   # 'apl' gone
docker ps -a --filter label=io.x-k8s.kind.cluster   # empty
kubectl config get-contexts                         # no kind-apl
```

Optional cache clears: `rm -rf ~/.kube/cache ~/.cache/helm`.

If the platform's CA was added to your OS or browser trust store, remove it — it is now stale.

## 2. Create the cluster ✅

```bash
kind create cluster --name apl
```

**`kind create cluster` returns before the node is Ready.** Checking immediately shows `NotReady`
with `coredns` `Pending`, which looks like failure but is not — it needs ~15s more.

```bash
kubectl --context kind-apl wait --for=condition=Ready node --all --timeout=120s
kubectl --context kind-apl get nodes -o wide     # one Ready control-plane, v1.33+
kubectl --context kind-apl get storageclass      # standard (default)
```

## 3. LoadBalancer — MetalLB ✅

kind has no LoadBalancer, so the platform's ingress gateway would sit `Pending` forever.

**Derive the range from the live docker network. Never copy it.** The subnet is assigned
dynamically and has been both `172.18.x` and `172.19.x` on this same machine across rebuilds. A
stale address makes MetalLB advertise an unreachable IP, which presents as a platform failure rather
than a configuration mistake.

```bash
docker network inspect kind --format '{{range .IPAM.Config}}{{println .Subnet}}{{end}}'
```

This prints **two** lines — the network is dual-stack:

```
fc00:f853:ccd:e793::/64
172.18.0.0/16
```

**Use the IPv4 line; filter with `| grep -v ':'`.** The pool is IPv4 and `nip.io` needs an IPv4
address.

**The derivation rule:** take the first two octets and append `.255.200` and `.255.250`.
`172.18.0.0/16` → `172.18.255.200-172.18.255.250`. Docker assigns container IPs from the bottom of
the range, so the top of a `/16` is safe.

Then the snippet in the Quickstart. `sleep 60` is upstream's and is sufficient — tested; both
webhooks had endpoints well before the pool was applied.

Expect: `metallb-controller` 1/1, `metallb-speaker` 1/1, `metallb-frr-k8s` 5/5, plus a
`statuscleaner` pod. `helm install` prints `Warning: unrecognized format "cidr"` — harmless.

**Note the `kind` docker network survives `kind delete cluster`.** That is why the subnet is often
stable across rebuilds. It is not a guarantee — derive it every time.

## 4. CNI — Calico ✅

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.3/manifests/calico.yaml
kubectl wait --for=condition=Ready pod -l k8s-app=calico-node -n kube-system --timeout=120s
```

Layered over kind's `kindnet`: both CNI configs end up on the node and kubelet uses the
lexicographically first, so `10-calico.conflist` wins and `kindnet` stays a dormant DaemonSet.
Nothing breaks because no existing pod is recreated. On a purpose-built cluster you would instead
create kind with `disableDefaultCNI: true`.

Calico v3.26.3 is what upstream pins. It is from mid-2023 and was never tested against any
Kubernetes version APL supports — but it works on 1.36.1.

**Nothing to do for metrics-server, LoadBalancer annotations, or the Cluster Autoscaler.** Upstream's
`custom.md` raises all three; none apply to kind. metrics-server is handled by a values setting in
step 7 instead.

## 5. Build the operator image ✅

**Build from a clean context, not the working directory.**

```bash
CTX=$(mktemp -d)
git ls-files -z | tar --null -T - -c | tar -x -C "$CTX"
git fetch --quiet https://github.com/linode/apl-core.git main
APPS_REVISION=$(git merge-base HEAD FETCH_HEAD)
docker build --build-arg VERSION=6.2.1-fork \
             --build-arg APPS_REVISION="$APPS_REVISION" \
             -t apl-core-local:v6.2.1-fork "$CTX"
```

`npm run test:ci` spellchecks every root-level `*.md`, and `docker build .` copies your whole working
tree — so stray local notes fail the build on an unknown word, with an error that looks nothing like
its cause. `.git/info/exclude` hides files from git, not from Docker. Exporting tracked files
sidesteps it and builds exactly what a fresh clone would.

**`APPS_REVISION` is not optional here, and omitting it fails in a way that looks like success.** The
platform does not carry its Argo CD chart definitions inside the image — it pulls them from
`https://github.com/linode/apl-core.git` at a git ref, and that ref comes from
`env.APPS_REVISION || otomi.version` (`src/cmd/apply-as-apps.ts:131`).

So `otomi.version` has to be a container image tag **and** a git ref at the same time. Upstream's
install-from-source page does address this — "set the version to the branch you like to use",
`otomi: version: main` — and it works for them because `linode/apl-core` publishes image tags that
mirror git refs: `main`, branch names and release tags all exist in both namespaces.

**We cannot follow that instruction, and the reason is the point of this fork.** `version: main`
means running upstream's `main` image, which contains none of the fixes this lab depends on. A
locally built image has a tag of our choosing, and that tag is not a git ref. `APPS_REVISION` is what
decouples the two — it is the only way to say "use *this* image but *that* revision". It appears
nowhere in upstream's user documentation; only in their workflow file.

Leave it unset and `v6.2.1-fork` gets resolved as a git ref. It exists in no repository, so every
Argo CD application fails:

```
Failed to load target state: unable to resolve 'v6.2.1-fork' to a commit SHA
```

Nothing Argo CD owns then deploys — including the console and the API. The install still reports
`completed`, every pod is Running and every Helm release is at revision 1, because those come from
the operator's own helmfile pass. The failure is only visible in Argo CD, and as a 404 from the
console hostname. See step 8 for the check that catches it.

Upstream's own CI passes this build arg (`.github/workflows/main.yml`), which is why a published
image never hits this and a hand-run `docker build` does. Reported as
[#10](https://github.com/qvest-digital/apl-core/issues/10); this repo carries no code fix for it, so
the build arg is the whole remedy.

### Which repository, and which revision ⬜

**`APPS_REPO_URL` and `APPS_REVISION` together decide what Argo CD actually deploys.** The platform
is assembled from two halves that must agree:

| half | contains | comes from |
|---|---|---|
| the image you build | `values/*.gotmpl`, `helmfile.d/`, the operator | this working tree |
| what Argo CD fetches | `charts/*` for the ~39 applications | `APPS_REPO_URL` at `APPS_REVISION` |

The image's templates generate values, and those values are handed to the fetched charts. If the two
come from different revisions, a template can set a key the chart at that revision does not have.
Nothing errors — the key is silently dropped. Argo CD still reports Synced and Healthy, because the
chart rendered fine; it just rendered without your setting.

**On this branch the repository must be the fork.** `charts/vikunja` exists nowhere upstream, so
with the default `https://github.com/linode/apl-core.git` the `vikunja` Application never syncs. And
since both halves must match, pointing at the fork means pointing at *this commit* — which must be
pushed first, because Argo CD clones over the network and knows nothing about your working tree.
`APPS_REPO_URL` is a build arg on this branch; upstream only has `APPS_REVISION`.

Using `git rev-parse HEAD` (rather than the `merge-base` the previous version of this file used) is
the direct consequence: the fork now carries charts of its own, so the revision has to be the fork's
commit, not the upstream commit it branches from.

### The older advice: merge-base against upstream ⬜

**Set `APPS_REVISION` to the exact upstream commit this fork is built from.** Not a release tag, and
not the fork's own version. The platform is assembled from two halves that must agree:

| half | contains | comes from |
|---|---|---|
| the image you build | `values/*.gotmpl`, `helmfile.d/`, the operator | this working tree |
| what Argo CD fetches | `charts/*` for the ~39 applications | `linode/apl-core.git` at `APPS_REVISION` |

The image's templates generate values, and those values are handed to the fetched charts. If the two
come from different revisions, a template can set a key the chart at that revision does not have.
Nothing errors — the key is silently dropped. Argo CD still reports Synced and Healthy, because the
chart rendered fine; it just rendered without your setting.

Derive it, never copy it — the fork gets rebased, and a stale SHA reintroduces exactly the skew this
avoids:

```bash
git fetch --quiet https://github.com/linode/apl-core.git main
APPS_REVISION=$(git merge-base HEAD FETCH_HEAD)   # the upstream commit this fork branches from
```

⚠ **Superseded.** This was correct while the fork changed nothing under `charts/`. It no longer
does — see the section above. Kept because the reasoning still explains *why* the two halves have to
agree.

`merge-base` is correct here because this fork's own commits exist only in this repository, so the
most recent shared commit *is* the upstream base. Verified: it resolves to
`05b2e9499e858989de64aecf6c137b646c41c57f`, which is reachable from `linode/apl-core`'s `main`, so
Argo CD can fetch it.

**This corrects an earlier version of this file, which used `APPS_REVISION=v6.2.1`.** That was
justified by "this fork changes nothing under `charts/`, so upstream's `v6.2.1` charts are correct" —
a non-sequitur. The question is not whether *we* changed the charts, it is whether the charts match
*the image*. They did not: `v6.2.1` (2026-08-20) sits on a release branch that is **not an ancestor
of `main`**; this fork sits on `main` (2026-08-24); they diverged on 2026-08-05. Of the 25 chart
paths the applications reference, **8 differed** between those two revisions, including
`kube-prometheus-stack` (85 files) and `external-secrets` (26 files).

One consequence was observed live rather than predicted, and it is the reason to trust this
correction: `charts/apl-operator` at `v6.2.1` predates the readinessProbe that `main` added, so Argo
CD replaced the operator Deployment with a probe-less one and `operator.readiness.gateOnReadiness`
became a setting with nothing to act on. See step 8.

**Not yet re-verified.** The end-state figures in step 8 were recorded with `APPS_REVISION=v6.2.1`.
Since 8 chart paths change, the pod count and the operator's readiness column may both move on the
next clean run. Compare, do not assume.

**Verify the image exists. Do not trust the exit code**, especially through a pipe:

```bash
docker images apl-core-local:v6.2.1-fork
kind load docker-image apl-core-local:v6.2.1-fork --name apl
```

Takes ~4 minutes, mostly `npm ci` and the 535-test suite. `SKIP_TESTS=true` exists but the suite is
what caught two separate build breakages.

**The tag must match `otomi.version` in step 7 exactly.**

### Known limitation: four components float on `main` ⬜

`APPS_REVISION` pins the charts. It does **not** pin the component images, and this lab cannot make
them reproducible. `versions.yaml` in the repo root is checked in with every component set to a
moving branch:

```yaml
api: main       console: main    consoleLogin: main
tasks: main     tools: main      aplCharts: main
```

Observed on this install — mutable tags, re-pulled on every restart:

```
otomi-api      docker.io/linode/apl-api:main      Always
otomi-console  docker.io/linode/apl-console:main  Always
```

`catalogs.default.branch` likewise tracks `apl-charts.git@main`
(`helmfile.d/snippets/defaults.gotmpl:259`). So the console, the API, the task runners and the chart
catalogue can all change without a single change in this repository. Restarting those pods next month
may give you different software, with nothing recording that it happened.

At tag `v6.2.1` the same file is fully pinned (`api: v5.3.0`, `console: v5.2.0`, `tasks: v4.0.0`,
`tools: v2.11.2`, `aplCharts: v1.5.0`). Upstream's release process stamps those versions; building
from a source checkout of `main` skips it — the same root cause as the `APPS_REVISION` trap above.

**Partly fixed on the Vikunja branch.** `helmfile.d/snippets/derived.gotmpl` now merges a `versions`
block from your values over `versions.yaml`, so an installation can pin any component — or point at
a locally built image — without editing a tracked upstream file. That is what step 5b's
`versions: {api: 0.0.0-vikunja, console: 0.0.0-vikunja}` uses.

What is still true: the checked-in defaults float, and **choosing** versions known to work together
is a decision this lab has no basis for making. `tasks`, `consoleLogin`, `tools` and `aplCharts` are
left on `main`. If a browser behavior changes between rebuilds and nothing here explains it, this is
why.

### Optional: build the toolchain image too

The build starts `FROM linode/apl-tools:v3.0.1`. Nothing needs forking to replace it — that image is
built from `tools/Dockerfile` *in this repository*, and derives only from `ubuntu` plus upstream tool
releases. It contains no Linode-provided content; the dependency is publication, not code.

```bash
docker build -t apl-tools-local:v3.0.1 ./tools
docker build --build-arg TOOLS_IMAGE=apl-tools-local:v3.0.1 \
             --build-arg VERSION=6.2.1-fork \
             --build-arg APPS_REVISION="$APPS_REVISION" \
             -t apl-core-local:v6.2.1-fork "$CTX"
```

Verified: same image size as the published one, full suite passes on it.

## 6. Generate the chart schema ✅

```bash
bin/gen-chart-schema.sh
```

**Not optional.** `chart/apl/values.schema.json` is generated and gitignored, exactly as upstream has
it. Upstream's release pipeline regenerates it before `helm package`, so their users always get it
inside the published chart. Installing from a source checkout skips that pipeline — and without the
file Helm validates **nothing**. It does not warn; it silently accepts any values, and a missing
`domainSuffix` becomes a confusing failure inside the operator instead of a clear error.

Re-run it whenever `values-schema.yaml` changes. It is Docker-only and needs no host Node.

## 7. Install ✅

The `values.yaml` from the Quickstart. Five things in it are load-bearing:

- **`domainSuffix`** — the base hostname every app hangs off (`console.<suffix>`, `keycloak.<suffix>`).
  With a real domain you would use it directly. We own none, so we use `nip.io`, a public resolver
  that returns whatever IP is embedded in the hostname. **It must match the MetalLB pool's first
  address.** Nothing generates it automatically, despite comments in `chart/apl/values.yaml` and
  `apps.yaml` claiming a `*.nip.io` domain "will be created".
- **`defaultStorageClass: standard`** — kind's default class. Safe to keep explicit even though
  [#3](https://github.com/qvest-digital/apl-core/pull/3) makes `''` work.
- **`otomi.coreImageRepository` / `coreImagePullPolicy`** — point the platform at your local image
  and stop it trying to pull a tag that exists in no registry.
- **`metrics-server.extraArgs`** — kind does not enable kubelet serving-certificate bootstrapping,
  so metrics-server rejects the kubelets' self-signed certs without `--kubelet-insecure-tls=true`.
  Upstream adds this automatically only for `provider: linode`.
- **`operator.installRetries: 3`** ⬜ — without it the operator retries a failed install **1000**
  times (`chart/apl/values.yaml`, `src/operator/validators.ts`). [#5](https://github.com/qvest-digital/apl-core/pull/5)
  made the operator honour this setting, which it previously ignored outright — but it left the
  default at 1000, so the unbounded-retry behavior that PR was written to stop is still what you get
  unless you set it. On a lab, a failure that cannot self-heal should surface in minutes, not drive
  releases to revision 37. A healthy install never reaches attempt 2, so this costs nothing when
  things go right. Not yet exercised against a failing install.

Render before installing — this is upstream's own validation step, it costs a second, and with the
schema from step 6 in place it is what turns a missing setting into a named error:

```bash
helm template -f values.yaml apl ./chart/apl >/dev/null    # exit 0 == values valid and renders
```

```bash
helm install -f values.yaml apl ./chart/apl
```

Note `./chart/apl` — the local directory, **not** `apl/apl` from the published repo.

Helm returns in seconds and reports success; that only means the operator was deployed.
`Chart.yaml` carries release-time placeholders, so `helm list` shows chart
`apl-0.0.0-chart-version` / `APP_VERSION_PLACEHOLDER`. Cosmetic — `otomi.version` drives the real
image. Check with `kubectl get deploy apl-operator -n apl-operator -o jsonpath='{..image}'`.

## 8. Watch the install ✅

```bash
kubectl get cm apl-installation-status -n apl-operator -o jsonpath='{.data}'
kubectl logs -n apl-operator -l app.kubernetes.io/name=apl-operator -f
```

```json
{"attempt":"1","installationMode":"standard","status":"completed","timestamp":"..."}
```

**Watch `attempt` as well as `status`.** A climbing `attempt` is the signature of the unbounded
retry loop; against a fixed operator it should stay at 1.

**The operator pod's readiness column is not an install gate**, whatever it reads. With the default
`operator.readiness.gateOnReadiness: false`, the probe is a `pgrep` for the operator process
(`chart/apl/templates/deployment.yaml`), so the pod reports `0/1` only for the first
`initialDelaySeconds: 30`, then `1/1` while the install is still running. Set
`gateOnReadiness=true` if you want `helm install --wait` to block, with `--timeout 30m`.

⚠ **Observed with `APPS_REVISION=v6.2.1`: `1/1 Running` with no readinessProbe at all.** Argo CD
replaces the operator Deployment with `charts/apl-operator` fetched at `APPS_REVISION`, and the
`v6.2.1` chart predates the probe that `main` added — so the probe silently disappeared and
`gateOnReadiness` had nothing to act on. That is the skew described in step 5, caught here.

**On the next clean run, with `APPS_REVISION` derived from `merge-base`, expect the probe to survive
the handover** — the fetched chart and the image then agree. Check it explicitly, because this is the
cheapest single indicator that the two halves match:

```bash
kubectl get deploy apl-operator -n apl-operator \
  -o jsonpath='{.spec.template.spec.containers[0].readinessProbe.exec.command}{"\n"}'
# expect a pgrep command; empty output means the chart and the image disagree -- see step 5
```

An earlier version of this file claimed the pod sits at `0/1` *throughout*. It does not, under either
revision.

Completion checks:

```bash
kubectl get pods -A --no-headers | awk '$4!="Running" && $4!="Completed"'   # empty == healthy
helm list -A                                                               # all REVISION 1
kubectl get svc -A -o wide | grep -i loadbalancer                          # must match domainSuffix
```

**Those three are not sufficient.** They pass on a platform whose GitOps layer never ran — that is
exactly the `APPS_REVISION` failure in step 5, which reports `completed`, 40/40 pods Running and
every release at revision 1 while the console does not exist. The pods and releases you are looking
at were deployed by the operator's own helmfile pass; everything Argo CD owns is a separate layer
that can fail silently.

Check that layer explicitly:

```bash
# every application must be Synced + Healthy -- output should be empty
kubectl get applications -n argocd \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status' \
  --no-headers | awk '$2!="Synced" || $3!="Healthy"'

# the console must have a route, and the otomi namespace must have pods
kubectl get httproute -A | grep console
kubectl get pods -n otomi
```

`SYNC: Unknown` on every application is the signature. The reason is one field away:

```bash
kubectl get application otomi-otomi-console -n argocd -o jsonpath='{.status.conditions}'
```

Then the end-to-end check — the platform gateway answering for its own hostname:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://console.$(kubectl get cm welcome -n apl-operator \
  -o jsonpath='{.data.consoleUrl}' | sed 's|https://console\.||')/
```

**404 from `server: istio-envoy` means TLS worked and no route matched** — the gateway is fine, the
app behind it was never deployed. Do not read a 404 as a certificate or DNS problem; it is the
opposite, it proves both are working.

Observed on a clean run with `APPS_REVISION` set: **~4 minutes** to `completed`, attempt **1**, then
a further **~5 minutes** for Argo CD to converge. End state: **55 pods** Running/Completed, **39/39
applications Synced + Healthy**, **20 Helm releases** all at **revision 1**, `platform-istio` holding
the pool's first address.

⚠ **These figures were recorded with `APPS_REVISION=v6.2.1`, which step 5 now corrects.** They were
reproduced exactly on a second clean run, so they are solid *for that revision* — but 8 of the 25
chart paths change when `APPS_REVISION` is derived from `merge-base`, so the pod count in particular
may shift. Treat them as the previous baseline to compare against, not as the target. Re-record them
after the next clean run and delete this note.

**55 pods, not 40.** The earlier figure in this file was recorded from a run where `APPS_REVISION`
was unset, so everything Argo CD owns — the console, the API, Prometheus, the addons — was missing.
A pod count well below this is the same symptom.

The gateway takes the *first free address in the pool*. If something else claims a LoadBalancer
address first, `domainSuffix` no longer matches and hostnames break.

## 9. Post-install ✅

### Credentials ✅

**Upstream's first command does not work.** The
[post-installation page](https://techdocs.akamai.com/app-platform/docs/post-installation-steps)
gives `kubectl get configmap welcome -n apl-operator -o y`, and `-o y` is not a valid output format —
it is a truncated `-o yaml`:

```
error: unable to match a printer suitable for the output format "y",
allowed formats are: ...,jsonpath,...,yaml
```

Use `-o yaml`. The two credential commands on that page are correct as written.

This grabs all three values, prints them, and leaves a copy in `passwords.txt`:

```bash
CTX_ARG="--context kind-apl"
CONSOLE=$(kubectl $CTX_ARG get cm welcome -n apl-operator -o jsonpath='{.data.consoleUrl}')
USERNAME=$(kubectl $CTX_ARG get secret platform-admin-initial-credentials -n keycloak \
             -o jsonpath='{.data.username}' | base64 -d)
PASSWORD=$(kubectl $CTX_ARG get secret platform-admin-initial-credentials -n keycloak \
             -o jsonpath='{.data.password}' | base64 -d)

# Fail loudly rather than writing a file full of empty strings.
[ -n "$CONSOLE" ] && [ -n "$USERNAME" ] && [ -n "$PASSWORD" ] || {
  echo "one or more values came back empty -- is the install actually completed?" >&2; }

umask 077
cat > passwords.txt <<EOF
# App Platform local lab -- initial credentials
# Generated by SETUP.md step 9. Gitignored. Delete with the cluster.
console:  $CONSOLE
username: $USERNAME
password: $PASSWORD
EOF
chmod 600 passwords.txt
cat passwords.txt
```

Expected shape on a `nip.io` install:

```
console:  https://console.172.18.255.200.nip.io
username: platform-admin@172.18.255.200.nip.io
password: <20-odd random characters>
```

**Keycloak marks this credential temporary and forces a change on first login**, so `passwords.txt`
records the *install-time* secret, not a live view. Reusing the same string at the prompt is accepted
and keeps the file accurate; choosing a new one silently invalidates it — update the file by hand if
you do, because nothing regenerates it.

**Yes, this writes a password to disk in cleartext.** That is a deliberate choice for *this* lab and
nowhere else: the cluster is local, it is disposable, the credential is auto-generated at install and
is worthless the moment the cluster is deleted — and the alternative is re-running two `base64 -d`
pipelines every time you need to log in. `passwords.txt` is in `.gitignore` and written `0600`.
`kind delete cluster` invalidates it; delete the file at the same time.

Argo CD and the git server keep their own initial secrets, if you need them:

```bash
kubectl $CTX_ARG get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d
kubectl $CTX_ARG get secret git-server-credentials -n git-server -o jsonpath='{.data}'
```

### Reaching the login screen ✅

Verified end to end. From the host, unauthenticated:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://console.<pool-ip>.nip.io/          # 403
curl -sk -D- -o /dev/null https://console.<pool-ip>.nip.io/oauth2/start | grep location
# location: https://keycloak.<pool-ip>.nip.io/realms/otomi/protocol/openid-connect/auth?...
```

**A 403 on `/` here is correct and is not the 404 failure from step 8.** It carries an HTML body
titled "Login Redirect" — oauth2-proxy's unauthenticated interstitial. The distinction that matters:

| Response | Meaning |
|---|---|
| 404, empty body | no route — the GitOps layer never deployed. See step 8 |
| 403, empty body | route exists, `oauth2-proxy` not ready yet — wait |
| 403, HTML body | working as designed; a browser proceeds to Keycloak |

In a browser this lands on Keycloak's "Sign in to your account" page, over TLS, with the OIDC
parameters intact. That path is confirmed working on this machine.

`oauth2-proxy` blocks on an init container `wait-for-keycloak`, so the console returns a bare 403
for a minute or two after the install reports `completed`. That is startup ordering, not a fault.

### Remaining post-install ✅

**Credentialed login is proven.** Signing in at the Keycloak page with the credentials above
succeeds and lands in the console. Verified by hand in a browser on this machine — there is no
command in this file that covers it, and there is no substitute for doing it once.

**The console is served with the platform's own CA, so the browser will warn.** Click through it.

**Do not install that CA into your OS or browser trust store for this lab.** Upstream's
[post-installation steps](https://techdocs.akamai.com/app-platform/docs/post-installation-steps)
offer a "Download CA" option and `security add-trusted-cert` / `certutil` instructions; they are not
worth it here. The CA is regenerated every time the cluster is rebuilt, so each rebuild leaves a
stale root certificate behind in your trust store — a cleanup burden that outlasts the lab, in
exchange for skipping one browser warning.

For the same reason, `curl` against platform hostnames uses `-k` throughout this file.

Note that upstream's page says trust is only needed "when using Let's Encrypt staging certificates".
That is wrong for this install: `apps.cert-manager.issuer` defaults to `custom-ca`
(`helmfile.d/snippets/defaults.yaml`), so the generated CA signs every hostname here and the warning
appears regardless.

### Two console settings this lab does not need ✅

Upstream's post-install page has two steps with no `values.yaml` equivalent. **Neither is needed
here.** Both were investigated rather than skipped, so the reasoning is recorded below.

**Kubernetes API URL** (Platform → Settings → Cluster) — skip.

`cluster.apiServer` is read **nowhere in this repository** — it appears only as a schema declaration
and in one test fixture. Its whole purpose is stated in `values-schema.yaml`: *"Used to generate
KUBECONFIG for download, for local access to target cluster."* It fills the `server:` field of the
kubeconfig a **team member** downloads from the console, so developers get scoped `kubectl` access
without an admin issuing credentials by hand. With a single admin using the `kind-apl` context, it
does nothing.

It would not work here even if set: that kubeconfig authenticates via OIDC, which requires
`--oidc-issuer-url` and friends on the **kube-apiserver** itself. That is a control-plane flag, set
by whoever builds the cluster — nothing in this repository configures it, and nothing running as a
workload could. Making it work means recreating the kind cluster with kubeadm patches pointing at
`https://keycloak.<domainSuffix>/realms/otomi`. That is a project, not a setting.

**Object Storage** (Platform → Settings → Object Storage) — select `Disabled`.

`obj.provider.type` accepts exactly two values (`values-schema.yaml`): `linode` and `disabled`,
defaulting to `disabled`. **There is no in-cluster option** — no MinIO, no Ceph, nothing under
`charts/`. It is external Linode Object Storage or nothing, and on a local lab there is no bucket to
point at. `disabled` is already the default, which is why the install is healthy without touching it.

The cost is that **Loki, Harbor, Kubeflow Pipelines and the CloudNativePG backups cannot be
activated**. Nothing currently running is affected.

Worth knowing if that ever becomes a limitation: the Linode coupling is one hardcoded hostname, not
an architectural one. Every consumer takes a plain S3 endpoint, derived from the region:

```gotmpl
values/loki/loki.gotmpl:133              s3: https://{{ $obj.linode.region }}.linodeobjects.com
values/harbor/harbor.gotmpl:152          regionendpoint: https://{{ $obj.linode.region }}.linodeobjects.com
values/harbor/harbor-otomi-db.gotmpl:41  endpointURL: https://{{ $obj.linode.region }}.linodeobjects.com
```

A generic `s3` provider type with a settable endpoint would let those apps run against an in-cluster
MinIO — and would unblock AWS, Ceph and on-prem users too. Not attempted here.

### The "Configure Git Repository" popup — dismiss it ✅

On first login the console opens a dialog recommending an external Git repo over the built-in one,
naming `https://git.<domainSuffix>/otomi/values`. **Dismiss it. The internal repo is the right
choice for this lab.**

What it is pointing at matters more than the recommendation. App Platform is GitOps-based, so the
cluster is *not* the source of truth for its own configuration — every change made in the console is
committed as YAML to the `otomi/values` repository, and Argo CD reconciles the cluster toward it.
That repo is the platform's configuration. The `values.yaml` from step 7 ends up there too: the
operator reads it once at startup from Secret `apl-values` and then hands ownership to git, which is
exactly why "Changing values after install" below warns that `helm upgrade` alone stops being the
way to change things.

Upstream's warning is about a real circularity. On this install the repo is served by:

```
image:  linode/apl-http-git-server:v0.2.2   (single replica)
pvc:    git-server-data, 256Mi, RWO, storageClass standard
```

On kind, `standard` is `rancher.io/local-path` — a directory on the one node. So the repository
describing how to rebuild the cluster lives inside that cluster, with no replica and no backup. In
production you also give up pull-request review, an audit trail and any disaster recovery that does
not start with "the thing we need is gone."

None of that applies here: the cluster is deliberately disposable, `kind delete cluster` is the
documented reset, and the config is meant to die with it. Migrating would instead push this lab's
generated secrets to a hosted repo and require real credentials to do it. If you ever do want an
external repo, set it **at install time** rather than migrating afterwards — `otomi.git.repoUrl` /
`username` / `password` / `email` / `branch` are real values keys, defaulted in
`helmfile.d/snippets/defaults.yaml`.

**There is no setting that suppresses this dialog.** Confirmed against this repository:

- `apps.otomi-console` is `additionalProperties: false` and permits only `enabled`, `resources` and
  `_rawValues` (`values-schema.yaml`) — nothing can be injected through it.
- The console Deployment receives exactly two environment variables, `API_BASE_URL` and
  `CONTEXT_PATH` (`values/otomi-console/otomi-console.gotmpl`). Verified on the running pod.
- `otomi.git` takes credentials only; it has no display flag.

The dialog lives in the `linode/apl-console` image, which is built from a different repository and
is **not** part of this fork. Note the console runs tag `main`, unpinned
(`docker.io/linode/apl-console:main`), so this behavior can change without any change here.

Worth reporting upstream: the same pattern already exists for the sibling wizard — `obj.showWizard`
(`values-schema.yaml`, default `true`) suppresses the Object Storage dialog. There is no
`otomi.git.showWizard` to match it. That asymmetry looks like an oversight rather than a decision.

Before dismissing it, open `https://git.<domainSuffix>/otomi/values` once and read the YAML. It is
the clearest illustration of what the platform believes its own state to be.

**Health is not proven by pods Running, nor by Argo CD reporting Healthy.** The platform issues its
own CA (`clusterissuer/custom-ca`, wildcard cert in `istio-system/otomi-cert-manager-wildcard-cert`).
What has actually been proven on this machine:

- **TLS** ✅ — `clusterissuer/custom-ca` is `READY=True` and `otomi-wildcard` issued; a browser
  reaches the console over HTTPS after clicking through the warning. Chain verification against the
  CA (`openssl s_client -CAfile <ca>`) was not run — the CA is deliberately not trusted here.
- **SSO** ✅ — the OIDC redirect chain reaches Keycloak's sign-in page, and a credentialed login
  completes through to the console. That covers oauth2-proxy, the Keycloak realm, the client
  registration and the callback. Verified by hand in a browser; Keycloak being Running proves none
  of it on its own.

### Not needed here, despite the upstream Helm page ✅

Upstream's [Helm install page](https://techdocs.akamai.com/app-platform/docs/helm) says to "add
`dns` configuration appropriate for your environment". **Skip it.** The `dns:` block feeds
external-dns only, which is gated on `otomi.hasExternalDNS` — default `false`
(`helmfile.d/snippets/defaults.yaml`, gate in `helmfile.d/snippets/derived.gotmpl`). `nip.io` is a
public resolver and needs no zone. Verified on this install: no external-dns pod is deployed.

Note the related inaccuracy in `chart/apl/values.yaml`, which says `domainSuffix` "needs to be set
when `hasExternalDNS` is set to true". This lab sets it with `hasExternalDNS: false` and the install
succeeds — which is what [#4](https://github.com/qvest-digital/apl-core/pull/4) and
[#6](https://github.com/qvest-digital/apl-core/pull/6) encode.

## 10. Vikunja ⬜

Only relevant on `feat/vikunja-integration`. The design, the reasoning and everything that was
measured live in `VIKUNJA.md`; this is the check list.

**Never run on a cluster.** Every step below is unverified. The container behavior behind it is
not — see `VIKUNJA.md` Phase 4 for exactly what was measured and how.

```bash
D=$(kubectl get httproute gitea -n gitea -o jsonpath='{.spec.hostnames[0]}' | sed 's/^gitea\.//')

# 1. the app itself
kubectl get pods -n vikunja
kubectl get cluster -n vikunja                      # CNPG, expect Cluster in healthy state
kubectl get externalsecrets -n vikunja              # all SecretSynced
kubectl get jobs -n vikunja                         # vikunja-bootstrap-admin, 1/1

# 2. it answers, AND it found the identity provider.
#    An empty providers list is the failure this integration is most likely to hit:
#    the pod is Running and Ready either way.
kubectl exec -n vikunja deploy/vikunja -- /app/vikunja/vikunja version
curl -sk "https://vikunja.$D/api/v1/info" | jq '.auth.openid_connect'

# 3. the tile. Empty output means the apl-api image from step 5b did not land.
curl -sk -H "Authorization: Bearer $ID_TOKEN" "https://api.$D/v1/apps" | jq '.[] | select(.id=="vikunja")'
```

Then in a browser: `/apps/admin` shows a Vikunja tile with its logo linking to `https://vikunja.$D/`;
a team view shows the same tile with the same URL (that is `isShared` working); and the Vikunja login
page offers **otomi-idp**, which round-trips through Keycloak and creates the account on first login.

If `providers` is `[]`, check in this order: the `custom-ca` secret exists in the `vikunja`
namespace, the pod actually mounted it, and Keycloak was reachable when the pod last started. With
`requireavailability: true` the pod should be crash-looping rather than serving without SSO — if it
is serving with an empty list, that setting did not reach the config.

Team sync is off. It needs a patched `apl-tasks` image that cannot be built without a GitHub
Packages token — `vikunja-patches/README.md` has the details.

## Changing values after install

Values live in Secret `apl-values` (namespace `apl-operator`) and are read by the operator **only at
startup**, so a `helm upgrade` alone changes nothing:

```bash
helm upgrade --force-conflicts -f values.yaml apl ./chart/apl
kubectl rollout restart deploy/apl-operator -n apl-operator
```

**`--force-conflicts` is required.** The operator writes `.data.status` on the
`apl-installation-status` ConfigMap directly, becoming a competing field manager. Helm 4 defaults to
server-side apply and rejects the second writer; Helm 3's client-side apply would have overwritten
silently. Without the flag the change still lands, but the release is left `STATUS: failed` and
`helm list` misreports a healthy platform. See
[#2](https://github.com/qvest-digital/apl-core/issues/2).

⚠ Only while the install has **not** completed. Once `apl-installation-status` reads `completed`,
configuration lives in the git values repo and restarting the operator can re-run bootstrap and
regenerate the platform CA.

## Traps

Each of these cost real time.

| Trap | Consequence |
|---|---|
| `docker build ... \| tail` | reports *tail's* exit code — a failed build looks successful and produces no image |
| Building from the working directory | local `*.md` files fail the build's spellcheck |
| Skipping `bin/gen-chart-schema.sh` | Helm validates nothing, silently |
| Copying a MetalLB range from notes | MetalLB advertises an unreachable IP |
| `domainSuffix` not matching the pool | every platform hostname resolves to the wrong place |
| `helm uninstall apl` as a "reset" | removes the operator only; every operator-created release survives |
| `docker system prune -a` | destroys unrelated projects' containers, images and volumes |
| Verifying step 2 before the node is Ready | looks like a broken cluster; it just needs ~15s |
