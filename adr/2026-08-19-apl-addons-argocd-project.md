# apl-addons ArgoCD project for platform-admin addon deployments

- Status: accepted

## Context and Problem Statement

Platform admins need a way to deploy arbitrary Kubernetes addons to any namespace without going through the team-scoped AppProject model. Every existing AppProject is locked to a single team namespace and forbids cluster-scoped resources. There is no supported escape hatch for platform admins who need to deploy, say, a CRD, a cross-namespace operator, or a Helm chart that spans multiple namespaces.

## Decision Outcome

A new `apl-addons` AppProject and namespace are introduced. Platform admins drop ArgoCD `Application` CRs into `env/manifests/namespaces/apl-addons/` in the values repo. The existing `addGitOpsApps` mechanism (which scans `env/manifests/namespaces/*` and creates one `gitops-ns-{namespace}` ArgoCD Application per directory) picks this up automatically and syncs those Application CRs into the `apl-addons` namespace. ArgoCD's "app in any namespace" feature then reconciles them under the `apl-addons` project.

### AppProject spec

The `apl-addons` AppProject is fully unrestricted:

- `sourceRepos: ['*']` — platform admins must be free to pull from any registry or git host
- `sourceNamespaces: ['apl-addons']` — only Application CRs living in the `apl-addons` namespace may reference this project
- `destinations: [{namespace: '*', server: '*'}]` — any namespace on any registered cluster
- `clusterResourceWhitelist: [{group: '*', kind: '*'}]` — cluster-scoped resources allowed
- `namespaceResourceBlacklist: []` — no restrictions

### ArgoCD "app in any namespace" wiring

`application.namespaces: apl-addons` is set in both `configs.cm` (argocd-cm) and `configs.params` (argocd-cmd-params-cm). The latter triggers the conditional extra verbs on the server ClusterRole in `charts/argocd/templates/argocd-server/clusterrole.yaml`.

### Protection via ValidatingAdmissionPolicy

The `apl-addons` AppProject carries no ArgoCD finalizer. Instead, a `ValidatingAdmissionPolicy` at the API-server level blocks DELETE operations on the AppProject. A finalizer can be stripped by anyone with sufficient kubectl access and then the project deleted; a VAP cannot be bypassed without first modifying the VAP itself, which requires a separate privilege escalation step.

### Naming convention deviation

[ADR-2026-06-25](2026-06-25-manifests-directory.md) establishes that directories with an `apl-` prefix under `namespaces/` are operator-owned (written by the apl-operator program, not by humans). `apl-addons/` deviates from this: the operator bootstraps the directory with a `.gitkeep` but its contents are written by human platform admins. The `apl-` prefix is retained to signal that this directory is privileged and not a regular user-owned namespace directory.

### Constraints not enforced by the AppProject

ArgoCD AppProject `destinations` is a whitelist only — there is no native destination blacklist. Platform admins must not target the `argocd` namespace as a destination; this is documented but not enforced. Application CRs must set `project: apl-addons`; if they do not, ArgoCD will reject them with an RBAC error (no operator-level pre-validation is added).

### ORCS registry policy

Pods deployed into the `apl-addons` namespace remain subject to the Kyverno ORCS registry enforcement policy. The unrestricted AppProject scope does not imply unrestricted image provenance.
