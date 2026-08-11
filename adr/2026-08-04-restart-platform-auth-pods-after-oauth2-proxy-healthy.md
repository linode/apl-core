# Restart platform-auth pods once oauth2-proxy is healthy

- Status: accepted

## Context and Problem Statement

On install, Keycloak is not yet available when Istio first resolves the JWKS used by `RequestAuthentication`. Istio's sidecar proxy caches whatever it fetched at that point (a dummy/invalid key) and does not reliably re-fetch once Keycloak comes up, so any pod whose sidecar started before Keycloak was ready keeps failing JWT verification ("JWT verification failed") until it happens to self-heal (several minutes) or is restarted. This affects every pod labelled `otomi.io/auth: platform` (see [ADR-2026-06-12](2026-06-12-auth-policy-pod-label.md)), not just Prometheus where it was first observed.

The sidecar's fetch races Keycloak independently of the app container's own readiness gating (an app's initContainer waiting on Keycloak does not delay its Istio sidecar). Two previously attempted mitigations — tuning `PILOT_JWT_PUB_KEY_REFRESH_INTERVAL` and `PILOT_DEBOUNCE_MAX` — did not solve it and were reverted.

`oauth2-proxy` already gates its own startup on Keycloak's OIDC issuer being reachable (`wait-for-keycloak` initContainer in `values/oauth2-proxy/oauth2-proxy.gotmpl`), making "oauth2-proxy's ArgoCD Application is Healthy" the most reliable available signal that Keycloak is actually serving real keys.

## Decision Drivers

- Must not add a new long-running process or watcher to `apl-operator` — it already runs two concurrent loops and additional operational complexity there is undesirable.
- Cannot hook into the Phase 1 install sequence (`src/cmd/install.ts`): oauth2-proxy's ArgoCD Application is only created by `applyAsApps()`, which is only ever invoked from Phase 2's poll/reconcile loop (`apl-operator.ts`). Phase 1 has nothing to wait for.
- Must fire exactly once per cluster lifetime — restarting the same pods on every apply cycle would cause needless churn.
- Should reuse existing, tested primitives rather than introduce new infrastructure (chart changes, RBAC, shell scripts).

## Considered Options

- Add a blocking wait-then-restart step to `src/cmd/install.ts` (Phase 1) — impossible, see decision drivers.
- Start a separate watcher process/goroutine inside `apl-operator` dedicated to this — rejected, adds a third concurrent loop to an already complex operator.
- An ArgoCD `PostSync` hook Job shipped inside the `oauth2-proxy` chart (via its existing `extraObjects` support), restarting labelled pods once the oauth2-proxy Application syncs healthy — viable, keeps the operator untouched, but adds new chart/RBAC/script surface and duplicates the "wait for Keycloak" signal in bash instead of reusing the operator's existing ArgoCD health-check helper.
- Piggyback on the existing Phase 2 poll/reconcile loop in `apl-operator.ts` (chosen) — see Decision Outcome.

## Decision Outcome

Chosen option: piggyback on the existing poll/reconcile loop.

At the end of `runApplyIfNotBusy`'s success path (`apl-operator.ts`), after every successful apply — both `Poll`- and `Reconcile`-triggered — do a single non-blocking check of the oauth2-proxy ArgoCD Application's health (`checkArgoCDAppStatus`, no retry wrapper; the loop's own cadence is the retry). If healthy and a dedicated marker ConfigMap (e.g. `apl-platform-auth-restart-state`, separate from `apl-operator-state` since it tracks an unrelated, one-shot concern) is not yet set: restart every pod labelled `otomi.io/auth: platform` across all namespaces, reusing `restartPodOwner`/`getWorkloadKeyFromPod` from `src/common/runtime-upgrades/restart-istio-sidecars.ts`, then write the marker.

This adds no new interval, loop, or process — the check rides on cadence that already exists (sub-second while there are git changes to apply during install, at minimum every 5 minutes via the reconcile timer regardless). It also runs unconditionally on upgrades, since there is no cheap way to distinguish "fresh install" from "upgrade" at this point, and a single unnecessary pod-restart round on upgrade is harmless.

Restarting all `otomi.io/auth: platform` pods unconditionally (rather than only the ones observed failing) is deliberate: the bug is systemic, not app-specific, and scoping it to specific apps would just leave the bug in place for whichever app wasn't listed.

Fixing sidecar restarts after an Istio version upgrade is a related but separate problem, already solved by `detectAndRestartOutdatedIstioSidecars` (wired as a versioned runtime-upgrade hook in `src/common/runtime-upgrades/runtime-upgrades.ts`); it is out of scope here.

### Negative Consequences

- A pod whose sidecar races Keycloak independently of oauth2-proxy's own timing (i.e. starts before Keycloak is ready even though oauth2-proxy is already healthy) is not covered by this one-shot fix. Judged acceptable: Keycloak is a lighter, earlier-starting component than most affected apps, and the ticket already accepts a multi-minute self-heal as tolerable for stragglers.
