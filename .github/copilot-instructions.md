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

- `*default` - Standard chart deployment. Values merged: `charts/{name}/values.yaml` → `values/{name}/{name}.gotmpl` → `.Values.apps.{name}._rawValues`
- `*raw` - Deploy additional K8s manifests (operators + CRs) from `values/{name}/{name}-raw.gotmpl`
- `*rawCR` - Deploy custom resources using the `raw-cr` chart
- `*jobs` - Deploy jobs to the `maintenance` namespace using `values/jobs/{name}.gotmpl`

### Schema-Driven Validation

All user-configurable parameters MUST be defined in `values-schema.yaml` (JSON Schema). Run `npm run validate-values` to validate. The schema serves as both validation and documentation.

## CLI Commands & Workflow

### Essential Commands

```bash
# Bootstrap a new values repo (creates $ENV_DIR with defaults)
otomi bootstrap

# Validate user configuration against schema
otomi validate-values

# Validate rendered Kubernetes manifests
otomi validate-templates [-l name=myapp]

# Render values for inspection
otomi values

# Render chart values for a specific app
otomi x helmfile -l name=myapp write-values

# Deploy all charts (or use -l name=myapp for selective deploy)
otomi apply [-l name=myapp]

# Generate diff before applying
otomi diff [-l name=myapp]

# Deploy to cluster (initial setup)
otomi install
```

### Development Setup

```bash
# Install dependencies (helmfile, helm, kubectl, etc.)
npm run install-deps

# Run CLI locally (bypass Docker)
export IN_DOCKER=false
export ENV_DIR=$PWD/tests/fixtures
export NODE_ENV=test

# Compile TypeScript
npm run compile

# Run tests
npm test
```

## Integrating a New Core App

1. **Add Helm chart** to `charts/{myapp}/` (or vendor from upstream)
2. **Create values template** at `values/{myapp}/{myapp}.gotmpl`
3. **Define Helmfile release** in appropriate `helmfile.d/helmfile-*.yaml` file:
   ```yaml
   releases:
     - name: myapp
       installed: {{ .Values.apps.myapp.enabled }}
       namespace: my-namespace
       <<: *default  # or *raw, *rawCR, *jobs
   ```
4. **Add schema** for user-configurable properties in `values-schema.yaml` under `.definitions.apps.properties.myapp`
5. **Configure defaults** in `helmfile.d/snippets/defaults.yaml` under `apps.myapp`
6. **Add namespace** (if needed) to `core.yaml` at `k8s.namespaces`
7. **Configure ingress** (if needed) in `core.yaml` at `adminApps` or `teamApps`

## Docker-Based Execution

The `binzx/otomi` script wraps all commands in Docker by default:

- Uses `linode/apl-core:${otomi_version}` image
- Mounts `$ENV_DIR` as `/home/app/env/`
- Set `IN_DOCKER=false` to run locally (useful for cloud provider auth plugins)

## Testing Strategy

- Unit tests: `npm test` (Jest, located in `src/**/*.test.ts`)
- Integration tests: Use fixtures in `tests/fixtures/` with `NODE_ENV=test`
- Template validation: `otomi validate-templates` (validates all rendered manifests against K8s schemas)
- Policy tests: `npm run test:opa` (Rego policy testing)

## Key Files & Directories

| Path                   | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `src/cmd/*.ts`         | CLI command implementations                  |
| `helmfile.d/`          | Helmfile specs (execute alphabetically)      |
| `helmfile.d/snippets/` | Reusable templates, defaults, derived values |
| `charts/`              | Helm charts (vendored and custom)            |
| `values/`              | Value templates for each chart               |
| `values-schema.yaml`   | JSON Schema for user configuration           |
| `core.yaml`            | Namespaces, ingress, team apps config        |
| `binzx/otomi`          | Bash wrapper for Docker-based execution      |
| `adr/`                 | Architectural Decision Records               |

## Common Gotchas

- **Helmfile labels:** Use `-l name=myapp` to select specific releases (not `-l app=myapp`)
- **Raw values override:** Use `apps.{name}._rawValues` to override chart values not in schema (use sparingly)
- **YAML anchors:** Search for `&anchorname` to find anchor definitions when you see `<<: *anchorname`
- **Keycloak integration:** Use `_derived.oidcBaseUrl`, `apps.keycloak.idp.clientID/clientSecret` for SSO
- **Untrusted CA:** Check `_derived.untrustedCA` to conditionally disable cert verification

## Debugging Tips

- Check deployment state: `otomi status`
- View traces on errors: Collected automatically in `otomi apply` failures
- Inspect Helmfile output: `otomi x helmfile -l name=myapp template`
- Local development: Use `$PWD/tests/fixtures` as `$ENV_DIR`
- Enable verbose logging: Add `-v` flag to any command

## References

- Full development guide: [docs/development.md](../docs/development.md)
- Architectural decisions: [adr/index.md](../adr/index.md)
- Public docs: https://techdocs.akamai.com/app-platform/docs/welcome
