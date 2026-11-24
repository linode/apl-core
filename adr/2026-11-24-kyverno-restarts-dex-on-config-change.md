# Kyverno restarts Dex when its config Secret changes

- Status: accepted

## Context and Problem Statement

Dex reads its configuration once, at startup, from the `dex-config` Secret. External Secrets Operator (ESO) renders that Secret from `helmfile.d/snippets/dex-config.gotmpl` plus injected secret values. Until now a `checksum/config` pod annotation, hashing the template, rolled the Dex Deployment. It had two gaps:

- It hashed the template, not the Secret, so a change to an injected value (the external IdP client ID or secret, or a rotated generated secret) never restarted Dex.
- The Deployment and the ExternalSecret belong to separate ArgoCD Applications, so pods could roll before ESO had rewritten the Secret and start with the old configuration.

## Decision

A Kyverno policy restarts the Dex Deployment whenever the data of the `dex-config` Secret changes. The `checksum/config` annotation is removed, so each change causes one rollout, and that rollout starts after the Secret is written.

- **Kyverno is enabled by default.** `apps.kyverno.enabled` stays a user toggle. A values migration sets it to `true` on existing clusters, because their values repos hold the previous default explicitly.
- **There is no fallback.** A cluster with Kyverno disabled gives up automatic Dex restarts.
- **The policy is Dex-only.** It ships with the Kyverno artifacts release and is rendered only when Dex is enabled, so a Kyverno resource can never block the sync of the `dex-config` ExternalSecret. Kyverno's background controller may patch Deployments in the `dex` namespace only.
- **The policy fails closed.** Its webhook is narrowed by match conditions to the `dex-config` Secret in the `dex` namespace. ESO retries a rejected write, so a change made while Kyverno is unavailable is delayed, not missed.
- **Kyverno stays in the GitOps operations phase**, with no ordering against Dex.

## Considered Options

- **Stakater Reloader.** Purpose-built and lighter. Not chosen, because Kyverno is wanted always-on for other reasons and Dex is its first platform-internal consumer.
- **Restarting Dex from the apl-operator.** Not chosen, for the reason given in [ADR-2026-08-04](2026-08-04-restart-platform-auth-pods-after-oauth2-proxy-healthy.md): no further watchers in the operator.
- **Mandatory Kyverno, with no toggle.** Not chosen; the toggle is kept.
- **Keeping the checksum as a fallback when Kyverno is disabled.** Not chosen; Kyverno is the single restart mechanism.
- **A generic, label-driven policy for any Secret-fed workload.** Deferred until a second consumer exists. It would need the background controller to hold patch rights on Deployments in every namespace.

## Consequences

- The upgrade installs Kyverno on every existing cluster. Team policies already stored in values repos become active, including any set to `Enforce`.
- On a cluster with Kyverno disabled, Dex must be restarted by hand after every change to `dex-config`, including the creation of a team. For those clusters this is a regression from the checksum, and it is accepted.
- The policy is event-driven. On a fresh install, an update to `dex-config` made before Kyverno has registered the policy goes unseen. Nothing is known to update the Secret that early.

## Verified on a cluster

Checked on 2026-11-24 with a prototype of the policy, on Kyverno 1.19.2 with ArgoCD managing Dex through server-side apply and self-heal.

- Kyverno gives the policy its own fail-closed webhook entry, limited to updates of Secrets and carrying the match conditions. With the admission controller down, updates to `dex-config` were rejected while updates to other Secrets, in `dex` and elsewhere, went through.
- A change to the Secret's data restarted Dex within ten seconds, with both replicas ready throughout. A metadata-only update did not, and neither did ESO's periodic refresh.
- ArgoCD left Kyverno's restart annotation in place. The Application stayed Synced through a hard refresh and a forced sync, with no extra rollout.
- A Role in the `dex` namespace is enough for the background controller. Kyverno rejects the policy, even on a dry run, until that Role exists.

Not verified:

- That ESO retries a rejected write and Dex then restarts. The rejection and the later acceptance were observed; the retry was not.
- The path from a values repo commit to the Secret. The test changed the Secret directly, and ESO's write restoring it was the second trigger.
- That ArgoCD can sync the policy and its Role from the same Application. ArgoCD dry-runs resources before applying them, so the policy may fail the first sync if its Role is not already on the cluster.
