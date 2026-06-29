# Manifests directory in the values repo

- Status: accepted

## Context and Problem Statement

The values repo (`ENV_DIR`) stores Helm values and platform configuration, reconciled by Helmfile. Some Kubernetes resources fall outside any Helm chart — SealedSecrets written during bootstrap, team custom manifests, and cluster-scoped operator configs such as CRDs and ClusterRoles. These resources need a GitOps-tracked home with clear ownership boundaries.

## Decision Outcome

An `env/manifests/` directory in the values repo is the single GitOps source-of-truth for raw Kubernetes manifests. ArgoCD reconciles it directly. The structure:

```
env/manifests/
  namespaces/
    {namespace}/          ← one ArgoCD Application per directory, synced into that namespace. The corresponding ArgoCD Applicaiton creates the namespace if does not exist
      sealedsecrets/      ← organisational subdirectory for SealedSecret resources
      {resource-type}/    ← organisational subdirectory for a given resource kind
  global/                 ← one ArgoCD Application, no destination namespace (cluster-scoped resources)
    crds/
    clusterroles/
    {resource-type}/      ← luster-scoped resource type
```

### Namespace-scoped vs cluster-scoped split

`env/manifests/namespaces/{namespace}/` maps one-to-one to a Kubernetes namespace. `env/manifests/global/` targets no namespace and is intended for platform admins to manage cluster-scoped resources: CRDs, StorageClasses, ClusterRoles, and similar.

### Operator-owned vs user-owned directories

Directories with an `apl-` prefix under `namespaces/` are operator-owned and must not be modified by users. The operator writes SealedSecrets into `namespaces/apl-secrets/` (platform secrets) and `namespaces/apl-users/` (user objects). All other namespace directories are user-owned.

### SealedSecret bootstrap and ArgoCD handoff

During install, the operator writes SealedSecret manifests to disk and applies them directly to the cluster before ArgoCD is running. Once ArgoCD is deployed it picks up the same files from git and takes over continuous reconciliation. Persisting the manifests to the values repo is what enables this handoff — without it ArgoCD would have nothing to reconcile after bootstrap.

### `sealedsecrets/` subdirectory

Within each namespace directory, SealedSecret YAMLs are grouped under a `sealedsecrets/` subdirectory for organisational clarity. There is no semantic significance; ArgoCD recurses the entire namespace directory tree regardless.
