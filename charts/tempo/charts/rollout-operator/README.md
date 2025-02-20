# Grafana rollout-operator Helm Chart

Helm chart for deploying [Grafana rollout-operator](https://github.com/grafana/rollout-operator) to Kubernetes.

# rollout-operator

![Version: 0.23.0](https://img.shields.io/badge/Version-0.23.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: v0.23.0](https://img.shields.io/badge/AppVersion-v0.23.0-informational?style=flat-square)

Grafana rollout-operator

## Requirements

Kubernetes: `^1.10.0-0`

## Installation

This section describes various use cases for installation, upgrade and migration from different systems and versions.

### Preparation

These are the common tasks to perform before any of the use cases.

```bash
# Add the repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Installation of Grafana Rollout Operator

```bash
helm install  -n <namespace> <release> grafana/rollout-operator
```

The Grafana rollout-operator should be installed in the same namespace as the statefulsets it is operating upon.
It is not a highly available application and runs as a single pod.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| fullnameOverride | string | `""` |  |
| global.commonLabels | object | `{}` | Common labels for all object directly managed by this chart. |
| hostAliases | list | `[]` | hostAliases to add |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"grafana/rollout-operator"` |  |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` |  |
| minReadySeconds | int | `10` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| podAnnotations | object | `{}` | Pod Annotations |
| podLabels | object | `{}` | Pod (extra) Labels |
| podSecurityContext | object | `{}` |  |
| priorityClassName | string | `""` |  |
| resources.limits.memory | string | `"200Mi"` |  |
| resources.requests.cpu | string | `"100m"` |  |
| resources.requests.memory | string | `"100Mi"` |  |
| securityContext | object | `{}` |  |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.create | bool | `true` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template |
| serviceMonitor.annotations | object | `{}` | ServiceMonitor annotations |
| serviceMonitor.enabled | bool | `false` | Create ServiceMonitor to scrape metrics for Prometheus |
| serviceMonitor.interval | string | `nil` | ServiceMonitor scrape interval |
| serviceMonitor.labels | object | `{}` | Additional ServiceMonitor labels |
| serviceMonitor.namespace | string | `nil` | Alternative namespace for ServiceMonitor resources |
| serviceMonitor.namespaceSelector | object | `{}` | Namespace selector for ServiceMonitor resources |
| serviceMonitor.relabelings | list | `[]` | ServiceMonitor relabel configs to apply to samples before scraping https://github.com/prometheus-operator/prometheus-operator/blob/master/Documentation/api.md#relabelconfig |
| serviceMonitor.scrapeTimeout | string | `nil` | ServiceMonitor scrape timeout in Go duration format (e.g. 15s) |
| tolerations | list | `[]` |  |
