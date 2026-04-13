# src/ — TypeScript Source

## OVERVIEW

Core logic for APL CLI and GitOps Operator. Handles values merging,
Kubernetes orchestration, and Helmfile execution.

## STRUCTURE

- `cmd/`: Yargs command implementations (`{command, describe, builder, handler}`).
- `common/`: Core utilities (k8s, helmfile, values, git, crypto).
- `operator/`: GitOps reconciliation loop (watches Git repo, not CRDs).
- `otomi.ts`: Main entrypoint; registers commands from `cmd/index.ts`.
- `test-init.ts`: Jest global setup (mocks, console silencing).
- `stubs/`: Mock implementations for yargs and uuid used in tests.

## WHERE TO LOOK

- **Adding Commands**: New file in `src/cmd/`, register in `src/cmd/index.ts`.
- **K8s Interactions**: `src/common/k8s.ts` (1k+ lines, use caution).
- **Values/Migrations**: `src/common/values.ts` and `src/cmd/migrate.ts` (1.4k+ lines).
- **Git Operations**: `src/common/repo.ts` (700+ lines).
- **Helmfile Wrapper**: `src/common/hf.ts`.

## CONVENTIONS

- **Tests**: Co-locate `*.test.ts`. Use `ts-jest` and `test-init.ts`.
- **CLI**: Commands must export `CommandModule`.
- **Style**: No semicolons, single quotes, 120 char width.
- **TS**: Strict mode, ES2022, NodeNext resolution.
- **Lint**: No `++` (use `+= 1`), no `require`, no `param-reassign`.
- **Async**: Await all promises; `no-floating-promises` is enforced.

## ANTI-PATTERNS

- **God Files**: Do not grow `k8s.ts` or `migrate.ts`; extract logic to new modules.
- **CommonJS**: Never use `module.exports` or `require()`.
- **Mutation**: Avoid reassigning function parameters (`no-param-reassign`).
- **Mocks**: Avoid inline `jest.mock`; use `test-init.ts` or co-located mocks.

## DEV SETUP

```bash
export IN_DOCKER=false
export ENV_DIR=$PWD/tests/fixtures
export NODE_ENV=test
npm run compile && npm test
```
