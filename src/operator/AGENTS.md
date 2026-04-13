# src/operator/ — APL Operator

## OVERVIEW

GitOps-style operator managing platform installation and continuous reconciliation.
Drives CLI `apply` and `install` commands based on Git changes and periodic heartbeats.

## EXECUTION FLOW

1. **Bootstrap**: `main.ts` → `Installer.reconcileInstall()` (retries until success).
2. **Steady State**: `AplOperator.start()` launches parallel loops:
   - **Poll (30s)**: `GitRepository` sync → Detect changes → `applyTeams()` or `apply()`.
   - **Reconcile (5m)**: Forced `apply()` to ensure state consistency.
3. **Execution**: `AplOperations` wraps CLI commands (apply, install) using `runApplyIfNotBusy`.
4. **State**: `k8s.ts` updates ConfigMap heartbeats and apply status.
5. **Diagrams**: See `EXECUTION_FLOW.md` for detailed sequence diagrams.

## KEY FILES

| File                | Role                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `main.ts`           | Entry point; switches from Install phase to GitOps phase.             |
| `apl-operator.ts`   | Core logic; manages Poll/Reconcile loops and concurrency locks.       |
| `apl-operations.ts` | Integration layer; maps operator intent to CLI command handlers.      |
| `installer.ts`      | Finite state machine for initial platform deployment.                 |
| `git-repository.ts` | Git lifecycle; change detection (Teams-only vs. Global).              |
| `k8s.ts`            | Persistence; tracks operator health and apply results in K8s.         |
| `validators.ts`     | Bootstrapping; ensures environment variables and paths are valid.     |
| `errors.ts`         | Error hierarchy; specific types for Install vs. Operational failures. |
| `utils.ts`          | Shared logic; logging decorators and async retry wrappers.            |

## PATTERNS

- **Non-blocking loops**: Poll and Reconcile run independently; both use `isApplying` lock.
- **CLI Re-use**: Operator MUST call CLI logic via `AplOperations` to ensure consistency.
- **Granular Apply**: Differentiate between `applyTeams` (fast) and `apply` (full).
- **Heartbeat/Status**: Use `ConfigMaps` for observability instead of internal state.
- **Finite Retry**: `Installer` uses exponential backoff for the initial cluster setup.
- **Fail-fast Validation**: `validators.ts` checks environment before starting.

## ANTI-PATTERNS

- **CRD Watching**: Do NOT implement K8s controllers/watchers for configuration.
- **Stateful Logic**: Avoid keeping source-of-truth in memory; rely on Git/K8s.
- **Concurrent Applies**: Never bypass the `isApplying` lock in `apl-operator.ts`.
- **Direct Helmfile Calls**: Logic must pass through `AplOperations` command wrappers.
- **Silent Failures**: All errors must be wrapped in `OperatorError` or `InstallError`.
- **Mixing Phases**: Keep Installation logic strictly separate from GitOps reconciliation.
