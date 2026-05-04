# APL Core — AI Agent Index

> **App Platform (APL)** is a Kubernetes PaaS that integrates 30+ cloud-native applications into a cohesive, multi-tenant platform.
> This index provides the context AI agents need to perform software development tasks efficiently.

**Stack:** TypeScript CLI + Kubernetes Operator + Helmfile/Helm + Go Templates
**Scale:** 3655 files, 357K lines, 54 charts, 76 TS source files

## Subdirectory Knowledge Base

| Path                                                             | Focus                                               |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| [`src/AGENTS.md`](src/AGENTS.md)                                 | TypeScript source structure, conventions, dev setup |
| [`src/cmd/AGENTS.md`](src/cmd/AGENTS.md)                         | CLI command inventory, patterns                     |
| [`src/common/AGENTS.md`](src/common/AGENTS.md)                   | Shared utility modules, dependency graph            |
| [`src/operator/AGENTS.md`](src/operator/AGENTS.md)               | GitOps operator architecture, execution flow        |
| [`helmfile.d/AGENTS.md`](helmfile.d/AGENTS.md)                   | Helmfile release phases, execution order            |
| [`helmfile.d/snippets/AGENTS.md`](helmfile.d/snippets/AGENTS.md) | Critical templates, defaults, derived values        |
| [`charts/AGENTS.md`](charts/AGENTS.md)                           | Custom vs vendored chart inventory                  |
| [`charts/team-ns/AGENTS.md`](charts/team-ns/AGENTS.md)           | Team namespace chart (most complex)                 |

---

## 1. Architecture Overview

### Codebase Structure

```
/workspace
├── src/                        # TypeScript CLI + Operator code
│   ├── cmd/                    # CLI command implementations (apply, bootstrap, install, migrate, etc.)
│   ├── common/                 # Shared utilities (git, k8s, values, crypto, helmfile wrapper)
│   ├── operator/               # APL Operator (watches CRDs, runs install/apply)
│   └── otomi.ts                # CLI entrypoint
├── helmfile.d/                 # Helmfile specs (executed alphabetically)
│   ├── helmfile-01..09.init    # Core infrastructure (cert-manager, istio, keycloak, etc.)
│   ├── helmfile-03.databases   # Platform databases (CloudNativePG)
│   ├── helmfile-10.monitoring  # Monitoring stack (prometheus, alertmanager, grafana)
│   ├── helmfile-15.ingress-core# Core ingress + admin team namespace
│   ├── helmfile-20.ingress     # External DNS
│   ├── helmfile-50.services    # Optional services (trivy, kubeflow, kserve)
│   ├── helmfile-60.teams       # Per-team releases (prometheus, grafana, tekton, team-ns)
│   ├── helmfile-70.shared      # Shared services (harbor, oauth2-proxy, otomi-api, console)
│   ├── helmfile-90/91.artifacts# Raw K8s manifests (istio artifacts, otel artifacts)
│   └── snippets/               # Reusable templates, defaults, derived values
├── charts/                     # Helm charts (custom + vendored)
│   ├── apl-*/                  # Custom APL charts (operator, harbor-op, keycloak-op, gitea-op, network-policies)
│   ├── team-ns/                # Team namespace chart (RBAC, quotas, netpols, builds, ArgoCD, Kyverno)
│   ├── raw/ raw-cr/            # Charts for deploying raw K8s resources
│   ├── jobs/                   # Chart for K8s Jobs/CronJobs
│   ├── skeleton/               # Template chart for new apps
│   └── <app>/                  # Vendored upstream charts (ingress-nginx, keycloak, harbor, etc.)
├── values/                     # Go template value files per chart
│   ├── <app>/<app>.gotmpl      # Primary values template
│   └── <app>/<app>-raw.gotmpl  # Raw K8s manifest templates
├── values-schema.yaml          # JSON Schema for ALL user-configurable parameters
├── core.yaml                   # Namespace definitions + admin/team app ingress config
├── apps.yaml                   # App metadata (versions, descriptions, dependencies)
├── versions.yaml               # Component version tags
├── values-changes.yaml         # Values migration definitions (version-to-version)
└── tests/                      # Test fixtures + integration tests
```

### Values Flow (3-Stage Merge)

Every helmfile release loads values in this strict order:

```
1. DEFAULTS     → helmfile.d/snippets/defaults.yaml    (static defaults for all apps)
2. USER INPUT   → $ENV_DIR/env/**/*.yaml               (user-provided configuration)
3. DERIVED      → helmfile.d/snippets/derived.gotmpl    (computed: URLs, certs, Istio config)
```

**Critical Rule:** Never write defaults or derived values to `$ENV_DIR`. That directory holds ONLY user-supplied values.

### Helmfile Release Anchors

Defined in `helmfile.d/snippets/templates.gotmpl`:

| Anchor     | Chart Used        | Values From                                                 | Purpose                         |
| ---------- | ----------------- | ----------------------------------------------------------- | ------------------------------- |
| `*default` | `charts/<name>`   | `values/<name>/<name>.gotmpl` + `snippets/common.gotmpl`    | Standard chart deployment       |
| `*raw`     | `charts/raw`      | `values/<name>/<name>-raw.gotmpl`                           | Deploy additional K8s manifests |
| `*rawCR`   | `charts/raw-cr`   | `values/<name>/<name>-cr.gotmpl` + `snippets/common.gotmpl` | Deploy custom resources         |
| `*jobs`    | `charts/jobs`     | `values/jobs/<name>.gotmpl`                                 | Jobs in `maintenance` namespace |
| `*otomiDb` | `charts/otomi-db` | `values/<name>/<name>-otomi-db.gotmpl`                      | Platform database charts        |

### Helmfile Spec Pattern

Every helmfile spec file follows this base loading pattern:

```yaml
bases:
  - snippets/defaults.yaml       # Stage 1: defaults
---
bases:
  - snippets/env.gotmpl          # Stage 2: user input from $ENV_DIR
---
bases:
  - snippets/derived.gotmpl      # Stage 3: computed values
---
{{ readFile "snippets/templates.gotmpl" }}    # Load release anchors
{{- $v := .Values }}
{{- $a := $v.apps }}

releases:
  - name: myapp
    installed: {{ $a | get "myapp.enabled" }}
    namespace: my-namespace
    <<: *default                 # Use anchor pattern
```

---

## 2. Key Concepts

### APL operator modes

Operation modes:

- installer (src/installer.ts)
- operator (src/operator/apl-operator.ts)

In the installer mode:

- kubernetes maniefts are rendered and applied by helmfile

In the operator mode:

- App deployment is delegated to ArgoCD controller
- The operator only renders the values (using helmfile) and applies ArgoCD application manifests to the Kubernetes cluster
- The operator perform upgrades

Operation modes are set based on the status stored in the kubernetes config map (see `APL_OPERATOR_STATUS_CM` variable)

### Secrets

All secrets are stored as SealedSecrets in git repository. Platform secres are deployed to the apl-secrets namespace.
The External Secrets Operator (ESO) is used to propagate platform secrets to the right namespace and expected format.

### App Enablement

Apps are toggled via `apps.<name>.enabled` in user config. Defaults are in `helmfile.d/snippets/defaults.yaml`. Some apps are always enabled (derived in `derived.gotmpl`): `argocd`, `cert-manager`, `ingress-nginx`, `istio`, `keycloak`, `sealed-secrets`.

### Namespace Model

Namespaces are defined in `core.yaml` under `k8s.namespaces`. Each entry can have:

- `name` — K8s namespace name
- `app` — The app that owns this namespace (defaults to name)
- `disableIstioInjection` — Skip Istio sidecar
- `disablePolicyChecks` — Skip Kyverno checks
- `labels` — Extra labels

Team namespaces follow the pattern `team-<teamId>` and are managed by the `team-ns` chart.

### Ingress Architecture

Admin apps are defined in `core.yaml` under `adminApps`. Team apps under `teamApps`. Each entry configures:

Ingress uses Gateway API (`HTTPRoute`) with Istio as the gateway implementation.
HTTPRoute binding to Gateway is set either in the `values/<app>/app.gotmpl` (if the corresponding charts/<app> delivers predefined routes) or oin the `values/<app>/<app>-raw.gotmpl`.

### Multi-Tenancy

Teams are configured under `teamConfig.<teamId>` in user values. Each team gets:

- Dedicated namespace (`team-<teamId>`)
- Network policies (default deny + platform allowlist)
- Resource quotas and limit ranges
- Optional managed monitoring (Grafana, Alertmanager, Prometheus)
- ArgoCD project + GitOps repo in Gitea
- Tekton dashboard for CI/CD
- Kyverno security policies
- Services, workloads, builds, secrets

### Schema Validation

All user-configurable parameters must be defined in `values-schema.yaml` (JSON Schema draft-07). The schema uses:

- `$ref` for reusable definitions (resources, images, networking)
- `x-secret` annotation for sensitive values (triggers secret generation)
- `additionalProperties: false` to prevent typos
- Pattern validation for names, domains, resource quantities

### Values Migration

When schema changes between versions, `values-changes.yaml` defines migrations:

- `deletions` — Remove deprecated keys
- `relocations` — Move keys to new paths
- `additions` — Add new keys with defaults
- `mutations` — Change existing values
- `customFunctions` — Complex migrations in TypeScript (`src/common/runtime-upgrades/`)
- `fileDeletions/fileAdditions` — File-level changes in `$ENV_DIR`

Current schema version: **60** (see `versions.specVersion` in defaults.yaml)

---

## 3. Agent Definitions

### Agent: Network Policy Definor

**Scope:** Create, modify, or troubleshoot Kubernetes NetworkPolicies for platform applications and teams.

**Key Files:**
| File | Purpose |
|------|---------|
| `charts/apl-network-policies/templates/networkpolicies/*.yaml` | Platform-level network policies (per-app) |
| `charts/apl-network-policies/values.yaml` | Enable/disable flags (`netpols.<appName>: true`) |
| `values/apl-network-policies/apl-network-policies.gotmpl` | Values template passing config to chart |
| `charts/team-ns/templates/netpols/default-network-policies.yaml` | Team default policies (deny-all + platform allowlist) |
| `charts/team-ns/templates/netpols/custom-network-policies.yaml` | Team custom ingress policies (AllowAll/AllowOnly) |
| `charts/team-ns/templates/netpols/custom-istio-service-entries.yaml` | Team egress policies via Istio ServiceEntries |
| `values-schema.yaml` → `definitions.netpol` | Schema for user-defined network policies |
| `values-schema.yaml` → `definitions.appNetworkPolicyConfig` | Schema for per-app netpol toggle |
| `core.yaml` → `k8s.namespaces` | Namespace labels used in selectors |
| `helmfile.d/snippets/defaults.yaml` → `apps.<app>.networkPolicies.enabled` | Default netpol enablement per app |

**Patterns:**

- **Platform policies** (`apl-network-policies` chart): Each app gets a template file in `templates/networkpolicies/<app>.yaml`, gated by `{{ if .Values.netpols.<appName> }}`. Policies use namespace selectors referencing labels from `core.yaml`. Common ingress sources: Istio gateway (via `.Values.ingressGatewaySelectors`), monitoring namespace, operators, internal namespace communication.
- **Team default policies** (`team-ns` chart): When `networkPolicy.ingressPrivate` is true, deploy deny-all + allow from platform services (istio-system, knative-serving, monitoring, tekton-pipelines, gitea).
- **Team custom policies**: Users define in `teamConfig.<team>.netpols[]` with schema `definitions.netpol`. Types: `ingress` (AllowAll from team namespaces, or AllowOnly from specific namespaces+labels) and `egress` (FQDN + port via Istio ServiceEntry).

**How to add a network policy for a new platform app:**

1. Create `charts/apl-network-policies/templates/networkpolicies/<app>.yaml`
2. Gate with `{{- if .Values.netpols.<appName> }}`
3. Define podSelector, policyTypes, ingress rules using namespace/pod selectors
4. Add `netpols.<appName>` to the values template in `values/apl-network-policies/apl-network-policies.gotmpl`
5. Optionally add `apps.<app>.networkPolicies` schema entry in `values-schema.yaml` using `$ref: '#/definitions/appNetworkPolicyConfig'`
6. Set default in `helmfile.d/snippets/defaults.yaml` under `apps.<app>.networkPolicies.enabled`

---

### Agent: New Application Integrator

**Scope:** Add a new core or optional application to the APL platform.

**Key Files:**
| File | Purpose |
|------|---------|
| `charts/<app>/` | Helm chart directory (custom or vendored) |
| `charts/skeleton/` | Template chart to copy from for custom charts |
| `values/<app>/<app>.gotmpl` | Primary values template |
| `values/<app>/<app>-raw.gotmpl` | Optional: raw K8s resources (RBAC, CRDs, etc.) |
| `helmfile.d/helmfile-*.yaml.gotmpl` | Helmfile release definition |
| `helmfile.d/snippets/defaults.yaml` | Default values for the app |
| `values-schema.yaml` → `properties.apps.<app>` | User-configurable schema |
| `core.yaml` → `k8s.namespaces` | Namespace registration |
| `core.yaml` → `adminApps` or `teamApps` | Ingress configuration (if app has UI) |
| `apps.yaml` → `appsInfo.<app>` | App metadata (version, description, links) |

**Step-by-step procedure:**

1. **Chart:** Place Helm chart in `charts/<app>/` (copy `charts/skeleton/` for custom, or vendor upstream)
2. **Values template:** Create `values/<app>/<app>.gotmpl` — access platform values via `{{ $v := .Values }}`, `{{ $a := $v.apps }}`
3. **Helmfile release:** Add release in appropriate `helmfile.d/helmfile-*.yaml.gotmpl`:
   ```yaml
   - name: <app>
     installed: {{ $a | get "<app>.enabled" }}
     namespace: <app-namespace>
     <<: *default
   ```
4. **Defaults:** Add `apps.<app>` section in `helmfile.d/snippets/defaults.yaml` with `enabled`, `resources`, `_rawValues: {}`
5. **Schema:** Add `apps.<app>` under `properties.apps` in `values-schema.yaml`
6. **Namespace:** Add to `core.yaml` → `k8s.namespaces` (with appropriate flags)
7. **Ingress** (if app has web UI): Add to `core.yaml` → `adminApps` or `teamApps`
8. **Metadata:** Add to `apps.yaml` → `appsInfo.<app>` (title, version, description, etc.)
9. **Raw artifacts** (optional): Create `values/<app>/<app>-raw.gotmpl` and add `*raw` release

**Placement rules for helmfile releases:**
| Phase | File | When to use |
|-------|------|-------------|
| 01-09 | `helmfile-0X.init` | Core infra that other apps depend on |
| 03 | `helmfile-03.databases` | Database releases using `*otomiDb` |
| 10 | `helmfile-10.monitoring` | Monitoring stack components |
| 15 | `helmfile-15.ingress-core` | Ingress-related core components |
| 20 | `helmfile-20.ingress` | DNS-related releases |
| 50 | `helmfile-50.services` | Optional/addon services |
| 60 | `helmfile-60.teams` | Per-team releases (iterated over teams) |
| 70 | `helmfile-70.shared` | Shared services (harbor, console, API) |
| 90-91 | `helmfile-90/91.artifacts` | Raw K8s manifest releases |

---

### Agent: Ingress Configurator

**Scope:** Configure ingress routes, gateways, HTTPRoutes, OAuth2 authentication, and domain management.

**Key Files:**
| File | Purpose |
|------|---------|
| `core.yaml` → `adminApps` | Admin app ingress definitions |
| `core.yaml` → `teamApps` | Team app ingress definitions |
| `helmfile.d/snippets/routes.gotmpl` | HTTPRoute template (parentRefs, auth rules) |
| `helmfile.d/snippets/authpolicy-oauth2-ext.gotmpl` | OAuth2 external auth policy template |
| `helmfile.d/snippets/authpolicy-jwt.gotmpl` | JWT authentication policy template |
| `helmfile.d/snippets/serviceentry.gotmpl` | Istio ServiceEntry template for domain routing |
| `helmfile.d/snippets/derived.gotmpl` | Computed domain names, gateway names, TLS |
| `helmfile.d/snippets/domains.gotmpl` | Domain configuration helpers |
| `charts/team-ns/templates/routes.yaml` | Team service route rendering |
| `charts/team-ns/templates/ingress.yaml` | Team ingress resources |
| `charts/kubernetes-gateways/` | Gateway API gateway definitions |
| `charts/istio-gateway/` | Istio-specific gateway chart |
| `charts/ingress-nginx/` | NGINX ingress controller chart |
| `values/ingress-nginx/` | NGINX ingress values |
| `values/istio-gateway/` | Istio gateway values |
| `values/kubernetes-gateways/` | Gateway API values |
| `values-schema.yaml` → `definitions.service` | Service/ingress schema |
| `values-schema.yaml` → `definitions.ingressClassParameters` | Ingress class config |
| `values-schema.yaml` → `properties.ingress` | Platform ingress schema |

**Concepts:**

- Domains follow pattern `<app>.<cluster.domainSuffix>` (admin) or `<app>-<team>.<cluster.domainSuffix>` (team)
- Derived values compute: `_derived.consoleDomain`, `_derived.giteaDomain`, `_derived.keycloakDomain`, etc.
- Gateway API `HTTPRoute` resources route to backend services
- OAuth2 proxy handles authentication (`auth: true` in core.yaml)
- Istio `ServiceEntry` resources make domains resolvable from within the mesh
- `ingress.platformClass` configures the main load balancer (IP, autoscaling, resources)
- Additional ingress classes via `ingress.classes[]`

---

### Agent: Schema Manager

**Scope:** Modify `values-schema.yaml` to add, change, or deprecate user-configurable parameters.

**Key Files:**
| File | Purpose |
|------|---------|
| `values-schema.yaml` | THE schema file (JSON Schema draft-07 in YAML) |
| `helmfile.d/snippets/defaults.yaml` | Defaults that MUST match schema |
| `values-changes.yaml` | Migration definitions when schema changes |
| `src/common/runtime-upgrades/` | Custom migration functions |
| `src/cmd/validate-values.ts` | Schema validation command |
| `src/cmd/migrate.ts` | Migration execution |

**Rules:**

- Every user-configurable parameter MUST have a schema entry
- Use `$ref` to reference reusable definitions (`resources`, `image`, `idName`, etc.)
- Mark secrets with `x-secret: ''` (or `x-secret: '{{ randAlphaNum N }}'` for auto-generation)
- Use `additionalProperties: false` on app schemas to catch typos
- Always include `_rawValues: { $ref: '#/definitions/rawValues' }` for escape-hatch overrides
- When removing/renaming keys, add a migration in `values-changes.yaml` and bump `versions.specVersion`

**Common schema patterns:**

```yaml
# App with resources + enabled flag
apps:
  myapp:
    additionalProperties: false
    properties:
      _rawValues:
        $ref: '#/definitions/rawValues'
      enabled:
        type: boolean
        default: false
      resources:
        additionalProperties: false
        properties:
          main:
            $ref: '#/definitions/resources'
          sidecar:
            $ref: '#/definitions/resources'
```

**Reusable definitions (most common):**
| Definition | Purpose |
|------------|---------|
| `resources` | CPU/memory requests+limits |
| `rawValues` | Escape-hatch for unschema'd chart values |
| `image` / `imageSimple` | Container image config |
| `idName` | Lowercase DNS-safe name pattern |
| `domain` | Domain pattern |
| `autoscaling` / `autoscalingEnabled` | HPA config |
| `service` | Team service definition |
| `netpol` | Network policy definition |
| `workload` | ArgoCD workload definition |
| `build` | Tekton build definition |
| `secret` | External secret definition |
| `appNetworkPolicyConfig` | Per-app netpol toggle |

---

### Agent: Team Configuration Manager

**Scope:** Manage team namespaces, RBAC, resource quotas, security policies, and team-level services.

**Key Files:**
| File | Purpose |
|------|---------|
| `charts/team-ns/` | THE team namespace chart |
| `charts/team-ns/values.yaml` | Team chart values structure |
| `charts/team-ns/templates/rbac.yaml` | Service accounts, roles, role bindings |
| `charts/team-ns/templates/limitrange.yaml` | Default resource limits for containers |
| `charts/team-ns/templates/quota.yaml` | Resource quotas (pods, load balancers) |
| `charts/team-ns/templates/netpols/` | Network policies (default + custom) |
| `charts/team-ns/templates/policies/` | Kyverno security policies |
| `charts/team-ns/templates/argocd/` | ArgoCD application + project templates |
| `charts/team-ns/templates/builds/` | Tekton build configurations (Docker, Buildpacks) |
| `charts/team-ns/templates/tekton-tasks/` | Tekton tasks (kaniko, git-clone, grype, buildpacks) |
| `charts/team-ns/templates/routes.yaml` | Service routing |
| `charts/team-ns/templates/ingress.yaml` | Ingress config |
| `charts/team-ns/templates/_helpers.tpl` | Helper templates |
| `values/team-ns/team-ns.gotmpl` | Values template for team-ns |
| `helmfile.d/helmfile-15.ingress-core.yaml.gotmpl` | Admin team namespace release |
| `helmfile.d/helmfile-60.teams.yaml.gotmpl` | Per-team releases (iterates over `teamConfig`) |
| `values-schema.yaml` → `definitions.team` | Full team configuration schema |
| `values-schema.yaml` → `definitions.teamSelfService` | Team self-service permissions |

**Team iteration pattern (helmfile-60):**

```gotmpl
{{- range $teamId, $team := omit $tc "admin" }}
  - name: team-ns-{{ $teamId }}
    installed: true
    namespace: team-{{ $teamId }}
    chart: ../charts/team-ns
    values:
      - ../values/team-ns/team-ns.gotmpl
{{- end }}
```

**Per-team releases deployed:** `tekton-dashboard-<team>`, `prometheus-<team>`, `grafana-dashboards-<team>`, `team-ns-<team>`, `team-secrets-<team>`, `prometheus-msteams-<team>` (if msteams alerts enabled).

---

### Agent: Values Template Author

**Scope:** Create or modify Go template value files in `values/`.

**Key Files:**
| File | Purpose |
|------|---------|
| `values/<app>/<app>.gotmpl` | Primary values template for each app |
| `values/<app>/<app>-raw.gotmpl` | Raw K8s manifests template |
| `values/jobs/<app>.gotmpl` | Job values templates |
| `helmfile.d/snippets/common.gotmpl` | Common values included in most releases |
| `helmfile.d/snippets/templates.gotmpl` | How values files are loaded per anchor type |

**Template conventions:**

```gotmpl
{{- $v := .Values }}                    # All merged values
{{- $a := $v.apps }}                    # All app configs
{{- $app := $a.myapp }}                 # Specific app config
{{- $tc := $v.teamConfig }}             # Team configurations
{{- $d := $v._derived }}                # Derived/computed values
{{- $provider := $v.cluster.provider }} # Cloud provider
{{- $domain := $v.cluster.domainSuffix }}# Cluster domain
```

**Accessing common derived values:**

- `$v._derived.oidcBaseUrl` — Keycloak OIDC URL
- `$v._derived.untrustedCA` — Whether CA is untrusted
- `$v._derived.tlsSecretName` — TLS wildcard cert secret name
- `$v._derived.consoleDomain`, `giteaDomain`, `keycloakDomain`, etc.
- `$v._derived.ingressPublicGatewayName` — Istio ingress gateway name

**Raw template pattern (`*-raw.gotmpl`):**

```gotmpl
resources:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: my-config
    data:
      key: value
```

---

### Agent: Helmfile Release Manager

**Scope:** Add, modify, or reorder helmfile releases.

**Key Files:**
| File | Purpose |
|------|---------|
| `helmfile.d/helmfile-*.yaml.gotmpl` | All release definitions (see placement table above) |
| `helmfile.d/snippets/templates.gotmpl` | Release anchor definitions |
| `helmfile.d/snippets/defaults.yaml` | Default values loaded by all specs |
| `helmfile.d/snippets/env.gotmpl` | User environment values |
| `helmfile.d/snippets/derived.gotmpl` | Computed values |

**Adding a release:**

```yaml
releases:
  - name: my-app                              # Must match chart dir and values dir
    installed: {{ $a | get "my-app.enabled" }} # Toggle via user config
    namespace: my-namespace                    # Target K8s namespace
    labels:                                    # Optional labels for filtering
      pkg: my-app
    <<: *default                               # Use standard deployment anchor
```

**Release with raw artifacts:**

```yaml
  - name: my-app-artifacts
    installed: {{ $a | get "my-app.enabled" }}
    namespace: my-namespace
    <<: *raw
```

**Release with labels for `otomi apply -l name=my-app`:**

```yaml
labels:
  tag: teams # Group label
  team: { { $teamId } } # Team-specific label
  pipeline: otomi-task-teams # Pipeline label
```

---

### Agent: TypeScript CLI Developer

**Scope:** Work on CLI commands, operators, and TypeScript utility code.

**Key Files:**
| File | Purpose |
|------|---------|
| `src/otomi.ts` | CLI entrypoint (yargs-based) |
| `src/cmd/index.ts` | Command registry |
| `src/cmd/*.ts` | Individual CLI commands |
| `src/common/hf.ts` | Helmfile wrapper (invokes helmfile with proper args) |
| `src/common/values.ts` | Values loading/merging logic |
| `src/common/k8s.ts` | Kubernetes API interactions |
| `src/common/bootstrap.ts` | Bootstrap logic (initial setup) |
| `src/common/utils.ts` | Shared utilities |
| `src/common/cli.ts` | CLI helper utilities |
| `src/common/constants.ts` | Constants and paths |
| `src/common/zx-enhance.ts` | Enhanced zx (Google's shell scripting lib) |
| `src/common/runtime-upgrade.ts` | Migration runner |
| `src/common/runtime-upgrades/` | Custom migration functions |
| `src/operator/` | APL Operator (watches CRDs, runs installs) |
| `tsconfig.json` / `tsconfig.build.json` | TypeScript config |
| `jest.config.ts` | Test config |
| `eslint.config.mjs` | Linting config |
| `babel.config.js` | Babel config |

**Key CLI commands:**
| Command | Source | Purpose |
|---------|--------|---------|
| `otomi apply` | `src/cmd/apply.ts` | Deploy charts via helmfile |
| `otomi bootstrap` | `src/cmd/bootstrap.ts` | Initialize values repo |
| `otomi install` | `src/cmd/install.ts` | Full cluster installation |
| `otomi validate-values` | `src/cmd/validate-values.ts` | Validate user values against schema |
| `otomi validate-templates` | `src/cmd/validate-templates.ts` | Validate rendered K8s manifests |
| `otomi diff` | `src/cmd/diff.ts` | Show diff before applying |
| `otomi migrate` | `src/cmd/migrate.ts` | Run value migrations |
| `otomi values` | `src/cmd/values.ts` | Render merged values |
| `otomi x` | `src/cmd/x.ts` | Execute arbitrary helmfile commands |

**Test patterns:** Tests are co-located as `*.test.ts` files. Use Jest with `npm test`. Fixtures in `tests/fixtures/`.

**Dev setup:**

```bash
export IN_DOCKER=false
export ENV_DIR=$PWD/tests/fixtures
export NODE_ENV=test
npm run compile
npm test
```

---

### Agent: Migration Author

**Scope:** Define value migrations when schema changes between versions.

**Key Files:**
| File | Purpose |
|------|---------|
| `values-changes.yaml` | Migration definitions (version → version) |
| `src/common/runtime-upgrade.ts` | Migration runner |
| `src/common/runtime-upgrades/` | Custom migration TypeScript functions |
| `src/cmd/migrate.ts` | Migration CLI command |
| `helmfile.d/snippets/defaults.yaml` → `versions.specVersion` | Current schema version |

**Migration types:**

```yaml
changes:
  - version: 61 # Next version number
    deletions:
      - 'apps.old-app' # Remove deprecated keys
    relocations:
      - 'apps.foo.old': 'apps.foo.new' # Move keys
    additions:
      - apps.new-app.enabled: false # Add with default
    mutations:
      - apps.foo.bar: 'newValue' # Change values
    customFunctions:
      - myMigrationFunction # TypeScript function in runtime-upgrades/
    fileDeletions:
      - env/teams/{team}/old-file.yaml
    fileAdditions:
      - env/teams/new-file.yaml
```

**After adding a migration:** Bump `versions.specVersion` in `helmfile.d/snippets/defaults.yaml`.

---

### Agent: Monitoring Stack Configurator

**Scope:** Configure Prometheus, Grafana, Alertmanager, Loki, and OpenTelemetry.

**Key Files:**
| File | Purpose |
|------|---------|
| `helmfile.d/helmfile-10.monitoring.yaml.gotmpl` | Monitoring stack releases |
| `helmfile.d/helmfile-60.teams.yaml.gotmpl` | Per-team Prometheus/Grafana/Alertmanager |
| `charts/kube-prometheus-stack/` | Prometheus operator chart |
| `charts/grafana-dashboards/` | Grafana dashboard definitions |
| `charts/loki/` | Loki log aggregation |
| `charts/otel-operator/` | OpenTelemetry operator |
| `charts/promtail/` | Promtail log shipper |
| `charts/prometheus-blackbox-exporter/` | Blackbox exporter |
| `charts/prometheus-msteams/` | MS Teams alerting bridge |
| `values/prometheus-operator/` | Prometheus operator values |
| `values/loki/` | Loki values |
| `values/otel-operator/` | OTel values |
| `values/grafana-dashboards/` | Dashboard values |
| `helmfile.d/snippets/alertmanager.gotmpl` | Alertmanager config template |
| `helmfile.d/snippets/alertmanager-teams.gotmpl` | Per-team alertmanager config |
| `helmfile.d/snippets/alertmanager/slack.gotmpl` | Slack integration |
| `helmfile.d/snippets/alertmanager/opsgenie.gotmpl` | Opsgenie integration |
| `helmfile.d/snippets/blackbox-targets.gotmpl` | Blackbox probe targets |
| `values-schema.yaml` → `definitions.alerts` | Alert configuration schema |
| `values-schema.yaml` → `properties.apps.prometheus` | Prometheus schema |
| `values-schema.yaml` → `properties.apps.loki` | Loki schema |

**Team monitoring pattern:**

- Each team can have managed monitoring (`teamConfig.<team>.settings.managedMonitoring.grafana/alertmanager`)
- Per-team Prometheus instance scrapes team namespace
- Per-team Grafana with OIDC auth + team-scoped datasources
- Per-team Alertmanager with configurable receivers (slack, msteams, opsgenie)
- Dashboards auto-provisioned from `grafana-dashboards` chart

---

### Agent: Database Manager

**Scope:** Manage CloudNativePG PostgreSQL databases for platform applications.

**Key Files:**
| File | Purpose |
|------|---------|
| `helmfile.d/helmfile-03.databases.yaml.gotmpl` | Database releases |
| `charts/otomi-db/` | Database chart (wraps CloudNativePG) |
| `charts/cloudnative-pg/` | CloudNativePG operator chart |
| `charts/cloudnative-pg-plugin-barman-cloud/` | Backup plugin chart |
| `helmfile.d/snippets/defaults.yaml` → `databases` | Database defaults (keycloak, harbor, gitea) |
| `values-schema.yaml` → `properties.databases` (if exists) | Database schema |
| `values-schema.yaml` → `properties.platformBackups.database` | Backup configuration |

**Platform databases:** keycloak, harbor, gitea — each has configurable replicas, storage size, resources, PostgreSQL parameters, and backup settings.

---

## 4. Common Go Template Helpers

Used across values templates:

| Expression                             | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `$v.cluster.domainSuffix`              | Cluster base domain                 |
| `$v.cluster.provider`                  | Cloud provider (`linode`, `custom`) |
| `$a \| get "app.key" defaultValue`     | Safe key access with fallback       |
| `$v \| dig "deep" "path" defaultValue` | Deep path access                    |
| `hasKey $dict "key"`                   | Check if key exists                 |
| `$v.otomi.isMultitenant`               | Multi-tenancy flag                  |
| `$v._derived.*`                        | All computed values                 |
| `tpl (readFile "path") $v`             | Render a sub-template with values   |
| `toYaml \| nindent N`                  | YAML serialization with indentation |

---

## 5. Testing & Validation

| Command                                     | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `npm test`                                  | Run Jest unit tests                   |
| `otomi validate-values`                     | Validate user config against schema   |
| `otomi validate-templates [-l name=app]`    | Validate rendered K8s manifests       |
| `otomi diff [-l name=app]`                  | Preview changes before apply          |
| `otomi x helmfile -l name=app template`     | Render chart templates for inspection |
| `otomi x helmfile -l name=app write-values` | Render values for inspection          |
| `npm run test:opa`                          | Run OPA/Rego policy tests             |

---

## 6. Conventions & Gotchas

- **Helmfile labels:** Use `-l name=myapp` to select releases, not `-l app=myapp`
- **Raw values override:** `apps.<name>._rawValues` overrides chart values not in schema (use sparingly)
- **YAML anchors:** Search for `&anchorname` when you see `<<: *anchorname`
- **Keycloak OIDC:** Use `_derived.oidcBaseUrl`, `apps.keycloak.idp.clientID/clientSecret`
- **Untrusted CA:** Check `_derived.untrustedCA` to conditionally disable cert verification
- **Chart naming:** Release name = chart directory name = values directory name (unless overridden in anchor)
- **App naming in schema vs defaults:** Some apps have different chartName in `apps.yaml` (e.g., `cnpg` → `cloudnative-pg`, `otel` → `otel-operator`, `trivy` → `trivy-operator`)
- **Team admin is special:** `team-admin` namespace is deployed in helmfile-15 (not helmfile-60) and has `networkPolicy: null`, `resourceQuota: null`
- **Alphabetical execution:** Helmfile specs run 01→91. Dependencies must be in earlier-numbered files.
- **.gitignore is minimal:** Only ignores `node_modules`, `package.json`, `bun.lock`, `.gitignore` itself. Most files ARE tracked.
