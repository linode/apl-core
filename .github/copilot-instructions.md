# APL Core - AI Coding Agent Instructions

## Project Overview

APL Core (App Platform for Linode) is a Kubernetes platform that integrates 30+ cloud-native applications (Istio, Argo CD, Keycloak, Tekton, Harbor, etc.) into a cohesive, multi-tenant PaaS. The codebase is a hybrid of TypeScript (CLI/operators), Helm charts, Helmfile manifests, and Go templates.

**Core Architecture:** User configuration (`env/` directory) → Helmfile bases → Helmfile releases → Helm charts → Kubernetes manifests

## Critical Development Patterns

### Values Flow (3-Stage Merge)

Values are loaded in a strict 3-stage pipeline (see [ADR-2021-10-18](../adr/2021-10-18-defaults-and-derived.md)):

1. **Defaults** (`helmfile.d/snippets/defaults.yaml`) - Static defaults, will eventually come from schema
2. **User Input** (`$ENV_DIR/env/**/*.yaml`) - User-provided configuration (NEVER write defaults/derived values here)
3. **Derived Values** (`helmfile.d/snippets/derived.gotmpl`) - Computed from defaults + user input

**Critical Rule:** User input directory (`$ENV_DIR`) contains ONLY user-supplied values. Defaults and derived values must never be written back to `$ENV_DIR`.

### Helmfile Release Patterns

All Helmfile specs in `helmfile.d/` execute alphabetically. Use reusable anchors from `helmfile.d/snippets/templates.gotmpl`:

- Add/modify app defaults in `helmfile.d/snippets/defaults.yaml` and matching schema in `values-schema.yaml`.
- Adapt chart input shape in `values/<app>/<app>.gotmpl` (example: `values/argocd/argocd.gotmpl`).
- Register namespaces and platform ingress metadata in `core.yaml` (`k8s.namespaces`, `adminApps`, `teamApps`).

### Schema-Driven Validation

- `chart/apl-operator/`: Helm chart for the apl-operator itself.
- `chart/chart-index/Chart.yaml`: List of all 3rd charts used in the platform, used for version management and documentation.
- `charts/`: Helm charts for applications.
- `charts/grafana-dashboards` is a special chart that renders the dashboard ConfigMaps and is included as a dependency in the Grafana chart.
- `helmfile.d/`: Helmfile specs and snippets for rendering manifests.
- `src/`: TypeScript source code for the apl-operator.
- `src/operator`: Reconciliation logic for the apl-operator, including controllers and Kubernetes API interactions.
- `src/cmd/apply-as-apps.ts`: Core logic for rendering and applying ArgoCD applications.
- `src/cmd/migrate.ts`: Logic for handling git data migrations during platform upgrades.
- `src/common/runtime-upgrades/`: Logic for handling runtime platform upgrades.
- `src/common/runtime-upgrade.ts`: Main entrypoint for runtime upgrade logic, invoked during reconciliation when a new version is detected.
- `values/`: Helm values templates for applications.
- `values/grafana-dashboards/grafana-dashboards.gotmpl` a way to register Grafana dashboards. Must match directory from `charts/grafana-dashboards`
- `values-schema.yaml`: JSON schema defining valid configuration keys and types.
- `tests/`: Test fixtures and test cases for validation.
- `values-changes.yaml`: Data migration instructions for `src/cmd/migrate.ts`
- `versions.yaml` pins image tags for platform components (`api`, `console`, `tasks`, `tools`).
