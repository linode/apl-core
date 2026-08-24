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

Two open items not fixed here: [#2](https://github.com/qvest-digital/apl-core/issues/2) (`helm
upgrade` server-side-apply conflict, worked around below) and upstream's `custom.md` inaccuracies.

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
CTX=$(mktemp -d)
git ls-files -z | tar --null -T - -c | tar -x -C "$CTX"
docker build --build-arg VERSION=6.2.1-fork -t apl-core-local:v6.2.1-fork "$CTX"
docker images apl-core-local:v6.2.1-fork        # MUST show the image; do not trust the exit code
kind load docker-image apl-core-local:v6.2.1-fork --name apl

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
apps:
  metrics-server:
    extraArgs: ["--kubelet-insecure-tls=true"]
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
docker build --build-arg VERSION=6.2.1-fork -t apl-core-local:v6.2.1-fork "$CTX"
```

`npm run test:ci` spellchecks every root-level `*.md`, and `docker build .` copies your whole working
tree — so stray local notes fail the build on an unknown word, with an error that looks nothing like
its cause. `.git/info/exclude` hides files from git, not from Docker. Exporting tracked files
sidesteps it and builds exactly what a fresh clone would.

**Verify the image exists. Do not trust the exit code**, especially through a pipe:

```bash
docker images apl-core-local:v6.2.1-fork
kind load docker-image apl-core-local:v6.2.1-fork --name apl
```

Takes ~4 minutes, mostly `npm ci` and the 535-test suite. `SKIP_TESTS=true` exists but the suite is
what caught two separate build breakages.

**The tag must match `otomi.version` in step 7 exactly.**

### Optional: build the toolchain image too

The build starts `FROM linode/apl-tools:v3.0.1`. Nothing needs forking to replace it — that image is
built from `tools/Dockerfile` *in this repository*, and derives only from `ubuntu` plus upstream tool
releases. It contains no Linode-provided content; the dependency is publication, not code.

```bash
docker build -t apl-tools-local:v3.0.1 ./tools
docker build --build-arg TOOLS_IMAGE=apl-tools-local:v3.0.1 \
             --build-arg VERSION=6.2.1-fork -t apl-core-local:v6.2.1-fork "$CTX"
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

The `values.yaml` from the Quickstart. Four things in it are load-bearing:

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

The operator pod sits at **`0/1 Running`** throughout, and that is correct — readiness is a process
check, not an install gate. Set `operator.readiness.gateOnReadiness=true` if you want
`helm install --wait` to block, with `--timeout 30m`.

Completion checks:

```bash
kubectl get pods -A --no-headers | awk '$4!="Running" && $4!="Completed"'   # empty == healthy
helm list -A                                                               # all REVISION 1
kubectl get svc -A -o wide | grep -i loadbalancer                          # must match domainSuffix
```

Observed on a clean run: **~4 minutes**, attempt **1**, **40/40 pods Running**, every release at
**revision 1**, `platform-istio` holding the pool's first address.

The gateway takes the *first free address in the pool*. If something else claims a LoadBalancer
address first, `domainSuffix` no longer matches and hostnames break.

## 9. Post-install ⬜

**Not yet executed.** Written from the platform's own `welcome` ConfigMap and upstream docs; treat
as unverified until someone runs it.

```bash
kubectl get configmap welcome -n apl-operator -o jsonpath='{.data.consoleUrl}'
kubectl get secret platform-admin-initial-credentials -n keycloak -o jsonpath='{.data.username}' | base64 -d
kubectl get secret platform-admin-initial-credentials -n keycloak -o jsonpath='{.data.password}' | base64 -d
```

On a `nip.io` install these come out as `https://console.<pool-ip>.nip.io` and
`platform-admin@<pool-ip>.nip.io`.

**Health is not proven by pods Running, nor by Argo CD reporting Healthy.** The platform issues its
own CA (`clusterissuer/custom-ca`, wildcard cert in `istio-system/otomi-cert-manager-wildcard-cert`).
To actually prove it:

- **TLS** — fetch the CA and check the chain with `openssl s_client -CAfile <ca>`.
- **SSO** — log in to the console for real. Keycloak being Running says nothing about whether the
  OIDC flow completes.

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
