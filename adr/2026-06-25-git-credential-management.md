# Git credentials stored in a dedicated Kubernetes Secret

Git credentials (username, password, token) were previously scattered across ConfigMaps, Secrets, and Helm chart templates for each affected component (apl-operator, otomi-api, apl bootstrap). We consolidated all Git configuration into a single Kubernetes Secret (`apl-secrets/apl-git-config`) that components read and write directly via the Kubernetes API — because git credentials are a prerequisite to accessing the GitOps values repo and cannot be stored there.

The `otomi.git` key in the values store is still populated at runtime (URL, branch, email only — no password), so templates that reference it do not need to change.

## Why merge ConfigMap and Secret into one Secret

Git URL, branch, and email are tightly coupled to the credentials — they are always read and written together. A single Secret is simpler to create, rotate, and RBAC-guard than a ConfigMap/Secret pair that must stay in sync.

## Why apl-operator and otomi-api read the Secret directly

Passing credentials through environment variables requires the Helm chart to render them, which re-introduces values coupling and makes credential rotation require a pod restart. Direct Secret access lets both components reload credentials at runtime on every reconcile cycle without a restart.
