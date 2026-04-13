# src/cmd/ — CLI Commands

OVERVIEW: Implementation of all `otomi` CLI commands using Yargs.

| Command            | File                  | Purpose                                      |
| ------------------ | --------------------- | -------------------------------------------- |
| apply              | apply.ts              | Deploy charts via helmfile                   |
| apply-as-apps      | apply-as-apps.ts      | Deploy via ArgoCD (ArgoCD integration)       |
| apply-teams        | apply-teams.ts        | Apply team-specific resources                |
| bash               | bash.ts               | Interactive bash in container                |
| bootstrap          | bootstrap.ts          | Initialize values repo                       |
| collect            | collect.ts            | Cluster diagnostics                          |
| commit             | commit.ts             | Validate + commit + push values              |
| decrypt            | decrypt.ts            | Decrypt secrets files                        |
| destroy            | destroy.ts            | Destroy k8s resources                        |
| diff               | diff.ts               | Show diff before applying                    |
| encrypt            | encrypt.ts            | Encrypt secrets files                        |
| files              | files.ts              | Show values repo files                       |
| hf                 | hf.ts                 | Direct helmfile execution                    |
| install            | install.ts            | Full cluster installation                    |
| lint               | lint.ts               | Lint manifests via helmfile                  |
| migrate            | migrate.ts            | Migrate values between versions (1.4k lines) |
| playground         | playground.ts         | Dev playground                               |
| pull               | pull.ts               | Git pull + bootstrap                         |
| score-templates    | score-templates.ts    | Score template quality                       |
| server             | server.ts             | Server mode                                  |
| status             | status.ts             | Show cluster status                          |
| sync               | sync.ts               | Sync k8s resources                           |
| template           | template.ts           | Export k8s resource templates                |
| test               | test.ts               | Run cluster tests                            |
| traces             | traces.ts             | Collect failed resource traces               |
| validate-cluster   | validate-cluster.ts   | Validate k8s version support                 |
| validate-templates | validate-templates.ts | Validate rendered manifests                  |
| validate-values    | validate-values.ts    | Validate user config against schema          |
| values             | values.ts             | Render merged values                         |
| x                  | x.ts                  | Arbitrary helmfile execution                 |

PATTERNS:

- Export `CommandModule`: `{ command, describe, builder, handler }`
- Command registration: All files exported as array in `index.ts`
- Shared utilities: Call `../common/` for `hf.ts`, `values.ts`, `k8s.ts`
- Filtering: Use `-l/--label` for helmfile label selection

WHERE TO LOOK:

- `index.ts`: Command registry
- `migrate.ts`: Complex migration logic + functions
- `apply-as-apps.ts`: ArgoCD logic

ANTI-PATTERNS:

- Business logic in `handler`: Move to `../common/`
- Direct shell calls: Use `../common/zx-enhance.ts`
- Manual value merging: Use `../common/values.ts:getValues()`
