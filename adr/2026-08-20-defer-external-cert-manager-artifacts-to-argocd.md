# Defer externally fulfilled cert-manager artifacts to Argo CD

- Status: proposed

## Context and Problem Statement

Phase 1 directly deploys `cert-manager-artifacts`, which currently includes cluster-local custom-CA prerequisites as well as resources that initiate work through external DNS providers and ACME. Phase 1 should establish the platform control plane without requesting or waiting for resources whose outcome depends on a system outside the cluster.

A `pending-install` Helm status was observed while installing these artifacts. That observation does not prove that certificate fulfillment blocked Helm: Helm does not wait for `Certificate`, `ClusterIssuer`, or `ExternalSecret` readiness. The incident cause must be diagnosed separately from this lifecycle decision.

## Decision Drivers

- Phase 1 must not initiate external DNS or ACME work.
- Phase 1 must create the in-cluster custom-CA issuer path, but does not need to wait for it to become Ready.
- Existing externally fulfilled `Certificate` resources must remain in the desired manifest during upgrades so they are not pruned and recreated.
- Phase 2 delegates application deployment and reconciliation to Argo CD.
- Manual and upgrade rendering must remain backward-compatible.

## Considered Options

- Keep the full manifest in Phase 1 - rejected because it initiates work against external systems before the platform control plane is established.
- Defer the whole release to Phase 2 - rejected because the custom-CA secret projection and issuer are Phase 1 prerequisites.
- Split the resources between two Helm releases - rejected because moving existing resources requires a risky Helm ownership migration.
- Keep one release definition with lifecycle-specific rendering (chosen) - preserves release identity and lets Argo CD receive the full desired manifest after Phase 1.

## Decision Outcome

Keep the `cert-manager-artifacts` Helmfile release and Argo CD release name unchanged.

During the explicit Phase 1 Helmfile invocation, select a process-local bootstrap scope. In that scope, render only `ExternalSecret/custom-ca` and `ClusterIssuer/custom-ca`, and only when `customRootCA` is configured. Phase 1 requires successful creation of these resources but does not wait for their Ready conditions.

All other rendering defaults to the full manifest. In Phase 2, the operator generates full chart values and submits the `cert-manager-cert-manager-artifacts` Argo CD Application asynchronously. Argo CD then owns synchronization, drift correction, and retry behavior. The operator does not wait for the Application to sync or become healthy.

The full manifest continues to include the externally fulfilled wildcard `Certificate` on upgrades. The lifecycle scope is not stored in Helm values, so initial-install `--reuse-values` cannot leak bootstrap scope into Argo CD or later operations.

### Consequences

- Phase 1 Helmfile deployment and Phase 2 Argo CD reconciliation intentionally render different resource sets from the same release definition.
- External certificate failures do not reopen installation; their operational status belongs to Argo CD and cert-manager.
- The observed `pending-install` incident still needs separate reproduction and diagnosis.