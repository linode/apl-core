# charts/ — Helm Charts

## OVERVIEW
Contains APL's custom infrastructure charts and 44 vendored upstream charts.
This directory provides the building blocks for the APL platform.

## CUSTOM CHARTS
| Chart | Purpose | Complexity |
|-------|---------|------------|
| apl-operator/ | Core platform operator logic | Medium |
| apl-gitea-operator/ | Gitea lifecycle and configuration | Low |
| apl-harbor-operator/ | Harbor lifecycle and configuration | Low |
| apl-keycloak-operator/| Keycloak lifecycle and configuration | Low |
| apl-network-policies/ | Platform-wide default network policies | Medium |
| team-ns/ | Team namespace engine (RBAC, quotas, builds, ArgoCD) | HIGH |
| raw/ | Deploy arbitrary K8s manifests (ConfigMaps, etc.) | Low |
| raw-cr/ | Deploy arbitrary custom resources (CRs) | Low |
| jobs/ | Reusable templates for Kubernetes Jobs/CronJobs | Low |
| skeleton/ | Template chart for creating new custom apps | Starter |

## VENDORED CHARTS
Upstream charts are mirrored here to ensure stability and local modification capability.
- **Core Platform:** argocd, cert-manager, istio-base, istio-gateway, istiod, keycloak, sealed-secrets, ingress-nginx
- **Monitoring:** kube-prometheus-stack, grafana-dashboards, loki, otel-operator, promtail, prometheus-blackbox-exporter, prometheus-msteams
- **CI/CD:** tekton-pipelines, tekton-triggers, tekton-dashboard
- **Storage/DB:** cloudnative-pg, cloudnative-pg-plugin-barman-cloud, harbor, gitea, valkey, rabbitmq
- **Security:** kyverno, trivy-operator, policy-reporter, oauth2-proxy, external-secrets
- **DNS/Ingress:** external-dns, cert-manager-webhook-linode, kubernetes-gateways
- **ML/Serverless:** knative-operator, kserve, kubeflow-pipelines
- **APL Services:** otomi-api, otomi-console, otomi-operator, otomi-db, linode-cfw
- **Utilities:** base, metrics-server, argocd-image-updater, wait-for

## PATTERNS
- **Structure:** Every chart follows the standard Helm layout (Chart.yaml, values.yaml, templates/).
- **Helpers:** Critical naming and labeling logic resides in `templates/_helpers.tpl`.
- **Feature Toggles:** Templates use `{{- if }}` for logic (e.g., ingress, RBAC, persistence).
- **Static Defaults:** Chart `values.yaml` holds base defaults for the chart itself.
- **Dynamic Input:** Configuration is injected from `values/*.gotmpl` during Helmfile execution.
- **Escape Hatches:** Use `_rawValues` in user config to override chart values not in schema.
- **Skeleton:** Always use `charts/skeleton/` as the baseline for new custom charts.
- **Labels:** Consistently use `app.kubernetes.io/managed-by: otomi` and APL-specific labels.
- **Selectors:** Cross-app communication relies on stable labels defined in `_helpers.tpl`.

## WHERE TO LOOK
- **Logic:** `templates/` — Examine for APL-specific logic, annotations, and labels.
- **Dependencies:** `Chart.yaml` — Check for upstream versions and sub-charts.
- **Default Values:** `values.yaml` — View the base chart configuration.
- **Multi-Tenancy:** `charts/team-ns/` — The primary engine for tenant isolation.
- **Manifest Injection:** `charts/raw/` or `charts/raw-cr/` for non-standard resources.
- **Job Templates:** `charts/jobs/` for platform maintenance or migration tasks.
- **Network Isolation:** `charts/apl-network-policies/` for cluster-wide restrictions.
