# App enable flags stored in the AplCluster spec

- Status: proposed (revisits PRD #3515 §3/§8)

App enable flags move into `AplCluster.spec.apps.<name>` (`env/settings/cluster.yaml`) instead of the dedicated `env/settings/apps.yaml` proposed by PRD #3515 §3, reusing the existing `FileMap` entry rather than adding a new file/kind. `.Values.apps.<name>.enabled` stays the canonical read path: `derived.gotmpl` overlays `.Values.cluster.apps` onto `.Values.apps` and then unsets `.Values.cluster.apps`, so every helmfile `installed:` gate is unchanged and `bin/compare.sh` stays a zero-delta oracle (manifests and `values-repo.yaml` byte-identical). Only gating flags move (top-level `enabled` plus nested flags a release gates on, e.g. `istio.egressGateway.enabled`); non-gating config becomes vendor-shaped `values.custom.yaml`.

## Considered Options

- Dedicated `env/settings/apps.yaml` + new `FileMap` entry (PRD §3/§8) — rejected: reuse the existing `AplCluster` entry instead of adding a file/kind.
- Re-point every gate to `.Values.cluster.apps.*` — rejected: rewrites ~50 `installed:` expressions for no functional gain.

## Consequences

- Overturns PRD #3515 §3 (dedicated `apps.yaml`) and §8 (`AplApp` collapse); the `AplApp` kind and `env/apps/` are removed, and `AplCluster` carries a heavier semantic load (an enable registry inside the cluster-identity kind). Per-app keys keep concurrent toggles on non-adjacent lines, so git auto-merges.
- `AplCluster.spec` stays closed except `spec.apps`, an open-tailed map validated by one `{ enabled: boolean }` definition; nested gating exceptions ride the open tail unvalidated (future work: collapse multi-release apps to per-release identity).
- apl-api and otomi-console must re-point the enable toggle to `AplCluster.spec.apps.<name>.enabled` — a hard lockstep cross-repo release.
- Migration is offline `values-changes.yaml` leaf-path relocations (`apps.<name>.enabled: cluster.apps.<name>.enabled`); interacts with [ADR-2021-10-18](2021-10-18-defaults-and-derived.md) (enablement now depends on a derived-stage overlay).
