# Reloader restarts Dex when its config Secret changes

- Status: accepted

## Context and Problem Statement

Dex reads its configuration once, at startup, from the `dex-config` Secret. External Secrets Operator (ESO) renders that Secret from `helmfile.d/snippets/dex-config.gotmpl` plus injected secret values. Until now a `checksum/config` pod annotation, hashing the template, was the only thing that started a config restart. It had two gaps:

- It hashed the template, not the Secret, so an app configuration change that only altered an injected value (the external IdP client ID or secret, or a rotated generated secret) never restarted Dex.
- The Deployment and the ExternalSecret belong to separate ArgoCD Applications, so pods could roll before ESO had rewritten the Secret and start with the old configuration.

A first attempt used a Kyverno policy (#3893, PR #3894). It was closed after review, for the reasons given under Considered Options.

## Decision

[Stakater Reloader](https://github.com/stakater/reloader) starts a config restart of the Dex Deployment whenever the data of the `dex-config` Secret changes. Reloader watches the stored Secret, so the restart starts after the write and covers every app configuration change, whatever caused it. The `checksum/config` annotation is removed, so each change causes one rollout.

- **Reloader runs in its own `reloader` namespace and acts only in watched namespaces.** It gets a Role in each watched namespace and no ClusterRole. The list of watched namespaces is derived, not user input: `dex` when Dex is enabled. Istio injection is off in the `reloader` namespace.
- **Only the `dex-config` Secret triggers a restart, and it is named explicitly** on the Dex Deployment. Reloader ignores ConfigMaps.
- **`apps.reloader.enabled` is a kill switch, on by default.** It exists so that an admin can switch Reloader off if it misbehaves. Reloader is installed whenever it is enabled, including on clusters where Dex is disabled and there is nothing to watch.
- **There is no fallback.** With Reloader switched off, Dex is not restarted automatically.
- **Reloader records a restart as a pod template annotation,** not as an environment variable. This is the strategy Reloader provides for GitOps tools.
- **Reloader does not catch up on missed changes.** It restarts Dex when `dex-config` changes or is created while Reloader is running. A change made while Reloader was down or switched off is not applied until Dex is restarted by hand or by a later change. The reason is given under Considered Options.
- **Reloader ships in the GitOps operations phase,** with no ordering against Dex. A change to `dex-config` made before Reloader is watching is missed, as any other change made while it is down.
- **Reloader uses explicit, namespace-scoped RBAC.** The Roles are verified against Reloader v1.4.25 and must be verified again when the chart is upgraded. In its own namespace and in each watched namespace Reloader may list and watch Secrets and list Deployments, DaemonSets and StatefulSets. In `dex` it may also update the named Dex Deployment and write Events. In its own namespace it may also write the `reloader-meta-info` ConfigMap. Jobs and CronJobs are ignored, so the Roles grant nothing on them.
- **Reloader gets an ingress-only NetworkPolicy** behind `apps.reloader.networkPolicies.enabled`, like the other platform apps that have one.
- **Kyverno's default is not changed** by this decision.

## Considered Options

- **A Kyverno mutate-existing policy.** Implemented in PR #3894 and not chosen. Kyverno stores the whole admission request, including the old and new Secret, in an UpdateRequest that is readable by more principals than the Secret. It triggers at admission, before the Secret is stored, so Dex could still restart with the old configuration and nothing would correct it. The policy and the Role it needs lived in separate, unordered ArgoCD Applications with no retry. It also required Kyverno to become enabled by default, with a values migration that would have activated stored team policies on every existing cluster.
- **Restarting Dex from the apl-operator.** Not chosen, for the reason given in [ADR-2026-08-04](2026-08-04-restart-platform-auth-pods-after-oauth2-proxy-healthy.md): no further watchers in the operator.
- **Reloader inside the `dex` namespace.** Not chosen. It would add a second workload to a hardened, Istio-injected namespace, and a second consumer would need a second Reloader.
- **Catching up when Reloader starts** (`syncAfterRestart` with `reloadOnCreate`). Not chosen. With the annotations strategy, Reloader v1.4.25 does not compare the recorded hash. It writes the annotation again with a new timestamp, so Dex restarts every time the Reloader pod starts. This was verified on a cluster.
- **The env-vars strategy with catch-up.** Not chosen. It compares the recorded hash, so it catches up without restarting Dex on every Reloader start. But it records the restart as a container environment variable, which is not the strategy Reloader provides for GitOps tools.
- **A cluster-wide Reloader, opt-in by annotation.** Not chosen. It would need to read every Secret in the cluster, including those in team namespaces.
- **No toggle, with Reloader following Dex.** Not chosen; the kill switch is wanted.
- **Keeping the checksum as a fallback when Reloader is switched off.** Not chosen. It is a second restart path that has the very gaps this decision removes.
- **Restarting Dex on a change to anything it mounts.** Not chosen; only the named Secret triggers a restart.
- **The chart's built-in Role.** Not chosen because it grants workload mutation permissions beyond those needed for Dex. Explicit roles need verification when Reloader is upgraded.
- **An egress allowlist for Reloader.** Deferred. The Kubernetes API port differs per provider, and no platform NetworkPolicy restricts egress today.

## Consequences

- Reloader writes an unsalted SHA-1 of the data of `dex-config` to the Dex pod template, where anyone who can read Deployments, ReplicaSets or Pods in `dex` can see it. This is accepted because the hashed configuration always contains two independently generated 32-character secrets, so no single field can be guessed offline. That holds only while `dex-config` keeps containing at least one generated high-entropy secret.
- Reloader lists and watches every Secret in `dex` and in `reloader`, including the global pull secret when configured.
- With Reloader switched off, Dex must be restarted by hand after every app configuration change, including the creation of a team.
- A change to `dex-config` made while Reloader is not running is not applied when Reloader starts again. Dex keeps the old configuration until it is restarted by hand or `dex-config` changes again. This includes the time before Reloader's Roles are synced, because the Roles and Reloader belong to separate ArgoCD Applications.
- Reloader's first start on a cluster does not restart Dex. An upgrade causes one Dex rollout, from removing the checksum annotation.
- Deleting and re-creating `dex-config` restarts Dex.
- A change to the `dex-web-overlay` ConfigMap (the login page) still does not reach running Dex pods until something else restarts them. It is mounted by `subPath`, which Kubernetes never refreshes in a running pod.
- Reloader's egress is not restricted, although it can read `dex-config`. Dex's egress is not restricted either: the allowlist described in [ADR-2026-11-06](2026-11-06-dex-security-hardening.md) §3 is not present in the code.
- On a cluster with Dex disabled, Reloader runs with nothing to watch.
