# Values Directory — AI Agent Guide

> Go template value files that configure Helm chart releases. Each subdirectory corresponds to a helmfile release.

## Structure

```
values/
├── <app>/
│   ├── <app>.gotmpl              # Primary chart values (required)
│   ├── <app>-raw.gotmpl          # Raw K8s manifests via *raw anchor (optional)
│   ├── <app>-otomi-db.gotmpl     # Database chart values via *otomiDb anchor (optional)
│   ├── <app>-cr.gotmpl           # Custom resources via *rawCR anchor (optional)
│   └── <app>-valkey.gotmpl       # Valkey (Redis) sidecar values (optional)
├── jobs/
│   └── scripts/                  # Job script files
├── raw/
│   └── istio-raw.gotmpl          # Shared Istio raw resources
└── tests/
    └── connectivity-raw.gotmpl   # Connectivity test manifests
```

**54 subdirectories** — one per app/component.

## File Naming Conventions

| Suffix                  | Helmfile Anchor | Chart Used        | Purpose                       |
| ----------------------- | --------------- | ----------------- | ----------------------------- |
| `<app>.gotmpl`          | `*default`      | `charts/<app>`    | Primary Helm values           |
| `<app>-raw.gotmpl`      | `*raw`          | `charts/raw`      | Additional raw K8s manifests  |
| `<app>-cr.gotmpl`       | `*rawCR`        | `charts/raw-cr`   | Custom resource manifests     |
| `<app>-otomi-db.gotmpl` | `*otomiDb`      | `charts/otomi-db` | CloudNativePG database config |

## Template Boilerplate

Every `.gotmpl` file starts with standard variable bindings:

```gotmpl
{{- $v := .Values }}              # All merged values (defaults + user + derived)
{{- $a := $v.apps.<app> }}        # This app's config
{{- $k := $v.apps.keycloak }}     # Keycloak config (if OIDC needed)
```

### Common Patterns

```gotmpl
# Access derived values
$v._derived.untrustedCA           # Whether CA is self-signed
$v._derived.oidcBaseUrl            # Keycloak OIDC endpoint
$v._derived.tlsSecretName         # Wildcard TLS secret name
$v._derived.consoleDomain         # Console URL

# Access cluster info
$v.cluster.domainSuffix           # Base domain
$v.cluster.provider               # Cloud provider

# Safe key access with fallback
$a | get "some.key" "default"
$v | dig "deep" "path" "default"

# Include shared templates
$httpRoute := tpl (readFile "../../helmfile.d/snippets/routes.gotmpl") $v | fromYaml

# Conditional on app enabled
{{- if $v.apps.someApp.enabled }}

# Image override for Linode LKE
{{- if $v.otomi.linodeLkeImageRepository }}
image:
  repository: "{{ $v.otomi.linodeLkeImageRepository }}/registry/image"
{{- end }}

# Node selector
{{- with $v.otomi | get "nodeSelector" nil }}
nodeSelector:
  {{- range $key, $val := . }}
  {{ $key }}: {{ $val }}
  {{- end }}
{{- end }}
```

### Raw Template Pattern (`*-raw.gotmpl`)

```gotmpl
resources:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: my-config
    data:
      key: value
```

## App Inventory

### Core Infrastructure

| Directory             | Files                                                     | Notes                      |
| --------------------- | --------------------------------------------------------- | -------------------------- |
| `cert-manager`        | `.gotmpl`, `-raw.gotmpl`                                  | TLS certificate management |
| `istio-base`          | `.gotmpl`                                                 | Istio CRDs                 |
| `istiod`              | `.gotmpl`                                                 | Istio control plane        |
| `istio-gateway`       | `egressgateway.yaml.gotmpl`, `ingressgateway.yaml.gotmpl` | Istio gateways             |
| `istio-resources`     | `-raw.gotmpl`                                             | Istio policies, peer auth  |
| `ingress-nginx`       | `.gotmpl`, `-raw.gotmpl`                                  | NGINX ingress controller   |
| `kubernetes-gateways` | `.gotmpl`, `-raw.gotmpl`                                  | Gateway API resources      |
| `sealed-secrets`      | `.gotmpl`, `-raw.gotmpl`                                  | Sealed secrets controller  |
| `external-secrets`    | `.gotmpl`, `-raw.gotmpl`                                  | External secrets operator  |

### Identity & Auth

| Directory      | Files                                        | Notes                       |
| -------------- | -------------------------------------------- | --------------------------- |
| `keycloak`     | `.gotmpl`, `-raw.gotmpl`, `-otomi-db.gotmpl` | Identity provider           |
| `oauth2-proxy` | `.gotmpl`, `-raw.gotmpl`                     | OAuth2 authentication proxy |

### GitOps & CI/CD

| Directory              | Files                                                          | Notes                 |
| ---------------------- | -------------------------------------------------------------- | --------------------- |
| `argocd`               | `.gotmpl`, `-raw.gotmpl`                                       | GitOps deployment     |
| `argocd-image-updater` | `.gotmpl`                                                      | Auto image updates    |
| `gitea`                | `.gotmpl`, `-raw.gotmpl`, `-otomi-db.gotmpl`, `-valkey.gotmpl` | Git server            |
| `tekton-pipelines`     | `.gotmpl`, `-raw.gotmpl`                                       | CI/CD pipelines       |
| `tekton-triggers`      | `.gotmpl`                                                      | Tekton event triggers |
| `tekton-dashboard`     | `.gotmpl`, `-raw.gotmpl`, `-teams.gotmpl`                      | Tekton UI             |

### Platform Operators

| Directory               | Files                    | Notes                     |
| ----------------------- | ------------------------ | ------------------------- |
| `apl-operator`          | `.gotmpl`, `-raw.gotmpl` | APL platform operator     |
| `apl-gitea-operator`    | `.gotmpl`, `-raw.gotmpl` | Gitea repo/org management |
| `apl-harbor-operator`   | `.gotmpl`, `-raw.gotmpl` | Harbor project management |
| `apl-keycloak-operator` | `.gotmpl`, `-raw.gotmpl` | Keycloak realm management |
| `apl-network-policies`  | `.gotmpl`                | Platform network policies |

### Monitoring & Observability

| Directory                      | Files                                                                                                | Notes                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| `prometheus-operator`          | `.gotmpl`, `-raw.gotmpl`, `-team.gotmpl`, `pod-monitors.gotmpl`, `service-monitors.gotmpl`, `rules/` | Full monitoring stack  |
| `grafana-dashboards`           | `.gotmpl`                                                                                            | Dashboard provisioning |
| `loki`                         | `.gotmpl`, `-raw.gotmpl`, `auth-config.gotmpl`                                                       | Log aggregation        |
| `promtail`                     | `.gotmpl`                                                                                            | Log shipping           |
| `otel-operator`                | `.gotmpl`, `-raw.gotmpl`                                                                             | OpenTelemetry          |
| `prometheus-blackbox-exporter` | `.gotmpl`                                                                                            | Endpoint probing       |
| `prometheus-msteams`           | `.gotmpl`                                                                                            | MS Teams alert bridge  |

### Databases

| Directory                            | Files                    | Notes                  |
| ------------------------------------ | ------------------------ | ---------------------- |
| `cloudnative-pg`                     | `.gotmpl`, `-raw.gotmpl` | CloudNativePG operator |
| `cloudnative-pg-plugin-barman-cloud` | `.gotmpl`                | Backup plugin          |

### Optional Services

| Directory            | Files                                        | Notes                      |
| -------------------- | -------------------------------------------- | -------------------------- |
| `harbor`             | `.gotmpl`, `-raw.gotmpl`, `-otomi-db.gotmpl` | Container registry         |
| `trivy-operator`     | `.gotmpl`                                    | Vulnerability scanning     |
| `kyverno`            | `.gotmpl`, `-raw.gotmpl`                     | Policy engine              |
| `policy-reporter`    | `.gotmpl`                                    | Policy violation reporting |
| `knative-operator`   | `.gotmpl`                                    | Knative operator           |
| `knative-serving`    | `-cr.gotmpl`, `-raw.gotmpl`                  | Serverless workloads       |
| `kserve`             | `.gotmpl`                                    | ML model serving           |
| `kubeflow-pipelines` | `.gotmpl`, `-raw.gotmpl`                     | ML pipelines               |
| `rabbitmq`           | `.gotmpl`                                    | Message broker             |

### Platform UI & API

| Directory         | Files                    | Notes                |
| ----------------- | ------------------------ | -------------------- |
| `otomi-console`   | `.gotmpl`                | Platform web console |
| `otomi-api`       | `.gotmpl`, `-raw.gotmpl` | Platform API         |
| `otomi-pipelines` | `.gotmpl`                | Pipeline definitions |

### Multi-Tenancy

| Directory | Files                                    | Notes                                                           |
| --------- | ---------------------------------------- | --------------------------------------------------------------- |
| `team-ns` | `.gotmpl`                                | Team namespace config (RBAC, quotas, netpols, builds, services) |
| `k8s`     | `k8s-raw.gotmpl`, `k8s-raw-teams.gotmpl` | Raw K8s resources for platform and teams                        |

### Other

| Directory                     | Files                    | Notes                 |
| ----------------------------- | ------------------------ | --------------------- |
| `external-dns`                | `.gotmpl`, `-raw.gotmpl` | DNS record management |
| `metrics-server`              | `.gotmpl`                | K8s metrics API       |
| `linode-cfw`                  | `.gotmpl`                | Linode Cloud Firewall |
| `cert-manager-webhook-linode` | `.gotmpl`                | Linode DNS01 solver   |
| `gitea-db-secret`             | `-raw.gotmpl`            | Gitea database secret |

## How to Add Values for a New App

1. Create `values/<app>/<app>.gotmpl` with standard boilerplate
2. Optionally create `-raw.gotmpl` for additional K8s resources
3. Reference in helmfile release using appropriate anchor (`*default`, `*raw`, etc.)
4. Ensure defaults exist in `helmfile.d/snippets/defaults.yaml`
5. Add schema in `values-schema.yaml`

## Key Rules

- **Never hardcode secrets** — use `external-secrets` or `x-secret` schema annotation
- **Never write derived values** — they're computed in `helmfile.d/snippets/derived.gotmpl`
- **Match release name** — directory name must match helmfile release name
- **Use `_rawValues`** — for chart values not covered by schema (escape hatch)
- **Relative paths** — snippets are referenced as `../../helmfile.d/snippets/...`
