# APL local lab on kind — reproducible setup

Brings up Akamai App Platform on a local `kind` cluster, installed **from this fork** with an
operator image you build yourself.

Takes roughly **15 minutes**, most of it the image build and the platform install. Needs ~30 GB free
disk, 6+ vCPU, 12+ GB RAM.

**Status legend:** ✅ verified on this machine · ⬜ written but not yet executed

Only steps marked ✅ have actually been run. Nothing here is copied from upstream documentation
without checking it.

✅ **This file has now been run start to finish in its current form**, including steps **6b** and
**6c** (the replaced root CA and the operator-supplied API key), with Gitea, Harbor, Vikunja and
Turnstone all enabled. `completed` at attempt 1, then 61/61 Argo CD applications Synced + Healthy.
The figures in step 8 are from that run.

That run also found three real bugs, all fixed here and all invisible to any pre-install check:
the Turnstone migrate Job deadlocked Argo CD's PreSync phase; Turnstone's one-shot OIDC discovery
raced Keycloak and left SSO silently disabled on a healthy-looking pod; and the bootstrap Job's
`kubectl wait` gate failed fast instead of waiting. See §11.

✅ Since verified by hand in a browser: SSO round-trips into **both** Turnstone and Vikunja from
the console tiles with **no** sign-in click, and role mapping produces the intended rows for a
platform admin, a team admin and a plain team member.

⬜ Still unproven: one real agent turn against the Claude API, and the remaining §11.7 checks.

If you only want the previously-verified lab, set `apps.turnstone.enabled: false` and skip 6b and
6c entirely; nothing else in this file depends on them.

If you are an agent working through this file, read [`CLAUDE.md`](CLAUDE.md) first — it carries the
operational rules and the traps that are expensive to rediscover.

---

## Fastest path: `task`

✅ This whole runbook — every step below, plus every trap in the table in "Why from this fork" —
is encoded as a [`go-task`](https://taskfile.dev/installation/) `Taskfile.yml` (`Taskfile.yml` +
`.taskfiles/*.yml` in the repo root). Use it instead of copy-pasting the steps below by hand:

```bash
task setup                            # everything, Gitea/Harbor/Tekton/Vikunja/Turnstone all on
ANTHROPIC_API_KEY=sk-ant-... task setup   # non-interactive (Turnstone needs a key -- see step 6c)
task setup TURNSTONE_ENABLED=false    # skip Turnstone, no key needed
task verify:platform                  # re-run the health checks any time against an up cluster
task down CONFIRM=yes                 # destructive: deletes the cluster and generated local state
task --list                           # every other sub-task (build one image, watch the install, ...)
```

Installing `go-task`: see the [official install docs](https://taskfile.dev/installation/) for your
platform. **The installed binary is not always named `task`** — e.g. Arch/CachyOS's `go-task`
package installs a binary literally called `go-task`; check `which task go-task` and use whichever
exists. Every command above is written as `task` for readability but works identically as
`go-task`.

This file (`SETUP.md`) is still what the Taskfile encodes and what its comments cite section-by-
section — read on if `task setup` fails and you need to understand *why* a step exists, or if
you're changing what the lab does and need to update both.

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

# 5b. Vikunja and Turnstone both need a patched apl-api (the AppList enum) and apl-console (the
#     tile logo). Everything is tagged with the names the charts already expect, so no registry
#     is involved. See vikunja-patches/README.md and turnstone-patches/README.md for the full
#     explanation.
#
#     There is ONE apl-api image and ONE apl-console image, so each must carry BOTH apps' changes.
#     Order matters: the turnstone apl-api patch has `- vikunja` in its context lines.
VP=$PWD/vikunja-patches
TP=$PWD/turnstone-patches
rm -rf /tmp/apl-api /tmp/apl-console
git clone --depth 1 https://github.com/linode/apl-api.git /tmp/apl-api
git -C /tmp/apl-api apply "$VP/apl-api.patch"
git -C /tmp/apl-api apply "$TP/apl-api.patch"
grep -qE '^\s+- turnstone$' /tmp/apl-api/src/openapi/app.yaml || echo "AppList missing turnstone -- no tile"
#     Bake in THIS values-schema. npm runs in a container: the host Node is broken on this
#     machine and CLAUDE.md requires that no step need it. See "Do not run npm on the host".
#     Without this the Console renders an EMPTY settings form for Turnstone -- including the
#     anthropicApiKey field, which is the one value an operator has to fill in by hand.
docker run --rm --user "$(id -u):$(id -g)" \
  -v /tmp/apl-api:/w -v "$VP/..":/core:ro -w /w -e APL_CORE_PATH=/core \
  linode/apl-tools:v3.0.1 npm run schema:sync
diff -q "$VP/../values-schema.yaml" /tmp/apl-api/src/values-schema.yaml   # must print nothing
docker build -t docker.io/linode/apl-api:v0.0.0-turnstone /tmp/apl-api
docker images docker.io/linode/apl-api:v0.0.0-turnstone
kind load docker-image docker.io/linode/apl-api:v0.0.0-turnstone --name apl

git clone --depth 1 https://github.com/linode/apl-console.git /tmp/apl-console
cp "$VP/apl-console/public/logos/vikunja_logo.svg" /tmp/apl-console/public/logos/
cp "$TP/apl-console/public/logos/turnstone_logo.svg" /tmp/apl-console/public/logos/
docker build -t docker.io/linode/apl-console:v0.0.0-turnstone /tmp/apl-console
docker images docker.io/linode/apl-console:v0.0.0-turnstone
kind load docker-image docker.io/linode/apl-console:v0.0.0-turnstone --name apl

# 6. generate the chart schema -- REQUIRED, silently skipped validation otherwise
bin/gen-chart-schema.sh

# 6b. root CA -- REQUIRED if you enable Turnstone, or any other app whose TLS stack is Python's.
#     The platform generates its own root CA when you leave these empty, and that one carries no
#     subjectKeyIdentifier -- so cert-manager cannot put an authorityKeyIdentifier on the leaves it
#     issues, and Python 3.13+ (VERIFY_X509_STRICT, enforced by OpenSSL 3.5) refuses the chain with
#     "Missing Authority Key Identifier". Go apps never notice and `openssl verify` says OK, so this
#     is invisible unless you test with Python. Full account in TURNSTONE.md section 3.
#     MUST be done before the install below: retrofitting it onto a bootstrapped cluster pairs your
#     new key with the OLD certificate (see step 7).
openssl req -x509 -newkey rsa:4096 -nodes -keyout /tmp/apl-ca.key -out /tmp/apl-ca.crt \
  -days 3650 -sha256 -subj "/C=NL/ST=Utrecht/L=Utrecht/O=Otomi/OU=Development" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,digitalSignature,keyCertSign,cRLSign" \
  -addext "subjectKeyIdentifier=hash"
openssl rsa -traditional -in /tmp/apl-ca.key -out /tmp/apl-ca.pkcs1.key   # match what the platform emits
openssl x509 -in /tmp/apl-ca.crt -noout -text | grep -q 'Subject Key Identifier' \
  && echo "CA has a subjectKeyIdentifier -- good" || echo "CA IS WRONG, Turnstone SSO will fail"

# 6c. your Anthropic API key -- REQUIRED if you enable Turnstone.
#     Turnstone talks to the Claude API and there is nothing to generate here: this is the one
#     value you have to supply yourself. Without it the install still completes and SSO still
#     works, but the turnstone-anthropic-key ExternalSecret never syncs and both Turnstone pods
#     sit in CreateContainerConfigError.
#     Get one at https://console.anthropic.com/settings/keys -- it starts with `sk-ant-`.
read -rsp 'Anthropic API key (sk-ant-...): ' ANTHROPIC_API_KEY; echo
[ -n "$ANTHROPIC_API_KEY" ] || echo "empty -- Turnstone will not start; set apps.turnstone.enabled: false instead"

# 7. values + install
#    NOTE: values.yaml carries two secrets now (the CA private key and your API key), which is why
#    .git/info/exclude has a bare `values.yaml` line. Keep it that way -- and see the Traps section,
#    because that same line hides a newly vendored chart's own values.yaml from git add -A.
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
  # kind-loaded image needs. 'turnstone' as a tag would be treated as a branch and pulled Always.
  api: 0.0.0-turnstone
  console: 0.0.0-turnstone
# This is a single-node lab, so every HA-oriented default (2+ Postgres instances per app, 2-3
# replica HPA floors on argocd-repo-server/istiod/the ingress gateway) is pure waste -- it bought
# nothing (there is no second node to fail over to) while costing real memory. Confirmed live on
# 2026-08-26: dropping all of this to 1 replica saved ~860Mi node memory / ~560Mi pod-sum with zero
# loss of function. See databases/gitea.yaml etc in the otomi/values repo for where these actually
# live post-install -- this block only sets the install-time starting point.
databases:
  gitea:
    replicas: 1
  harbor:
    replicas: 1
  keycloak:
    replicas: 1
  turnstone:
    replicas: 1
  vikunja:
    replicas: 1
ingress:
  platformClass:
    gateway:
      replicas: 1
      autoscaling:
        minReplicas: 1
apps:
  argocd:
    autoscaling:
      repoServer:
        minReplicas: 1
  istio:
    autoscaling:
      pilot:
        minReplicas: 1
      egressgateway:
        minReplicas: 1
  metrics-server:
    extraArgs: ["--kubelet-insecure-tls=true"]
  cert-manager:
    # From step 6b. BOTH are required: src/cmd/bootstrap.ts checks
    # \`if (cm.customRootCA && cm.customRootCAKey)\` and silently generates and uses its own weak CA
    # if either is missing.
    customRootCA: |
$(sed 's/^/      /' /tmp/apl-ca.crt)
    customRootCAKey: |
$(sed 's/^/      /' /tmp/apl-ca.pkcs1.key)
  # Apps default to false upstream, which means clicking Activate in the console after every
  # rebuild. Enabling them here rather than in helmfile.d/snippets/defaults.yaml keeps the fork's
  # deviation from upstream to this file. See step 7.
  gitea:
    enabled: true
  harbor:
    enabled: true
  tekton:
    enabled: true
  vikunja:
    enabled: true
  turnstone:
    enabled: true
    # The only operator-supplied secret in the whole file. Sealed like any other x-secret, so it
    # never reaches the values repo, and never reaches Turnstone's database either -- the model
    # definition stores the literal \${ANTHROPIC_API_KEY} and Turnstone expands it from the pod
    # environment. See TURNSTONE.md section 2.
    anthropicApiKey: $ANTHROPIC_API_KEY
EOF
chmod 0600 values.yaml
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

### Do not run npm on the host ✅

This machine's Node exits immediately with `node: /usr/lib/libm.so.6: version 'GLIBC_2.44' not
found`, so *any* `npm` invocation fails — including one whose script never executes Node. Step 5b's
`schema:sync` is exactly that case: the script is a single `cp`, but `npm` has to start to run it.

The general form, which works for any script in any of the sibling repositories:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v <repo>:/w -w /w linode/apl-tools:v3.0.1 npm run <script>
```

`--user` matters: without it the container writes as root into a host-mounted directory and leaves
files you cannot edit afterwards. `linode/apl-tools:v3.0.1` is already local — the operator build
starts `FROM` it.

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

### Vikunja MCP — build this if `apps.vikunja.enabled` is set

`values/vikunja/vikunja-raw.gotmpl` deploys a `vikunja-mcp` Deployment referencing
`vikunja-mcp-local:0.2.1`, built from `vikunja-mcp/Dockerfile` in this repo. Unlike the operator
image, this one has nothing to do with `APPS_REVISION` — just build and load it once per cluster,
same as the toolchain image above:

```bash
docker build -t vikunja-mcp-local:0.2.1 ./vikunja-mcp
docker images vikunja-mcp-local:0.2.1        # verify the artifact, not the exit code (Traps)
kind load docker-image vikunja-mcp-local:0.2.1 --name apl
```

**The tag here is our own local image revision, not the `@democratize-technology/vikunja-mcp` npm
package version pinned inside `vikunja-mcp/Dockerfile` (still `0.2.0`) — the two numbers are
unrelated and only look coupled by coincidence.** `b938c3e15` rebuilt this image from
`node:22-slim` instead of `FROM supercorp/supergateway:latest` (to fix a stale-SDK MCP protocol
mismatch) and bumped the chart's image tag to `0.2.1` to mark the new build, but missed updating
this build command to match. The result: this section silently built and loaded an image tagged
`0.2.0` that the chart never references, `vikunja-mcp` sat in permanent `ImagePullBackOff`, and
because the operator applies helmfile releases strictly sequentially (`--concurrency=1`) and
`vikunja-artifacts` only waits on Deployments becoming Available (not the co-located
`vikunja-bootstrap-admin` Job — helmfile's global `wait: true` without `waitForJobs: true`), that
one un-pulled image blocked the *entire* install: zero Argo CD Applications got created, so no
Keycloak, no console, nothing — not just Vikunja. `vikunja-bootstrap-admin`'s own
`wait-for-vikunja` init container failing looked like a second, circular problem but was only a
symptom of the same block. `operator.installRetries` burns an attempt on this (~10 minutes to
time out) before you'd notice from the install-status configmap alone. If a future commit changes
this Dockerfile again, bump the tag in both `values/vikunja/vikunja-raw.gotmpl` and here, together,
in the same commit.

The npm package (`@democratize-technology/vikunja-mcp`) is installed **at image build time**, not
fetched by the running pod, so every restart runs one pinned, known-good version instead of
re-resolving `latest` from the npm registry each time — this is unrelated to
`POD-EGRESS-INVESTIGATION.md`'s Tekton-specific egress bug, which does not affect a normal
Deployment's own image pulls or a running pod's regular outbound calls.

No credential needs provisioning for this one. The server carries no static token — a caller
authenticates per MCP session via the `vikunja_auth` tool (`connect`, passing its own `apiToken`),
and supergateway's default stateless mode gives each session its own child process, so sessions
never share auth state. See the comment in `vikunja-raw.gotmpl` for how this was verified.

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

The `values.yaml` from the Quickstart. Eight things in it are load-bearing:

- ⛔ **`apps.cert-manager.customRootCA` + `customRootCAKey`** ✅ — required for Turnstone, and
  required *before* the install. Leave them empty and `createCustomCA` in `src/cmd/bootstrap.ts`
  generates a root CA that is RSA-2048, SHA-1, and carries **no `subjectKeyIdentifier`**. Go's
  `x509.CreateCertificate` derives a leaf's `authorityKeyIdentifier` from the parent's
  `subjectKeyIdentifier`, so cert-manager then issues leaves without one — and Python 3.13+ sets
  `VERIFY_X509_STRICT` on every default SSL context, under which OpenSSL 3.5 rejects such a chain
  with `Missing Authority Key Identifier`. Turnstone's OIDC discovery against Keycloak fails, and
  the pod looks perfectly healthy with no sign-in button.

  Two things make this hard to find. `openssl verify` reports the same chain as `OK`, because the
  CLI does not apply the strict flag — so every command-line check anyone would think to run says
  the certificate is fine. And Go apps (Gitea, Vikunja, Argo CD) never notice at all.

  ⛔ **Never retrofit this onto a bootstrapped cluster.** `customRootCAKey` is an `x-secret` but
  `customRootCA` is not, so on a re-bootstrap the new *key* wins through `generateSecrets` while the
  old *certificate* survives in `storedSecrets` (read back from `otomi-generated-passwords`) and
  overrides yours on disk. The result is a mismatched pair, a dead `ClusterIssuer custom-ca`, and
  the wrong CA distributed to all 14 consumers of `_derived.caCert`. Recreate the cluster instead.

  Also note `bootstrap.ts` tests `if (cm.customRootCA && cm.customRootCAKey)` — supply only one and
  it silently generates its own and discards yours. Keep the key RSA; nothing in-tree exercises an
  elliptic-curve CA. Full account in `TURNSTONE.md` §3.

- **`apps.turnstone.anthropicApiKey`** ✅ — the only value in this file that the platform cannot
  generate for you, and the only one you have to go and fetch. It is an `x-secret` with a blank
  value, which is what marks a secret as operator-supplied rather than generated
  (`src/common/values.ts` removes blank ones from the generation template, so the only remaining
  source is your input). It follows the same path as `dns.provider.linode.apiToken`: sealed into
  `apl-secrets/turnstone-secrets`, stripped from the values repo, and surfaced to the pod through an
  ExternalSecret.

  It never reaches Turnstone's database either — the model definition stores the literal
  `${ANTHROPIC_API_KEY}` and Turnstone expands it from the pod environment when it builds its model
  registry. Omit it and the install still completes and SSO still works, but both Turnstone pods
  stay in `CreateContainerConfigError` because the ExternalSecret has nothing to sync. If you do not
  have a key, set `apps.turnstone.enabled: false` rather than leaving the field blank.

- **`apps.gitea.enabled` / `apps.harbor.enabled` / `apps.tekton.enabled`** ⬜ — all default to
  `false` (`helmfile.d/snippets/defaults.yaml`), so without these lines the platform installs
  without them and you have to click **Activate** in the console after every rebuild. Set here, in
  the lab's own values, rather than by changing that defaults file: the effect on this install is
  identical and it keeps the fork's deviation from upstream out of a tracked upstream file.

  **Tekton is one flag driving six releases.** `apps.tekton.enabled` gates `tekton-pipelines`,
  `tekton-dashboard` and their two `-artifacts` releases (`helmfile.d/helmfile-04.init.yaml.gotmpl`),
  `tekton-triggers` (`helmfile-09.init.yaml.gotmpl`), and a `tekton-dashboard-<teamId>` **per team**
  (`helmfile-60.teams.yaml.gotmpl`) — so its cost grows with the number of teams, unlike Gitea and
  Harbor.

  Two things checked before turning it on, both of which would otherwise present as platform
  failures rather than unmet requirements:

  - **No object storage, Gitea or Harbor dependency.** Nothing under `values/tekton-*` references
    `obj.`, and the `installed:` conditions above are the only gates. It stands alone.
  - **It requests no PersistentVolumeClaims at all**, so kind's `ReadWriteOnce`-only
    `rancher.io/local-path` is simply not involved — the trap that makes a `ReadWriteMany` chart sit
    `Pending` forever here (step 0) cannot apply.

  Note the dashboard sits behind **oauth2-proxy ext-authz**
  (`values/tekton-dashboard/tekton-dashboard-raw.gotmpl`), so it gets seamless SSO the way Harbor
  and Argo CD do, and needs no `path:` deep link in `core.yaml` — unlike Turnstone and Vikunja,
  which do their own OIDC.

  **Docker-mode build pipelines need the pod-egress CA workaround too, and it's already baked
  in.** `charts/team-ns/templates/builds/docker.yaml` sets `sslVerify: false` on `git-clone` and
  `--skip-tls-verify`/`--skip-tls-verify-pull` on kaniko unconditionally, for exactly the reason
  `POD-EGRESS-INVESTIGATION.md`'s Tekton workaround section gives — without it, every
  console-triggered docker build fails at either the clone or the push step against this
  platform's self-signed CA. Nothing needs doing for a fresh install: step 5's `APPS_REVISION` is
  derived from `git rev-parse HEAD`, so any install built from a commit at or after this one gets
  the fix automatically, baked into the operator image, with Argo CD pinned to it from the start.
  It only needed a live rebuild-and-reload once, on a cluster whose operator image predated the
  fix — see the git log around the `fix(team-ns)` commit if you need the forensics on why a
  `kubectl patch` on the Application's `targetRevision` alone did not stick (the operator's
  reconcile loop recomputes it from its own baked-in `APPS_REVISION` every cycle).

  Two things were checked before turning Harbor on, because both would otherwise present as
  platform failures rather than as unmet requirements:

  - **Object storage is not needed.** With `obj.provider.type` anything other than `linode`, the
    registry falls back to `imageChartStorage: type: filesystem` on a PVC
    (`values/harbor/harbor.gotmpl`). The claim under "Two console settings this lab does not need"
    that Harbor "cannot be activated" without object storage is **wrong** — that is true of Loki and
    the CloudNativePG backups, not of Harbor.
  - **Every Harbor PVC is `ReadWriteOnce`** (registry, jobservice, database, redis, trivy), so kind's
    `rancher.io/local-path` serves them. A chart defaulting to `ReadWriteMany` would sit `Pending`
    forever here — see step 0.

  Neither app touches the platform's own git backend. `otomi.git.repoUrl` stays
  `git-server.git-server.svc.cluster.local` regardless (`helmfile.d/snippets/defaults.yaml`), and
  the `$giteaUrl` built in `derived.gotmpl` is dead code, referenced nowhere. Enabling Gitea adds
  Gitea; it does not move the values repository, despite `apps.yaml` describing Gitea as the
  "default repository for App Platform configuration".

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

`-f` on the logs is a foreground tail with no end, which is exactly what `CLAUDE.md` rule 1b says
not to do. The concrete watcher for this step — one line a minute, covering both failure modes,
exiting on `completed`:

```bash
while true; do
  D=$(kubectl get cm apl-installation-status -n apl-operator -o jsonpath='{.data}' 2>/dev/null)
  P=$(kubectl get pods -A --no-headers 2>/dev/null | awk '$4=="Running"||$4=="Completed"' | wc -l)
  T=$(kubectl get pods -A --no-headers 2>/dev/null | wc -l)
  OP=$(kubectl get pods -n apl-operator --no-headers 2>/dev/null | awk '{print $2" "$3" restarts="$4}')
  echo "[install] ${D:-no status configmap yet} | pods ok ${P}/${T} | operator: ${OP:-absent}"
  echo "$OP" | grep -qE 'CrashLoopBackOff|ImagePullBackOff|Error' && echo "[install] !! OPERATOR UNHEALTHY"
  echo "$D" | grep -qE '"attempt":"([2-9]|[1-9][0-9])"' && echo "[install] !! ATTEMPT CLIMBING"
  echo "$D" | grep -q '"status":"completed"' && { echo "[install] COMPLETED"; break; }
  sleep 60
done
```

The pod ratio is the useful progress signal: it climbs steadily on a healthy install (18 → 23 → 30 →
41 → …) and stalls at a fixed number when something is wedged. Neither figure is a gate on its own —
step 8's Argo CD checks below are.

**Watch `attempt` as well as `status`.** A climbing `attempt` is the signature of the unbounded
retry loop; against a fixed operator it should stay at 1.

**The operator pod's readiness column is not an install gate**, whatever it reads. With the default
`operator.readiness.gateOnReadiness: false`, the probe is a `pgrep` for the operator process
(`chart/apl/templates/deployment.yaml`), so the pod reports `0/1` only for the first
`initialDelaySeconds: 30`, then `1/1` while the install is still running. Set
`gateOnReadiness=true` if you want `helm install --wait` to block, with `--timeout 30m`.

**The probe surviving the Argo CD handover is the cheapest single indicator that the two halves
match.** Argo CD replaces the operator Deployment with `charts/apl-operator` fetched at
`APPS_REVISION`; if that chart and the image disagree, the probe silently disappears and
`gateOnReadiness` has nothing to act on. Check it explicitly:

```bash
kubectl get deploy apl-operator -n apl-operator \
  -o jsonpath='{.spec.template.spec.containers[0].readinessProbe.exec.command}{"\n"}'
# expect ["/bin/sh","-c","pgrep -f 'apl-operator' > /dev/null"]
# empty output means the chart and the image disagree -- see step 5

kubectl get deploy apl-operator -n apl-operator -o jsonpath='{..image}{"\n"}'
# expect apl-core-local:v6.2.1-fork -- if Argo CD reverted this to an upstream image, so did
# everything else it owns
```

✅ **Verified on the `APPS_REPO_URL`=fork run: the probe survives and the image stays local.** An
earlier version of this file recorded the opposite under `APPS_REVISION=v6.2.1` — that chart predates
the probe `main` added, so it vanished at handover. That was the step 5 skew, and deriving the
revision from the fork's own `HEAD` is what fixed it.

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

⚠ **The table below predates `apps.tekton.enabled` being added to the Quickstart values, and every
figure in it will be higher.** Tekton adds six releases — pipelines, dashboard, triggers, two
`-artifacts` releases and one dashboard *per team*. **None of the new numbers has been measured**;
the next clean run produces them. Until then read the table as an order of magnitude and treat the
`awk`-based "must be empty" checks as the real gate.

✅ **Baseline as last measured**, on a clean run with `APPS_REPO_URL` pointing at the fork and
`APPS_REVISION=$(git rev-parse HEAD)`, with Gitea, Harbor, Vikunja and Turnstone enabled and
**Tekton off**:

| | |
|---|---|
| time to `completed` | **~5.7 minutes**, attempt **1** |
| Argo CD convergence after that | **~6 minutes** |
| pods Running/Completed | **79** |
| applications Synced + Healthy | **61/61** |
| Helm releases, all revision 1 | **35** |
| `platform-istio` external IP | the pool's **first** address |

An earlier table recorded **60 pods / 45 apps / 25 releases** with Gitea and Harbor **off**; those
two account for most of the difference (Harbor adds core, portal, registry, jobservice, trivy, a
database and a redis; Gitea adds itself, a valkey and a database). The 6 vCPU / 12 GB floor in
step 0 was measured without them and has not been re-derived.

Earlier revisions of this file recorded **55 pods / 39 apps / 20 releases** (at `APPS_REVISION=v6.2.1`)
and **40 pods** (with `APPS_REVISION` unset). The 40-pod figure is the `APPS_REVISION` failure from
step 5 — everything Argo CD owns was missing. **A pod count well below the baseline is that same
symptom**, so compare against it rather than reading "most pods are Running" as success.

Counts drift with the enabled app set; treat the table as an order-of-magnitude check, and the
`awk`-based "must be empty" checks above as the real gate.

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

### Trust the platform CA on the kind node — required for any image pull ✅

`containerd`, inside the `kind` node container, pulls images by talking straight to whatever
registry the image reference names — Harbor, or Gitea if you ever push an OCI artifact there. It
never gets the platform's self-signed root CA (`cert-manager`'s `custom-ca`, the same one behind the
Python/Keycloak AKI trap in `TURNSTONE.md` §3) into its OS trust store, so every pull fails:

```
Failed to pull image "harbor.<domainSuffix>/...": failed to do request: Head "https://harbor...":
tls: failed to verify certificate: x509: certificate signed by unknown authority
```

Confirmed live on 2026-08-26: a Workload created through the APL console stayed `Degraded` in Argo CD
with exactly this error until this fix was applied, then a `kubectl delete pod` re-pull succeeded in
413ms. This CA is fine for Go binaries like `containerd` (see the CA note in `CLAUDE.md` — the AKI
problem is Python-only); it just needs to be installed. Do this once, right after credentials, since
`custom-ca` does not exist before install completes:

```bash
kubectl $CTX_ARG get secret custom-ca -n cert-manager -o jsonpath='{.data.tls\.crt}' \
  | base64 -d > apl-root-ca.crt
docker cp apl-root-ca.crt apl-control-plane:/usr/local/share/ca-certificates/apl-root-ca.crt
docker exec apl-control-plane update-ca-certificates
docker exec apl-control-plane systemctl restart containerd
```

Verify without waiting for a real Workload:

```bash
docker exec apl-control-plane curl -sv --max-time 5 https://harbor.<domainSuffix>/v2/ 2>&1 \
  | grep -i "certificate verify ok"
```

**Do not reach for a `skip_verify = true` `hosts.toml` under `/etc/containerd/certs.d/<domain>/`
instead** — it was tried first and works, but only for that one exact domain (`containerd`'s
`certs.d` does not glob; `[host."https://*"]` fails with `lookup *: no such host`, not a wildcard
match), and it has to be redone by hand for every registry and every rebuild. Trusting the CA once
covers every registry behind the platform's wildcard cert, permanently for that cluster's life.

**This step is not persisted across `kind delete cluster`.** It patches the live node container, not
a `kind` config file — the platform's CA does not exist until after install, so it cannot be baked
into `kind create cluster --config`. Re-run it after every fresh install.

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

## 10. Vikunja ✅ (except the browser checks)

Only relevant on `feat/vikunja-integration`. The design, the reasoning and everything that was
measured live in `VIKUNJA.md`; this is the check list.

**Everything below except the browser steps has been run against a clean install.** A previous run
found two bugs, both now fixed in this branch — see "Two ordering bugs" at the end of this section.
Re-run these anyway: they are what caught them.

```bash
# Derive the domain from Vikunja's own route -- the app these checks are about. An earlier version
# read the `gitea` httproute, which did not exist while Gitea was off: the command errors, D is left
# EMPTY, and every curl below then silently targets `vikunja.` with no domain. Gitea is enabled as
# of step 7 so that route is back, but deriving it from an unrelated app was the bug.
D=$(kubectl get httproute vikunja -n vikunja -o jsonpath='{.spec.hostnames[0]}' | sed 's/^vikunja\.//')
[ -n "$D" ] || echo "D is empty -- nothing below will work" >&2

# 1. the app itself
kubectl get pods -n vikunja
kubectl get cluster -n vikunja                      # CNPG, expect Cluster in healthy state
kubectl get externalsecrets -n vikunja              # all 4 SecretSynced
kubectl get jobs -n vikunja                         # vikunja-bootstrap-admin, 1/1 Complete

# 2. it answers, AND it found the identity provider.
#    An empty providers list is the failure this integration is most likely to hit:
#    the pod is Running and Ready either way.
kubectl exec -n vikunja deploy/vikunja -c vikunja -- /app/vikunja/vikunja version
curl -sk "https://vikunja.$D/api/v1/info" | jq '.auth.openid_connect'
# expect enabled:true and ONE provider, name "otomi-idp", auth_url on keycloak.$D
```

### The admin account, and why `Job Complete` is not enough ✅

`vikunja-bootstrap-admin` creates a service-account admin user, used for API-level checks like this
one. The Job reports `Complete` on a re-run that did nothing. Prove the credential instead:

```bash
U=$(kubectl get secret vikunja-admin-credentials -n vikunja -o jsonpath='{.data.username}' | base64 -d)
P=$(kubectl get secret vikunja-admin-credentials -n vikunja -o jsonpath='{.data.password}' | base64 -d)
T=$(curl -sk -X POST "https://vikunja.$D/api/v1/login" -H 'Content-Type: application/json' \
      -d "{\"username\":\"$U\",\"password\":\"$P\"}" | jq -r .token)
[ -n "$T" ] && [ "$T" != null ] && echo "admin login OK" || echo "ADMIN LOGIN FAILED"
```

### Team sync

Removed. Platform teams are no longer synced into Vikunja teams -- see `vikunja-patches/README.md`
for what this used to do and why it was taken out. Nothing to check here.

### Browser checks ⬜ — no command covers these

`/apps/admin` shows a Vikunja tile with its logo linking to `https://vikunja.$D/`; a team view shows
the same tile with the same URL (that is `isShared` working); and the Vikunja login page offers
**otomi-idp**, which round-trips through Keycloak and creates the account on first login. Logging in
this way is also the only way to make a team *member* appear, so it gates the check above.

The tile also has an API-level check, if you have an `ID_TOKEN` — empty output means the `apl-api`
image from step 5b did not land:

```bash
curl -sk -H "Authorization: Bearer $ID_TOKEN" "https://api.$D/v1/apps" | jq '.[] | select(.id=="vikunja")'
```

### Expected during startup, not faults ✅

**Vikunja crash-loops until Keycloak serves.** `requireavailability: true` makes it exit rather than
come up without SSO, and Keycloak is minutes behind it on a cold install:

```
OpenID Connect provider 'otomi-idp' not available after 3 attempts:
  503 Service Unavailable: no healthy upstream
```

Observed **4 restarts** before it settled. This is the setting working — a 503 from the gateway
proves TLS and the platform CA are fine and only the upstream is missing. It is the *opposite* of
the `providers: []` failure, which is what you get when Vikunja comes up happily without SSO.

If `providers` really is `[]`: check the `custom-ca` secret exists in the `vikunja` namespace, that
the pod mounted it, and that Keycloak was reachable at last start. A pod serving with an empty list
means `requireavailability` never reached the config.

### Two ordering bugs, both fixed here ⛔

Neither produced a usable error, and both passed the whole test suite.

**1. The bootstrap Job raced the Deployment.** `vikunja-bootstrap-admin` runs `kubectl exec
deployments/vikunja` with no readiness gate, so while Vikunja waited on Keycloak every attempt died
with `unable to upgrade connection: container not found ("vikunja")` — 6 of its 30 retries burnt on a
*predictable* wait. `values/vikunja/vikunja-raw.gotmpl` now has a `wait-for-vikunja` init container
(`kubectl wait --for=condition=Available`, shell-free because the image is distroless) and the Role
grants `list`/`watch` as well as `get`, which `kubectl wait` needs.

**2. `keycloakUrl` had no port.** The Service exposes 9000/8080/8443 and **not** 80, so a port-less
`http://` URL resolved to :80 and every request hung until the client's connect timeout. The operator
stayed `1/1 Running` and reported only:

```
Error reading team membership from Keycloak: TypeError: fetch failed
```

Teams were still created — only *membership* failed — so the app looked half-working. Fixed in
`values/apl-vikunja-operator/apl-vikunja-operator-raw.gotmpl` to `…svc.cluster.local:8080`, matching
`$oidcBaseUrlBackchannel` in `helmfile.d/snippets/derived.gotmpl`.

⚠ `apl-keycloak-operator`'s `KEYCLOAK_ADDRESS_INTERNAL`
(`values/apl-keycloak-operator/apl-keycloak-operator-raw.gotmpl:88`) is written port-less in the same
way. Not investigated — it may append the port in code, or it may be the same latent bug.

The generalization is worth more than either fix: **an in-cluster URL without a port fails as a
timeout, not as a refusal.** A wrong port that is closed gives `ECONNREFUSED` immediately; a port
nothing listens on gives silence until a timeout fires, and most clients report that as an
uninformative wrapper like `fetch failed`. When a client hangs and then reports nothing useful,
check the port against `kubectl get svc -o jsonpath='{.spec.ports}'` before anything else.

## 11. Turnstone ⬜

Only relevant on `feat/turnstone-integration`. The design, the reasoning and everything that *was*
measured live in `TURNSTONE.md`; this is the check list.

✅ **This section has now been executed against a clean install**, on the composed 6b/6c path.
What that run proved, and what it broke, is recorded below — three bugs came out of it, and all
three are fixed on this branch.

What *is* proven, all of it before any Helm was written:

| Proven ✅ | How |
|---|---|
| the full suite passes with Turnstone enabled | clean-context `docker build`; all four releases lint, `validate-values`, `validate-templates`, `bootstrap-dev` |
| the chart renders correct manifests | `helm template` with the values `turnstone.gotmpl` produces; every added hook diffed with and without |
| `[models.*]` loads and `${ANTHROPIC_API_KEY}` expands from the environment | ran the registry loader in the real image; got `source: 'config'` and the expanded key |
| the `name =` vs `model =` trap is real | reproduced live: `has no model name, skipping` → empty registry |
| a root CA with `subjectKeyIdentifier` makes cert-manager emit `authorityKeyIdentifier` | cert-manager v1.21.1, throwaway namespace in the running lab |
| the concatenated CA bundle keeps `api.anthropic.com` reachable | 151-cert bundle; Anthropic returns 401 (TLS fine), platform CA alone breaks it |
| `turnstone-admin create-admin` is idempotent | ran twice against SQLite: *"is already an admin … no change"* |

Proven since, on a clean install:

| Proven ✅ | How |
|---|---|
| the install itself | `completed` at attempt 1; `turnstone-turnstone` Synced + Healthy; both pods 2/2 |
| the CA trap is defeated | **from Python, inside the pod**, OIDC discovery returns **200** under `VERIFY_X509_STRICT` — step 6b's `subjectKeyIdentifier` reached the leaf |
| the bundle is concatenated, not replacing | `api.anthropic.com` → **401** from the same pod |
| the API key reaches the pod | all **5** ExternalSecrets `SecretSynced`; no `CreateContainerConfigError` |
| the bootstrap Job's in-cluster `kubectl exec` | `Completed`; `turnstone-admin list-users` shows the admin, created at a real timestamp |
| the model registry loads | `model = "claude-sonnet-5"`, `api_key` the literal `${ANTHROPIC_API_KEY}` |
| the `/metrics` redirect | **302** to `/`, not a Prometheus dump |
| role mapping writes real rows | `assigned_by='oidc'` for both a platform admin and a team member |

⚠ Note the ExternalSecret count is **5**, not the 4 an earlier version of this file claimed.

Three bugs that only a real install could have found, all fixed here:

1. **The migrate Job deadlocked Argo CD.** `helm.sh/hook: post-install,pre-upgrade` is right under
   Helm, but Argo CD has no install/upgrade distinction and honours **both** — so `pre-upgrade`
   made it a **PreSync** hook on a first install, where it demanded a ServiceAccount the main sync
   creates. The sync waits on PreSync; nothing breaks the cycle. Symptom: a Job `Running` with
   **zero pods**, and `serviceaccount "turnstone" not found` repeating from the job controller.
2. **OIDC discovery raced Keycloak** — see "What to expect to go wrong first" below.
3. **The `kubectl wait` gate failed fast** on a Deployment that did not exist yet.

✅ Proven by hand in a browser, on this build:

| Proven ✅ | Observed |
|---|---|
| SSO end to end, both apps | console tile → signed in, **no** otomi-idp click, for Turnstone *and* Vikunja |
| the `path:` deep links work | including Vikunja's client-side one, which curl cannot observe |
| role mapping, real users | `platform-admin`→`builtin-admin`; team admin→**`apl-team-lead`+`builtin-operator`**; member→`builtin-operator`; all `assigned_by='oidc'` |
| Vikunja admin flags | `platform-admin` admin of the team, team admin admin of their own team, plain member not |

⚠ **Membership lags a new user's first login, and that is not a fault.** A user does not exist in
Vikunja until they sign in there once (it auto-registers on OIDC), so `PUT /teams/{id}/members`
returns 404 before that and the operator can only add them on the *next* reconcile. Measured: login
16:34:27 → membership 16:35:02. Open a share dialog inside that window and the team list is
correctly empty. Sign in, wait up to `VIKUNJA_RECONCILE_INTERVAL` (60s), then look.

Still **not** proven: one real agent turn against the Claude API. TLS to Anthropic is proven
(401 from inside the pod); an actual completion is not.

⬜ Known gaps, neither a regression:
- **Turnstone rights need more work.** `apl-team-lead` is a global power-user role, not a team
  admin, because Turnstone cannot scope — see §4.1 of `TURNSTONE.md`.
- **Vikunja projects are not shared with teams automatically.** The operator creates no projects
  and no shares; a user shares their project with a team by hand in the UI. Nothing has ever done
  this, so a team member cannot see a colleague's project until it is shared.

```bash
# Derive the domain from Turnstone's own route -- never from an unrelated app's, which may be off.
D=$(kubectl get httproute turnstone -n turnstone -o jsonpath='{.spec.hostnames[0]}' | sed 's/^turnstone\.//')
[ -n "$D" ] || echo "D is empty -- nothing below will work" >&2

# 1. the app itself
kubectl get pods -n turnstone                       # server + console Running; migrate Job Completed
kubectl get cluster -n turnstone                    # CNPG, expect Cluster in healthy state
kubectl get externalsecrets -n turnstone            # all 4 SecretSynced
kubectl get jobs -n turnstone                       # turnstone-bootstrap-admin, 1/1 Complete
```

⚠ If both pods are in `CreateContainerConfigError`, check `turnstone-anthropic-key` first — a
missing or blank `apps.turnstone.anthropicApiKey` leaves that ExternalSecret with nothing to sync,
and the `secretKeyRef` then blocks the pod. That is step 6c, not a platform fault.

### 2. The certificate chain — check this before blaming OIDC ⬜

The single most likely thing to be wrong, and the reason for steps 6b and 6c. Both must pass, from
inside the pod:

```bash
kubectl exec -n turnstone deploy/turnstone-console -- python -c \
  "import httpx,os;print(httpx.get(os.environ['TURNSTONE_OIDC_ISSUER']+'/.well-known/openid-configuration').status_code)"
# expect 200. "Missing Authority Key Identifier" means the root CA has no subjectKeyIdentifier --
# step 6b was skipped, or was retrofitted onto an already-bootstrapped cluster.

kubectl exec -n turnstone deploy/turnstone-console -- python -c \
  "import httpx;print(httpx.get('https://api.anthropic.com/v1/models').status_code)"
# expect 401 -- that is a PASS: TLS worked and only the key was rejected on that unauthenticated
# call. An SSLCertVerificationError here means the CA bundle replaced the public roots instead of
# being concatenated onto them.
```

⚠ **Do not verify this with `openssl` on the host.** `openssl verify` does not apply
`VERIFY_X509_STRICT` and reports the broken chain as `OK`. Only Python sees the problem.

### 3. The model registry ⬜

A missing model is silent — a healthy pod, a working UI, and no model:

```bash
for d in turnstone-server turnstone-console; do
  kubectl logs -n turnstone deploy/$d | grep -iE 'no model name, skipping|empty registry'
done
# any output is a failure; "no model name, skipping" is the model=/name= trap
kubectl get cm turnstone-model-config -n turnstone -o jsonpath='{.data.config\.toml}'
# expect `model = "claude-sonnet-5"` and api_key = "${ANTHROPIC_API_KEY}" -- the LITERAL string,
# never the real key. If the real key is in here, something templated it wrongly.
```

⚠ **Do not grep for `world-readable` here.** An earlier version of this file did, and it fires on
a perfectly healthy install. Turnstone warns because `/etc/turnstone/config.toml` is mode `0440`,
but the chart already sets `defaultMode: 0400` — kubelet widens it to `0440 root:1000` because the
pod sets `fsGroup: 1000`, and that group bit is precisely what lets the app (uid 1000, non-root)
read a root-owned file. Tightening it breaks the pod. The "group" here is the app's own, and the
file holds only the literal `${ANTHROPIC_API_KEY}`, so nothing is exposed.

### 4. The admin account, and why `Job Complete` is not enough ⬜

`turnstone-bootstrap-admin` exists because OIDC login is refused outright while the user count is
zero, so SSO cannot bootstrap itself. The Job reports `Complete` on a re-run that did nothing, so
test the effect:

```bash
kubectl exec -n turnstone deploy/turnstone-console -- turnstone-admin list-users
# expect apl-turnstone-admin
```

### 5. The tile ⬜

Empty output means step 5b did not land, and no amount of `core.yaml` will help:

```bash
curl -sk -H "Authorization: Bearer $ID_TOKEN" "https://api.$D/v1/apps" | jq '.[] | select(.id=="turnstone")'
```

For an `ID_TOKEN`, see section 9 — the `otomi` client has `directAccessGrantsEnabled`, but the
client secret in `otomi-generated-passwords` does **not** authenticate; read it from the Keycloak
admin API.

### 6. Role mapping ⬜

After a real SSO login:

```bash
kubectl exec -n turnstone turnstone-db-1 -c postgres -- psql -U postgres -d turnstone \
  -c 'select u.username, ur.role_id, ur.assigned_by from user_roles ur
        join users u on u.user_id = ur.user_id order by u.username;'
```

⚠ The join is on `users.user_id`, **not** `users.id` — there is no `id` column, and an earlier
version of this file printed `ERROR: column u.id does not exist`.

`assigned_by='oidc'` is claim-mapped and correct. `'oidc-default'` means the claim matched nothing
and the user fell back to `builtin-viewer` — which almost always means the Keycloak mapper is not
putting `groups` in the **ID token** (the access token is not enough), or the realm role name does
not match `team-<teamId>`.

The mapping is a **union** over every matching claim value, so expect:

| signed in as | Keycloak `groups` carries | roles |
|---|---|---|
| platform admin | `platform-admin` | `builtin-admin` |
| all-teams admin | `all-teams-admin` | `builtin-admin` |
| team admin of `foo` | `team-admin` **and** `team-foo` | `apl-team-lead` **and** `builtin-operator` |
| member of `foo` | `team-foo` | `builtin-operator` |

⛔ **`apl-team-lead` is not a team-scoped admin, and cannot be.** Turnstone has no scoping at all:
`org_id` is inert (one seeded row, no `create_org` route, read by nothing), `user_roles` has no org
column, and `project_members` carries no role. The role is a deliberately-named *power user* —
projects, personas and `tools.approve`, but no `admin.users`/`admin.roles`/`admin.settings`, so a
team admin cannot act on other people or global configuration. If it is missing entirely, the
bootstrap Job's `seed-team-lead-role` init container did not run:

```bash
kubectl exec -n turnstone turnstone-db-1 -c postgres -- psql -U postgres -d turnstone \
  -c "select role_id, name, permissions from roles where role_id = 'apl-team-lead';"
# empty means team admins silently fell back to builtin-operator -- apply_role_mapping drops a
# mapped value whose role does not exist, without logging anything
```

### 7. Browser checks ⬜

No command substitutes for these. Steps 4 and 9 are the ones that matter.

| # | Do this | Expect |
|---|---|---|
| 1 | `https://console.$D`, sign in as a platform admin | loads; browser prompts once to trust the **new** CA |
| 2 | **Apps → Admin Apps** | a **Turnstone** tile with a logo. Broken image = `apl-console` patch missing; no tile = `apl-api` patch missing |
| 3 | click it | new tab on `https://turnstone.$D`, Turnstone login page |
| 4 | look at the login page | an **otomi-idp** button beside the password form. **No button = OIDC discovery failed** — go back to check 2 |
| 5 | click it | Keycloak → `/v1/api/auth/oidc/callback` → signed in, account auto-created |
| 6 | open **Admin / Settings** | reachable, not 403 — confirms `platform-admin` → `builtin-admin` |
| 7 | **Models** tab | one enabled `claude-sonnet-5`, provider `anthropic`, sourced from **config**; key masked. An empty list is the `model =` trap |
| 8 | **Users** tab | your SSO user plus `apl-turnstone-admin` |
| 9 | new session, *"In one sentence, what are you?"* | a streamed reply. **The end-to-end proof of the API key**: Secret → env → `${ANTHROPIC_API_KEY}` → `api.anthropic.com`. A 401 or "no models available" means the key is wrong |
| 10 | *"list the files in your working directory"* | an **approval prompt** blocks first. No prompt means `tools.skip_permissions` got flipped on — turn it back off |
| 11 | leave a session idle 2–3 min | stream stays up, no reconnect loop — SSE survives the Istio gateway |
| 12 | sign in as a team member, not an admin | chat works, **Admin/Settings 403** — confirms `team-<id>` → `builtin-operator` |
| 13 | `https://turnstone.$D/metrics` in a private window | redirected, not a Prometheus dump |
| 14 | click the **Turnstone** tile while signed in to the console | lands **signed in**, no login page and no otomi-idp button — the `path:` deep link in `core.yaml` |
| 15 | same for the **Vikunja** tile | same. ⚠ This one is **client-side**; `curl` shows only the SPA shell on every URL and can never prove it. A browser is the only check |
| 16 | sign in as a **team admin** | Admin → **Projects** and **Personas** are visible; **Users**, **Roles** and **Settings** are not. That split is `apl-team-lead` |
| 17 | as that team admin, approve a tool call | the approval works — `tools.approve` is in `apl-team-lead` but **not** in `builtin-operator`, so a plain member cannot grant it |

### What to expect to go wrong first ⬜

In rough order of likelihood, with the check that distinguishes each:

1. **No sign-in button.** ✅ **Check the startup race first, not the certificate.** Turnstone runs
   OIDC discovery exactly once, at startup, and does not retry; on a cold install Keycloak is
   minutes behind it, so discovery fails and the pod then serves happily with SSO disabled. It is
   logged at `warning`, so nothing looks wrong:

   ```bash
   kubectl logs -n turnstone deploy/turnstone-console -c console | grep -c 'OIDC discovery failed'
   # 0 is correct. Any hit means the pod came up before Keycloak was serving.
   kubectl logs -n turnstone deploy/turnstone-console -c console | grep 'OIDC enabled'
   # expect two lines, the second confirming discovery actually succeeded
   ```

   The `wait-for-keycloak` init container in `values/turnstone/turnstone.gotmpl` exists to prevent
   this; if it fired anyway, read its log. A `kubectl rollout restart` is the instant confirmation —
   if SSO works afterwards with no other change, it was the race and **not** the certificate.

   This was observed on a clean install and is what demoted the certificate chain to second place.
2. **Still no sign-in button, and discovery is genuinely failing.** *Now* it is the certificate
   chain — section 2 above.
3. **Pods in `CreateContainerConfigError`.** The API key is missing; step 6c.
4. **Empty Models tab.** The `model =` vs `name =` trap; section 3.
5. **Bootstrap Job burning retries.** `container not found` means the console never became
   Available. `deployments.apps "turnstone-console" not found` is different and means the *gate*
   ran before Argo CD created the Deployment — `kubectl wait` returns NotFound immediately and
   ignores `--timeout`, which is why a `--for=create` container runs ahead of it.
6. **A team admin sees almost nothing.** Expected until `apl-team-lead` is mapped — see section 6.
   `builtin-operator` holds only `read,write,conversation.modify,workstreams.*`, so every admin tab
   except **Nodes** disappears.
7. **Everyone lands on `builtin-viewer`.** The `groups` claim is not in the ID token; section 6.

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

### Do not use this to enable a *new app* on a running cluster ⬜

Tried, and it does not work. Enabling `apps.vikunja` on an installed cluster needs a new
`APPS_REPO_URL`/`APPS_REVISION`, because `charts/vikunja` does not exist at the revision Argo CD is
already using. Three things then compound:

1. **`helm upgrade` loses the operator Deployment.** Argo CD's own `apl-operator-apl-operator`
   Application manages that same Deployment with `selfHeal: true`, and it wins. Helm writes the
   `chart/apl` shape (volume `otomi-values`, `VALUES_INPUT=/secret/values.yaml`); Argo CD reverts it
   to the `charts/apl-operator` shape (volume `apl-values`, no `VALUES_INPUT`) within seconds.
2. **The two charts genuinely differ, and that is by design.** `chart/apl` bootstraps from a
   `values-secret`; `charts/apl-operator` has no such volume because after bootstrap the values live
   in the git repo. Harmless normally — fatal if the operator ever needs to bootstrap again.
3. **Which it does, if the status ConfigMap is not `completed`.** The operator re-runs bootstrap on
   every start until then, and under Argo CD's spec it cannot: `VALUES_INPUT is required for
   bootstrap`, crash-loop. Patching that one Application by hand does not help — `charts/apl-operator`
   renders the same spec at every revision.

Repeated attempts also grow the values secret until `createK8sSecret` fails with
`RequestEntityTooLarge: limit is 3145728`, at which point the cluster is unrecoverable.

**The same `selfHeal` also blocks hand-patching a values fix in to test it.** Verified while
diagnosing the `keycloakUrl` port bug in step 10: patching the generated Secret is reverted by
external-secrets within a second, and patching the `ExternalSecret` behind it is reverted by Argo CD
within about ten. Both revert cleanly, so nothing is left behind — but there is no quick way to try a
`values/` change on a running cluster. Prove the *diagnosis* in place instead (`kubectl exec` into the
pod and reproduce the call by hand), then rebuild to prove the fix.

**Recreate the cluster instead.** It is ~10 minutes with the Quickstart and images already built,
which is faster than diagnosing any of the above — consistent with `CLAUDE.md`'s "a half-installed
platform is not salvageable".

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
| Running `npm` on the host | this machine's Node is broken; even a script that never runs Node fails |
| An in-cluster URL with no port | resolves to :80, hangs to a timeout, reports `fetch failed` — not a refusal |
| Reading `1/1 Running` as "working" | event-driven operators log the failure and then sit silent |
| Trusting a Job's `Complete` | a re-run that did nothing also reports `Complete`; test the effect |
