# Git credential management via Kubernetes Secret

Git credentials (username, password, token) were previously stored in the values store and passed to components as Helm chart values and environment variables. This scattered sensitive data across ConfigMaps, Secrets derived from values, and Helm chart templates for each affected component (apl-operator, otomi-api, apl bootstrap). Due to that migration to another git repository was prone to race conditions when one service relies on the update git credentils and the others not yet.

## Decision

Git credentials are now stored exclusively in a single Kubernetes Secret (`apl-secrets/apl-git-config`). The old per-component ConfigMap (repository URL, branch, email) has been merged into this Secret to keep all Git configuration in one place. The Secret is created during bootstrap and updated during migration; no chart template renders it from values.

The `otomi.git` key in the values store is still populated at runtime (URL, branch, email only — no password), so templates that reference it do not need to change. Components that previously read credentials from environment variables (otomi-api, apl-operator) now read and write `apl-secrets/apl-git-config` directly via the Kubernetes API.

## Why remove credentials from the values store

Git credentials to the values repo are prerequisite to perform GitOps, thus they should not be stored in that repo.

## Why merge ConfigMap and Secret into one Secret

Git URL, branch, and email are tightly coupled to the credentials — they are always read and written together. A single Secret is simpler to create, rotate, and RBAC-guard than a ConfigMap/Secret pair that must stay in sync.

## Why otomi-api reads the Secret directly

Passing credentials through environment variables requires the Helm chart to render them, which re-introduces values coupling and makes credential rotation require a pod restart. Direct Secret access lets the operator update credentials at runtime; the API reloads them on every reconcile cycle without a restart.
