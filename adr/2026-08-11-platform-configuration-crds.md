# Platform configuration through PlatformSettings and PlatformTeam CRDs

- Status: accepted

## Context and Problem Statement

APL currently stores platform and team configuration in a values repository and reconciles it through a TypeScript operator, Helmfile, and broad apply operations. The replacement operator will be written in Go and needs explicit, typed, event-driven APIs with clear ownership boundaries.

## Decision Outcome

APL will introduce two cluster-scoped custom resources in `akamai.io/v1alpha1`:

- `PlatformSettings` contains user-supplied platform-wide settings. Exactly one resource named `platform` is allowed per cluster.
- `PlatformTeam` contains the settings for one team. `metadata.name` is the immutable team ID; an optional `spec.displayName` is mutable.

Both APIs use strongly typed Go fields and generated structural CRD schemas. They reject unknown fields and do not provide `_rawValues`, generic patches, or arbitrary merge escape hatches. Go API types become the authoritative configuration schema; `values-schema.yaml` remains only for migration compatibility and is then retired.

`PlatformSettings.spec` preserves the semantics of existing user-configurable platform values, except for:

- `teamConfig`, which is split into `PlatformTeam` resources
- users and memberships, which remain independently owned
- runtime status
- schema-version metadata
- defaults and derived values
- secret material

`PlatformTeam.spec` contains the existing team settings and typed team app configuration or resource overrides. It does not contain services, workloads, builds, code repositories, or network policies. Those are independently owned entities and require separate APIs and reconcilers before the TypeScript operator can be retired.

## Desired State and Secrets

The durable desired state remains Git. The API and console write CR manifests to:

```text
env/manifests/global/
  platformsettings/platform.yaml
  platformteams/<team-id>.yaml
```

Argo CD applies those manifests. The Go operator watches the live CRs and updates status, but never writes watched specs back to Git. Defaults and derived values are computed during reconciliation and are not written to either Git or CR specs.

Secret material never appears in either CR. Specs use typed Secret references containing only a name and key. Platform references resolve in `apl-secrets`; team references resolve in the primary team namespace. SealedSecret manifests remain separate Git-managed resources.

## Team Model

Each team has one primary platform-managed namespace derived as `team-<metadata.name>`. Future APIs may let administrators assign additional namespaces to a team. Assignment grants access and applies team policy; it does not transfer namespace lifecycle ownership, and removing an assignment does not delete the namespace or workloads. Namespace assignment is excluded from `v1alpha1` until its authorization and conflict rules are designed.

A `PlatformTeam` may temporarily exist before `PlatformSettings` because Git apply ordering is not guaranteed, but it cannot become operational. It reports `Ready=False` with reason `PlatformSettingsNotFound` and performs no side effects.

Team overrides are explicitly modeled. Effective team configuration resolves in this order:

1. Allowed team override
2. Platform setting
3. Operator default

Optional inherited fields preserve the distinction between unset and explicit zero values. Forbidden overrides are rejected.

## Reconciliation

The new `apl-operator` lives in a separate Go repository and has no runtime dependency on the TypeScript CLI or Helmfile, including during migration. It uses controller-runtime, Kubernetes APIs, and the Helm SDK directly.

Reconciliation is event-driven and idempotent:

- A team change reconciles only that team.
- A platform change enqueues only teams whose effective configuration depends on the changed fields.
- Effective configuration hashes prevent unchanged work.
- A periodic resync repairs missed events.
- Platform reconciliation is serialized.
- Team reconciliation uses bounded concurrency, initially four workers, and pauses mutations while shared platform dependencies change.
- The operator runs as one replica without leader election.

The operator reconciles generated inline Helm values into Argo CD Applications. Argo CD remains responsible for workload deployment and healing. Generated values are not written to Git. Applications use Server-Side Apply with distinct field managers and explicit ownership labels. Existing Applications may be adopted only when labeled as owned by the previous APL operator; other collisions report `OwnershipConflict`.

Application health continuously contributes to owning CR readiness. Independent components continue reconciling after a failure, while dependent components remain blocked. Reconciliation is not globally transactional and does not attempt global rollback.

Deployment follows explicit dependency stages instead of alphabetical Helmfile order:

1. CRDs and foundational controllers
2. Networking, certificates, secrets, and identity
3. Shared platform services
4. Team foundations
5. Team applications

## Versions and Releases

`PlatformSettings.spec.version` selects an immutable platform bundle. `PlatformTeam` inherits it. The bundle is obtained from an OCI registry and pinned by digest in a versioned release manifest.

Each operator release declares its supported platform-version range. Unsupported versions and downgrade attempts leave existing Applications unchanged and report a non-ready condition. Downgrades require a separate version-specific rollback procedure; changing the version backward is not sufficient.

CRD OpenAPI and CEL rules validate structure, names, enums, immutability, and local invariants without requiring a webhook. Reconciliation handles state-dependent rules such as downgrade prevention, reporting errors in status instead of rejecting the stored desired state.

## Status

Both CRDs expose:

- `observedGeneration`
- standard `Ready`, `Progressing`, and `Degraded` conditions
- last successful reconciliation time
- concise per-component results referencing generated Argo CD Applications

`Ready=True` requires the current generation and all required dependencies and Applications to be healthy. Missing or invalid Secret references preserve the last successful Applications, report the specific reference, and automatically retry when the Secret changes. Status never contains secret data or full effective configuration.

An emergency pause is available through a temporary operator annotation, not a `spec.suspend` field. A paused resource reports `Ready=False` with reason `ReconciliationPaused`.

## Lifecycle

Deleting a `PlatformTeam` removes operator-managed applications and ephemeral resources but retains namespaces, persistent volumes, repositories, and external data by default. Deletion is blocked while independently owned team resources still reference the team. Irreversible cleanup requires an explicit decommission workflow.

Deleting `PlatformSettings` is blocked while teams exist. Platform teardown requires teams to be decommissioned first and an explicit platform decommission action.

## Migration and Bootstrap

The `apl-operator` repository provides a separate migration CLI using the same API types and validation packages as the controller. Migration converts existing values into one `PlatformSettings` and one `PlatformTeam` per team. It fails with actionable paths when `_rawValues` or other unsupported configuration is present rather than dropping data.

The Go operator first runs in non-mutating shadow mode and compares intended output with the current system. Cutover explicitly disables the TypeScript reconciler before enabling Go mutations. There is no compatibility adapter or invocation of the old CLI. Final retirement of the TypeScript operator waits until excluded team-owned entities have separate reconcilers.

A minimal Helm bootstrap installs the CRDs, Go operator, Argo CD, Sealed Secrets controller, and required certificate plumbing. Recovery restores the Sealed Secrets key before Argo CD applies encrypted manifests. Normal platform reconciliation begins only after bootstrap dependencies are healthy.

## Consequences

- Configuration becomes typed, discoverable, event-driven, and independently reconcilable.
- Git remains the auditable declaration of user intent without becoming a generated-output store.
- Arbitrary chart overrides are intentionally unsupported; missing typed fields must be added to the API.
- The two-CRD rollout is only one phase of replacing the current values model because team-owned entities need separate APIs.
- Operator and platform releases become independently versioned but must publish and enforce compatibility ranges.
