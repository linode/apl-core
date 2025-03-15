# falco-exporter Helm Chart

[![Falco Ecosystem Repository](https://github.com/falcosecurity/evolution/blob/main/repos/badges/falco-ecosystem-blue.svg)](https://github.com/falcosecurity/evolution/blob/main/REPOSITORIES.md#ecosystem-scope) [![Deprecated](https://img.shields.io/badge/status-deprecated-inactive?style=for-the-badge)](https://github.com/falcosecurity/evolution/blob/main/REPOSITORIES.md#deprecated)

**NOTICE**: [falco-exporter](https://github.com/falcosecurity/falco-exporter) project is currently being **deprecated**. Contributions are not accepted, and the repository will be fully archived in the future. Starting from Falco version 0.38, Falco can expose Prometheus metrics directly, eliminating the need for a separate exporter. For further details, please refer to the [official documentation](https://falco.org/docs/metrics/).

---

Before using this chart, you need [Falco installed](https://falco.org/docs/installation/) and running with the [gRPC Output](https://falco.org/docs/grpc/) enabled (over Unix socket by default).

This chart is compatible with the [Falco Chart](https://github.com/falcosecurity/charts/tree/master/charts/falco) version `v1.2.0` or greater. Instructions to enable the gRPC Output in the Falco Helm Chart can be found [here](https://github.com/falcosecurity/charts/tree/master/charts/falco#enabling-grpc). We also strongly recommend using [gRPC over Unix socket](https://github.com/falcosecurity/charts/tree/master/charts/falco#grpc-over-unix-socket-default).

## Introduction

The chart deploys **falco-exporter** as Daemon Set on your the Kubernetes cluster. If a [Prometheus installation](https://github.com/helm/charts/tree/master/stable/prometheus) is running within your cluster, metrics provided by **falco-exporter** will be automatically discovered.

## Adding `falcosecurity` repository

Prior to installing the chart, add the `falcosecurity` charts repository:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
```

## Installing the Chart

To install the chart with the release name `falco-exporter` run:

```bash
helm install falco-exporter falcosecurity/falco-exporter
```

After a few seconds, **falco-exporter** should be running.

> **Tip**: List all releases using `helm list`, a release is a name used to track a specific deployment

## Uninstalling the Chart

To uninstall the `falco-exporter` deployment:

```bash
helm uninstall falco-exporter
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

```bash
helm install falco-exporter --set falco.grpcTimeout=3m falcosecurity/falco-exporter
```

Alternatively, a YAML file that specifies the parameters' values can be provided while installing the chart. For example,

```bash
helm install falco-exporter -f values.yaml falcosecurity/falco-exporter
```

### Enable Mutual TLS

Mutual TLS for `/metrics` endpoint can be enabled to prevent alerts content from being consumed by unauthorized components.

To install falco-exporter with Mutual TLS enabled, you have to:

```shell
helm install falco-exporter \
  --set service.mTLS.enabled=true \
  --set-file service.mTLS.server.key=/path/to/server.key \
  --set-file service.mTLS.server.crt=/path/to/server.crt \
  --set-file service.mTLS.ca.crt=/path/to/ca.crt \
  falcosecurity/falco-exporter
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## Configuration

The following table lists the main configurable parameters of the falco-exporter chart v0.12.2 and their default values. Please, refer to [values.yaml](./values.yaml) for the full list of configurable parameters.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | affinity allows pod placement based on node characteristics, or any other custom labels assigned to nodes. |
| daemonset | object | `{"annotations":{},"podLabels":{},"updateStrategy":{"type":"RollingUpdate"}}` | daemonset holds the configuration for the daemonset. |
| daemonset.annotations | object | `{}` | annotations to add to the DaemonSet pods. |
| daemonset.podLabels | object | `{}` | podLabels labels to add to the pods. |
| falco | object | `{"grpcTimeout":"2m","grpcUnixSocketPath":"unix:///run/falco/falco.sock"}` | falco the configuration to connect falco. |
| falco.grpcTimeout | string | `"2m"` | grpcTimeout timout value for grpc connection. |
| falco.grpcUnixSocketPath | string | `"unix:///run/falco/falco.sock"` | grpcUnixSocketPath path to the falco's grpc unix socket. |
| fullnameOverride | string | `""` | fullNameOverride same as nameOverride but for the full name. |
| grafanaDashboard | object | `{"enabled":false,"folder":"","folderAnnotation":"grafana_dashboard_folder","namespace":"default","prometheusDatasourceName":"Prometheus"}` | grafanaDashboard contains the configuration related to grafana dashboards. |
| grafanaDashboard.enabled | bool | `false` | enabled specifies whether the dashboard should be deployed. |
| grafanaDashboard.folder | string | `""` | folder creates and set folderAnnotation to specify where the dashboard is stored in grafana. |
| grafanaDashboard.folderAnnotation | string | `"grafana_dashboard_folder"` | folderAnnotation sets the annotation's name used by folderAnnotation in grafana's helm-chart. |
| grafanaDashboard.namespace | string | `"default"` | namespace specifies the namespace for the configmap. |
| grafanaDashboard.prometheusDatasourceName | string | `"Prometheus"` | prometheusDatasourceName name of the data source. |
| healthChecks | object | `{"livenessProbe":{"initialDelaySeconds":60,"periodSeconds":15,"probesPort":19376,"timeoutSeconds":5},"readinessProbe":{"initialDelaySeconds":30,"periodSeconds":15,"probesPort":19376,"timeoutSeconds":5}}` | healthChecks contains the configuration for liveness and readiness probes. |
| healthChecks.livenessProbe | object | `{"initialDelaySeconds":60,"periodSeconds":15,"probesPort":19376,"timeoutSeconds":5}` | livenessProbe is a diagnostic mechanism used to determine weather a container within a Pod is still running and healthy. |
| healthChecks.livenessProbe.initialDelaySeconds | int | `60` | initialDelaySeconds tells the kubelet that it should wait X seconds before performing the first probe. |
| healthChecks.livenessProbe.periodSeconds | int | `15` | periodSeconds specifies the interval at which the liveness probe will be repeated. |
| healthChecks.livenessProbe.probesPort | int | `19376` | probesPort is liveness probes port. |
| healthChecks.livenessProbe.timeoutSeconds | int | `5` | timeoutSeconds number of seconds after which the probe times out. |
| healthChecks.readinessProbe | object | `{"initialDelaySeconds":30,"periodSeconds":15,"probesPort":19376,"timeoutSeconds":5}` | readinessProbe is a mechanism used to determine whether a container within a Pod is ready to serve traffic. |
| healthChecks.readinessProbe.initialDelaySeconds | int | `30` | initialDelaySeconds tells the kubelet that it should wait X seconds before performing the first probe. |
| healthChecks.readinessProbe.periodSeconds | int | `15` | periodSeconds specifies the interval at which the readiness probe will be repeated. |
| healthChecks.readinessProbe.timeoutSeconds | int | `5` | timeoutSeconds is the number of seconds after which the probe times out. |
| image | object | `{"pullPolicy":"IfNotPresent","registry":"docker.io","repository":"falcosecurity/falco-exporter","tag":"0.8.3"}` | image is the configuration for the exporter image. |
| image.pullPolicy | string | `"IfNotPresent"` | pullPolicy is the policy used to determine when a node should attempt to pull the container image. |
| image.registry | string | `"docker.io"` | registry is the image registry to pull from. |
| image.repository | string | `"falcosecurity/falco-exporter"` | repository is the image repository to pull from. |
| image.tag | string | `"0.8.3"` | tag is image tag to pull. |
| imagePullSecrets | list | `[]` | pullSecrets a list of secrets containing credentials used when pulling from private/secure registries. |
| nameOverride | string | `""` | nameOverride is the new name used to override the release name used for exporter's components. |
| nodeSelector | object | `{}` | nodeSelector specifies a set of key-value pairs that must match labels assigned to nodes for the Pod to be eligible for scheduling on that node |
| podSecurityContext | object | `{}` | podSecurityPolicy holds the security policy settings for the pod. |
| podSecurityPolicy | object | `{"annotations":{},"create":false,"name":""}` | podSecurityPolicy holds the security policy settings for the pod. |
| podSecurityPolicy.annotations | object | `{}` | annotations to add to the PSP, Role and RoleBinding |
| podSecurityPolicy.create | bool | `false` | create specifies whether a PSP, Role and RoleBinding should be created |
| podSecurityPolicy.name | string | `""` | name of the PSP, Role and RoleBinding to use. If not set and create is true, a name is generated using the fullname template |
| priorityClassName | string | `""` | priorityClassName specifies the name of the PriorityClass for the pods. |
| prometheusRules.alerts.additionalAlerts | object | `{}` |  |
| prometheusRules.alerts.alert.enabled | bool | `true` |  |
| prometheusRules.alerts.alert.for | string | `"5m"` |  |
| prometheusRules.alerts.alert.rate_interval | string | `"5m"` |  |
| prometheusRules.alerts.alert.threshold | int | `0` |  |
| prometheusRules.alerts.critical.enabled | bool | `true` |  |
| prometheusRules.alerts.critical.for | string | `"15m"` |  |
| prometheusRules.alerts.critical.rate_interval | string | `"5m"` |  |
| prometheusRules.alerts.critical.threshold | int | `0` |  |
| prometheusRules.alerts.emergency.enabled | bool | `true` |  |
| prometheusRules.alerts.emergency.for | string | `"1m"` |  |
| prometheusRules.alerts.emergency.rate_interval | string | `"1m"` |  |
| prometheusRules.alerts.emergency.threshold | int | `0` |  |
| prometheusRules.alerts.error.enabled | bool | `true` |  |
| prometheusRules.alerts.error.for | string | `"15m"` |  |
| prometheusRules.alerts.error.rate_interval | string | `"5m"` |  |
| prometheusRules.alerts.error.threshold | int | `0` |  |
| prometheusRules.alerts.warning.enabled | bool | `true` |  |
| prometheusRules.alerts.warning.for | string | `"15m"` |  |
| prometheusRules.alerts.warning.rate_interval | string | `"5m"` |  |
| prometheusRules.alerts.warning.threshold | int | `0` |  |
| prometheusRules.enabled | bool | `false` | enabled specifies whether the prometheus rules should be deployed. |
| resources | object | `{}` | resources defines the computing resources (CPU and memory) that are allocated to the containers running within the Pod. |
| scc.create | bool | `true` |  |
| securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"seccompProfile":{"type":"RuntimeDefault"}}` | securityContext holds the security context for the daemonset. |
| securityContext.capabilities | object | `{"drop":["ALL"]}` | capabilities to be assigned to the daemonset. |
| service | object | `{"annotations":{"prometheus.io/port":"9376","prometheus.io/scrape":"true"},"clusterIP":"None","labels":{},"mTLS":{"enabled":false},"port":9376,"targetPort":9376,"type":"ClusterIP"}` | service exposes the exporter service to be accessed from within the cluster. |
| service.annotations | object | `{"prometheus.io/port":"9376","prometheus.io/scrape":"true"}` | annotations set of annotations to be applied to the service. |
| service.clusterIP | string | `"None"` | clusterIP set to none. It's headless service. |
| service.labels | object | `{}` | labels set of labels to be applied to the service. |
| service.mTLS | object | `{"enabled":false}` | mTLS mutual TLS for HTTP metrics server. |
| service.mTLS.enabled | bool | `false` | enabled specifies whether the mTLS should be enabled. |
| service.port | int | `9376` | port is the port on which the Service will listen. |
| service.targetPort | int | `9376` | targetPort is the port on which the Pod is listening. |
| service.type | string | `"ClusterIP"` | type denotes the service type. Setting it to "ClusterIP" we ensure that are accessible from within the cluster. |
| serviceAccount | object | `{"annotations":{},"create":true,"name":""}` | serviceAccount is the configuration for the service account. |
| serviceAccount.name | string | `""` | name is the name of the service account to use. If not set and create is true, a name is generated using the fullname template. If set and create is false, an already existing serviceAccount must be provided. |
| serviceMonitor | object | `{"additionalLabels":{},"additionalProperties":{},"enabled":false,"interval":"","scrapeTimeout":""}` | serviceMonitor holds the configuration for the ServiceMonitor CRD. A ServiceMonitor is a custom resource definition (CRD) used to configure how Prometheus should discover and scrape metrics from the exporter service. |
| serviceMonitor.additionalLabels | object | `{}` | additionalLabels specifies labels to be added on the Service Monitor. |
| serviceMonitor.additionalProperties | object | `{}` | aditionalProperties allows setting additional properties on the endpoint such as relabelings, metricRelabelings etc. |
| serviceMonitor.enabled | bool | `false` | enable the deployment of a Service Monitor for the Prometheus Operator. |
| serviceMonitor.interval | string | `""` | interval specifies the time interval at which Prometheus should scrape metrics from the service. |
| serviceMonitor.scrapeTimeout | string | `""` | scrapeTimeout determines the maximum time Prometheus should wait for a target to respond to a scrape request. If the target does not respond within the specified timeout, Prometheus considers the scrape as failed for that target. |
| tolerations | list | `[{"effect":"NoSchedule","key":"node-role.kubernetes.io/master"},{"effect":"NoSchedule","key":"node-role.kubernetes.io/control-plane"}]` | tolerations are applied to pods and allow them to be scheduled on nodes with matching taints. |
