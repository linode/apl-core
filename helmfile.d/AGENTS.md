# helmfile.d/ — Helmfile Release Definitions

## OVERVIEW
Orchestrates 30+ cloud-native apps via ordered Helmfile specs using 3-stage value merge (defaults → user → derived).

## EXECUTION ORDER
Specs execute alphabetically. Dependencies MUST be in earlier-numbered files.
| File | Phase | Key Releases |
|------|-------|--------------|
| `01-09.init` | Core Infra | Kyverno, Cert-Manager, Keycloak, External-Secrets |
| `03.databases`| DBs | CloudNativePG (Gitea, Keycloak, Harbor) using `*otomiDb` |
| `03.init` | Core Infra | Components requiring post-DB setup |
| `10.monitoring`| Observability | Prometheus, Grafana, Loki, OTel, Alertmanager |
| `15.ingress-core`| Ingress | Ingress-Nginx, Istio-Base, Admin Team Namespace |
| `20.ingress` | DNS | External-DNS |
| `50.services` | Optional | Knative, Kubeflow, Trivy, Kserve |
| `60.teams` | Per-Team | Tekton, Team-Prometheus/Grafana/Secrets (iterated) |
| `70.shared` | Platform | Harbor, OAuth2-Proxy, Otomi-API, Otomi-Console |
| `90-91.artifacts`| Manifests | Raw K8s artifacts for Istio and OTel |

## RELEASE PATTERNS
Standardized loading via anchors in `snippets/templates.gotmpl`:
- `<<: *default`: Standard chart (uses `values/<name>/<name>.gotmpl`)
- `<<: *raw`: Additional K8s manifests (uses `values/<name>/<name>-raw.gotmpl`)
- `<<: *rawCR`: Custom Resources using `raw-cr` chart
- `<<: *jobs`: Maintenance jobs (uses `values/jobs/<name>.gotmpl`)
- `<<: *otomiDb`: Database releases wrapping CloudNativePG

## WHERE TO ADD NEW RELEASES
- **Core Infra:** `01-09.init` (ensure alphabetical ordering for dependencies)
- **DB-backed apps:** `03.databases` for the DB, then later for the app
- **Add-on services:** `50.services`
- **Team-scoped resources:** `60.teams` (requires iteration over `teamConfig`)

## ANTI-PATTERNS
- **Ordering errors:** Placing a dependency in a higher-numbered file than its consumer
- **Hardcoding values:** Use `.Values` or `snippets/derived.gotmpl` instead
- **Direct $ENV_DIR access:** ALWAYS use `snippets/env.gotmpl` base
- **Skipping anchors:** Standard releases MUST use `*default`, `*raw`, etc.
- **Duplicate Prefixes:** `03.databases` vs `03.init` — remember alphabetical full-filename sorting
- **Manual Values Merge:** Use `snippets/common.gotmpl` within chart values for shared state
- **Recursive Bases:** Do NOT include bases that loop back to snippets

## DIRECTORY STRUCTURE
- `snippets/`: Reusable Go templates, defaults, and derived values.
- `utils/`: Helper scripts for helmfile processing and manifest generation.
