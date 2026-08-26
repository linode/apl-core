# Pods can't reach the public internet — an open investigation

This is fork-only and not intended for upstream. It records an unsolved problem found while working
through `SETUP.md`'s Tekton build lab, and gives the exact procedure to re-test it after a fresh
`kind` cluster. **This is a record of an investigation, not a fix** — read `CLAUDE.md` first for how
this file fits with the others.

Status legend: ✅ proven · ⛔ ruled out (tested, not just reasoned about) · ⬜ not yet tried

## The workaround — proven, use this, stop re-investigating

✅ **Mirror any base image a Tekton build needs into Harbor from the host, before the pipeline runs.**
The host has working egress; pods do not, reliably. `kaniko`/`git-clone` running inside a pod should
never need to reach the public internet at all — Gitea and Harbor are both in-cluster and reachable
from a pod the whole time, exactly the way this platform is meant to be used.

```bash
# from the HOST, not a pod -- this is the one egress path that works
docker run --rm --network host quay.io/skopeo/stable:latest \
  copy --dest-tls-verify=false --dest-creds "<harbor-user>:<harbor-pass>" \
  docker://<upstream-image>:<tag> \
  docker://harbor.<domainSuffix>/<project>/<name>:<tag>
```

Then point the Dockerfile's `FROM` at the Harbor copy
(`harbor.<domainSuffix>/<project>/<name>:<tag>`), not the public registry. Proven end to end on
2026-08-26: a `docker-build-green-*` Pipeline building from a mirrored
`harbor.../team-labteam/nginx-mirror:chainguard-latest` completed `git-clone` → `COPY`/`EXPOSE` →
`kaniko` push in ~36s, no resets, no retries.

**This is not optional or "for now" — treat it as the standard shape of any Tekton pipeline on this
lab**, alongside the two other required deviations from a naive Dockerfile-in-Gitea flow that a real
Linode-hosted cluster would not need:

1. `git-clone`'s `sslVerify` param must be `"false"`. Gitea's certificate is signed by the platform's
   own self-signed root CA (see `CLAUDE.md`'s CA note and `TURNSTONE.md` §3); the default git client
   trust store does not have it, and there is no values-level fix for a Task the console generates.
2. `kaniko`'s `EXTRA_ARGS` must include `--skip-tls-verify` (and `--skip-tls-verify-pull` if pulling
   through Harbor too) for the same CA reason, on the **push** side.
3. Any `FROM` in the Dockerfile must resolve to something already inside the cluster — Harbor, not
   Docker Hub, `cgr.dev`, `public.ecr.aws`, or any other public registry — because of the unsolved
   egress bug below. This is the one workaround that has no values-level fix at all; it has to be
   done per image, by mirroring it first.

A minimal Pipeline shape that does all three (see git history around 2026-08-26 for the full YAML
this was proven with):

```yaml
- name: fetch-source
  taskRef: {kind: Task, name: git-clone}
  params: [{name: url, value: <gitea-https-url>}, {name: sslVerify, value: "false"}]
- name: build-push
  taskRef: {kind: Task, name: kaniko}
  params:
    - {name: IMAGE, value: harbor.<domainSuffix>/<project>/<name>:<tag>}
    - {name: EXTRA_ARGS, value: ["--skip-tls-verify", "--skip-tls-verify-pull"]}
```

The console-generated Pipeline (the one wired to the Gitea webhook) does **not** set any of these —
it fails on the CA problem before it ever reaches the egress problem. Either accept that the
webhook-triggered run will always fail here, or hand-wire the same three settings into it.

## The symptom

A pod trying to reach any public HTTPS endpoint gets its TLS connection reset within ~10-15ms of
sending the ClientHello — far too fast to be the real remote server (the targets are on other
continents; a real round trip takes 80ms+). Something local kills the connection right after seeing
the handshake content.

```
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* Recv failure: Connection reset by peer
```

Anything that shares the `kind` node **container's own** network namespace — `docker exec`, a pod
with `hostNetwork: true`, `docker run --network container:apl-control-plane`, even
`docker run --network kind` (Docker's own bridge, a *different* container, *not* sharing the node's
netns but on the same bridge) — works perfectly, every time, with the identical client. Only traffic
that has crossed **Calico's own per-pod veth** fails.

## Reproduce it first, before anything else

Two commands, on a freshly-built cluster, right after `SETUP.md` step 8 (platform installed) and any
team namespace exists:

```bash
kubectl run debug-shoot -n <any-team-ns> --image=nicolaka/netshoot --command -- sleep 3600
kubectl wait --for=condition=Ready pod/debug-shoot -n <any-team-ns> --timeout=30s
kubectl exec -n <any-team-ns> debug-shoot -- curl -sv -4 --max-time 8 https://index.docker.io/v2/
```

If this returns a real HTTP response (even a `401`), **the bug did not reproduce** — something about
the specific long-lived cluster from the original investigation mattered, and the rest of this file
isn't needed. Say so plainly rather than assuming it's fixed.

If it resets the same way, run the control test — this is the single most useful comparison, and
takes 10 seconds:

```bash
docker run --rm --network container:apl-control-plane nicolaka/netshoot \
  curl -sv -4 --max-time 8 https://index.docker.io/v2/
```

If *this* succeeds while the pod fails, the reproduction is confirmed and matches the original
finding exactly: the fault is specifically in crossing Calico's own pod-network boundary, nothing
else.

## What is already ruled out — do not re-spend time on these

Each was tested directly, not reasoned about, during the original investigation:

| Ruled out | How it was tested |
|---|---|
| MTU (Calico's `veth_mtu` auto-detect at 1480 vs host's 1500) | Changed to 1400, retested — identical failure. Reverted to 1480 — identical failure either way. |
| Kubernetes `NetworkPolicy` | None exist with `Egress` in `policyTypes` for the affected namespace. |
| Istio | No sidecar container present, no `ztunnel`/ambient mesh installed at all. |
| Calico's eBPF dataplane | Not enabled (`FelixConfiguration.bpfEnabled` unset, iptables mode confirmed). |
| Calico's own iptables chains (`cali-fw-*`/`cali-tw-*`) | Read packet-by-packet with `iptables -L -v` before/after a live failing request — zero drops on any rule. |
| `firewalld` | Fully removed (`pacman -Rns firewalld`) — identical failure after. |
| `vopono` (a per-app VPN namespace tool) | Killed — identical failure after. |
| Full host nftables ruleset | Every table read (`nft list ruleset`, 134 lines) — nothing matches this traffic; the one plausible anti-spoof rule has a 0/0 hit counter. |
| `tc` filters / XDP programs | None exist on any relevant interface. |
| cgroup-eBPF (`bpftool cgroup tree`) | Every ancestor cgroup of the pod's own cgroup checked, up to root — only harmless `cgroup_device` programs, no network hooks anywhere in the chain. |
| `rp_filter` (reverse-path filtering) | Set to `0` on every relevant interface — identical failure. |
| TLS client fingerprinting | The exact same client image succeeds when run via `docker run --network container:...` — rules out anything about the client itself. |
| The ISP / router / network path | Identical failure reproduced on two physically different networks (home WiFi, phone hotspot) — this is local to the machine, not the network. |
| Stale conntrack / test pollution | A pod that had never made a single prior connection attempt failed identically. |
| Rootless Docker | `dockerd` runs as root; this is not a rootless-networking artifact. |
| `net.ipv4.ip_forward` | Confirmed `1`. |
| `kindnetd` racing Calico's own NAT rule | Both were confirmed live simultaneously — `kindnetd`'s DaemonSet was `Running` (not just present-but-inert; SETUP.md's "dormant" claim is only true for CNI *plugin* selection) and its own `KIND-MASQ-AGENT` MASQUERADE chain had non-zero packet counters, coexisting with Calico's `cali-nat-outgoing` in the same `nat` `POSTROUTING` chain for the same pod CIDR. Deleted the `kindnet` DaemonSet outright (2026-08-26, with explicit user approval — the delete command was blocked by the permission classifier first) and re-tested: identical reset, 3/3 attempts, `KIND-MASQ-AGENT`'s chain left over but static. Ruled out. |
| conntrack table exhaustion / `early_drop` | `kind`'s nesting means a pod's connection is NAT'd twice — once by Calico inside the node-container's own netns, again by the host's Docker daemon on the `kind` bridge — so it was a reasonable theory that one of the two independent `nf_conntrack` tables was under pressure and evicting in-flight ("unassured") entries, producing a phantom RST when the response arrived with no matching NAT mapping. Checked both `/proc/net/stat/nf_conntrack` (host netns: 387/262144 entries, 0.1% used) and inside the node container (`docker exec apl-control-plane`: 5614/262144, 2% used) — `early_drop`, `insert_failed` and `drop` were all zero, on every CPU, in both namespaces. Ruled out; nowhere near capacity. |

## What was tried and gave a real signal, but not a root cause

**`dropwatch -l kas`** (kernel drop-monitor) does capture real drops, but this cluster generates
enough routine TCP teardown noise (`sk_stream_kill_queues`, `tcp_validate_incoming`,
`tcp_v4_do_rcv` — all completely normal background activity) that a bracketed before/after
comparison could not isolate one relevant drop from the noise. If you retry this, don't rely on
watching it live — pipe timed output to a file and grep for anything netfilter/forward-specific,
and don't expect silence, expect noise.

## What was not tried — the real next steps

**A `bpftrace` script that filters by the actual packet, not just kernel location.** `dropwatch`
only tells you *where* a drop happened, aggregated by function — not *which packet*. A script
attached to the `skb:kfree_skb` tracepoint that dereferences the skb and filters on destination
IP/port (or on the source cgroup) would show the exact call stack for *this* connection specifically,
cutting through the noise `dropwatch` couldn't. This needs real scripting, not a one-liner — budget
real time for it, and test the script against a known-failing request before trusting its silence.

**Compare against a completely fresh `kind` cluster on the same machine**, which is exactly what
running this file after a rebuild does. If the fresh cluster does *not* reproduce this, the next
question is what's actually different — likely candidates to diff against the old cluster: Calico's
exact version/manifest (pinned in `SETUP.md`, shouldn't differ), kernel version (`uname -a`, only
matters if the host was rebooted onto a new kernel between attempts), and whether any of the tools
installed during the investigation (`bpftool`, `tcpdump`, `dropwatch`) or removed (`firewalld`) were
still in their modified state — they shouldn't be relevant, since the *pod* network stack doesn't
touch `firewalld`/`bpftool` at all, but note it rather than assume it.

## If it does NOT reproduce on the fresh cluster

Don't go looking for what "fixed" it — nothing in this repo's tracked files changed as a result of
the investigation (the one edit made to `SETUP.md` during the investigation was reverted once proven
ineffective; see git history around this file's own commit for the record of what was tried and
undone). The most likely explanation is state specific to the *original* long-lived cluster
(hours of uptime, dozens of test pods created and destroyed, `vopono`/`firewalld` having been
present and then removed live rather than never having existed) — not something a clean install
carries forward. Say this plainly rather than crediting the rebuild with a fix nobody identified.

⚠ **It has since reproduced on a fresh cluster** (2026-08-26, this same file's own re-test procedure,
`kind`/Calico rebuilt from scratch that day) — so "fresh cluster" is not itself protective, and the
theory above (state specific to a long *original* cluster) is weakened, though not disproven: this
"fresh" cluster was ~40 minutes and several `helm install`/pipeline-run cycles old by the time it
reproduced, and a direct `curl` from a pod immediately after install had succeeded cleanly. The
"builds up over the cluster's own lifetime, however short" framing fits the observations better than
"only old clusters have it" — but this still is not proof, just the closest read of the evidence so
far. **Do not spend more time chasing the root cause without new evidence to anchor a hypothesis** —
two more candidates were ruled out this session (`kindnetd`/Calico NAT race, conntrack exhaustion) on
top of the exhaustive list above, and both were reasoned from the actual kind+Calico+Docker
architecture, not guessed. Use the proven workaround at the top of this file instead.
