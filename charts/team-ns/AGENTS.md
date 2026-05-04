# charts/team-ns/ — Team Namespace Chart

## OVERVIEW
The core multi-tenancy engine of APL. Provisions isolated team environments with RBAC, quotas, 
networking, security policies, and CI/CD (ArgoCD + Tekton) integration.

## TEMPLATE STRUCTURE
- `templates/`
  - `_helpers.tpl`       — Label logic, domain math, Docker/volume config generation.
  - `rbac.yaml`          — Massive policy (SAs: team, kubectl, tekton; RoleBindings).
  - `routes.yaml`        — Gateway API `HTTPRoute` for team services.
  - `ingress.yaml`       — Legacy/Standard Ingress resources. (Deprecated)
  - `limitrange.yaml`    — Container resource defaults.
  - `quota.yaml`         — Team resource constraints (skipped for `team-admin`).
  - `argocd/`            — Team Apps/Projects for GitOps lifecycle.
  - `builds/`            — Tekton pipeline/build specs (Docker/Buildpacks).
  - `netpols/`           — Ingress/Egress isolation (Platform allowlist + Custom).
  - `policies/`          — Kyverno PSS (Baseline/Restricted) enforcement.
  - `tekton-tasks/`      — Reusable build steps (Kaniko, Grype, GitClone).
  - `telemetry/`         — Istio/OTel instrumentation.

## KEY TEMPLATES
- `rbac.yaml`: Manages complex multi-identity RBAC for team users and automation.
- `netpols/default-network-policies.yaml`: Implements platform isolation (deny-all + core allow).
- `argocd/argocd-application-workload.yaml`: Bridges team config to ArgoCD deployments.

## VALUE SOURCES
- Primary: `values/team-ns/team-ns.gotmpl` (Injected via Helmfile).
- Global: `helmfile.d/snippets/defaults.yaml`.
- Context: Iterated via `helmfile-60.teams.yaml.gotmpl` (except `team-admin`).

## PATTERNS
- **Identity naming**: Resources suffix/prefix with `{{ $v.teamId }}`.
- **Namespace isolation**: Always targets `team-{{ $v.teamId }}`.
- **Labeling**: Every resource MUST have `otomi.io/team: {{ $v.teamId }}`.
- **Security**: Aggregates secrets for Gitea/Harbor/Internal-Registry.
- **Builds**: Standardized on Tekton with Kaniko for Docker or Buildpacks for source.

## ANTI-PATTERNS
- **Hardcoded IDs**: Never use static team names; always use `teamId` from values.
- **Missing labels**: Resources without `otomi.io/team` will break platform logic.
- **Manual NS creation**: Let this chart handle namespace-scoped resource lifecycle.
- **Bypassing NetPols**: Adding global allows outside `custom-network-policies.yaml`.
