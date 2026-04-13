# src/common/ — Shared Utilities

## OVERVIEW

Core logic for values orchestration, K8s/Helm wrappers, and platform state management used by CLI and Operator.

## MODULE INVENTORY

| Module               | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `values.ts`          | **PLATFORM ENGINE.** Merging, secrets, K8s detection, image tags. |
| `k8s.ts`             | **GOD FILE.** K8s API client (Secrets, Apps, Helm, Exec, Patch).  |
| `hf.ts`              | Helmfile wrapper (`hf()`, `hfValues()`, `hfTemplate()`).          |
| `repo.ts`            | Values repository & team configuration file management.           |
| `sealed-secrets.ts`  | Encryption and manifest generation for Sealed Secrets.            |
| `bootstrap.ts`       | Initial environment/values repository setup logic.                |
| `constants.ts`       | File paths, environment variables, and platform constants.        |
| `zx-enhance.ts`      | Enhanced `zx` shell execution with robust error handling.         |
| `runtime-upgrade.ts` | Migration runner for schema version upgrades.                     |
| `git-config.ts`      | Git identity and authentication management.                       |
| `utils.ts`           | Shared primitives (retry, sleep, object parsing).                 |

## KEY MODULES & PATTERNS

- **values.ts:** Central orchestrator for the 3-stage merge (Defaults -> User -> Derived).
- **k8s.ts:** Directly interacts with `@kubernetes/client-node`. Handles complex platform state like ArgoCD App reconciliation.
- **hf.ts:** Abstracts `helmfile` execution. Ensure `$ENV_DIR` is set before calling.
- **Dependency Flow:** `cmd/` & `operator/` -> `common/`. `common/` MUST NOT import from callers.
- **Constants:** Always use `constants.ts` for paths instead of hardcoded strings.

## ANTI-PATTERNS

- **Bootstrap Guard:** Never call `values.ts` functions within `bootstrap.ts` to avoid circular logic during init.
- **HF Naming:** `hf.ts` contains `withWorkloadValues`; treat as `withFiles` (pending rename).
- **Repo Workarounds:** `repo.ts` contains legacy "workloadValues" logic; avoid extending.
- **Async Safety:** Watch for `no-floating-promises` in entrypoints; ensure all `hf` calls are awaited.
- **Mutation:** Avoid `no-param-reassign` patterns found in `k8s.ts` when adding new methods.
