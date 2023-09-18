# tempo-distributed

![Version: 1.4.2](https://img.shields.io/badge/Version-1.4.2-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 2.1.1](https://img.shields.io/badge/AppVersion-2.1.1-informational?style=flat-square)

Grafana Tempo in MicroService mode

## Source Code

* <https://github.com/grafana/tempo>

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://grafana.github.io/helm-charts | grafana-agent-operator(grafana-agent-operator) | 0.2.2 |
| https://helm.min.io/ | minio(minio) | 8.0.9 |

## Chart Repo

Add the following repo to use the chart:

```console
helm repo add grafana https://grafana.github.io/helm-charts
```

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release grafana/tempo-distributed
```

## Uninstalling the Chart

To uninstall/delete the my-release deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading

A major chart version change indicates that there is an incompatible breaking change needing manual actions.

### From Chart versions < 1.3.0

Please be aware that we've updated the minor version to Tempo 2.1, which includes breaking changes.
We recommend reviewing the [release notes](https://github.com/grafana/tempo/releases/tag/v2.1.0/) before upgrading.

### From Chart versions < 1.0.0

Please note that we've incremented the major version when upgrading to Tempo 2.0. There were a large number of
changes in this release (breaking and otherwise). It is encouraged to review the [release notes](https://grafana.com/docs/tempo/latest/release-notes/v2-0/)
and [1.5 -> 2.0 upgrade guide](https://grafana.com/docs/tempo/latest/setup/upgrade/) before upgrading.

### From chart version < 0.27.0

Version 0.27.0:

Many changes have been introduced, including some breaking changes.

The (PR)[https://github.com/grafana/helm-charts/pull/1759] includes additional details.

* **BREAKING CHANGE** centralize selector label handling -- users who wish to keep old values should still be able to use the `nameOverride` and `fullNameOverride` top level keys in their values.

* **BREAKING CHANGE** serviceMonitor has been nested under metaMonitoring -- metamonitoring can be used scrape services as well as install the operator with the following values.  Note also that the port names have changed from `http` to `http-metrics`.
```yaml
metaMonitoring:
  serviceMonitor:
    enabled: true
  grafanaAgent:
    enabled: true
    installOperator: true
```
* minio can now be enabled as part of this chart using the following values
```yaml
minio:
  enabled: true
```
* allow configuration to be stored in a secret.  See the documentation for `useExternalConfig` and `configStorageType` in the values file for more details.

### From chart version < 0.26.0

Version 0.26.0

* Moves metricsGenerator.config.storage_remote_write to metricsGenerator.config.storage.remote_write
* Moves metricsGenerator.config.service_graphs_max_items to metricsGenerator.config.processor.service_graphs.max_items

### From chart version < 0.23.0

Version 0.23.0:

* Adds /var/tempo emptyDir mount for querier, queryfrontend, distributor and compactor. Previously, /var/tempo was directory inside container.

* Sets queryFrontend.query.enabled to false. tempo-query is only required for grafana version <7.5 for compatibility with jaeger-ui. Please also note that tempo-query is incompatible with securityContext readOnlyRootFilesystem set to true.

* Sets stricter default securityContext:
```yaml
tempo:
  securityContext:
    capabilities:
      drop:
        - ALL
    readOnlyRootFilesystem: true
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    allowPrivilegeEscalation: false
  podSecurityContext:
    fsGroup: 1000
```
If you had ingester persistence enabled, you might need to manually change ownership of files in your PV if your CSI doesn't support fsGroup

### From Chart version >= 0.22.0
Align Istio GRPC named port syntax. For example,

- otlp-grpc               -> grpc-otlp
- distributor-otlp-grpc   -> grpc-distributor-otlp
- jaeger-grpc             -> grpc-jaeger
- distributor-jaeger-grpc -> grpc-distributor-jaeger

In case you need to rollback, please search the right hand side pattern and replace with left hand side pattern.

### From Chart version < 0.20.0
The image's attributes must be set under the `image` key for the Memcached service.
```yaml
memcached:
  image:
    registry: docker.io
    repository: memcached
    tag: "1.5.17-alpine"
    pullPolicy: "IfNotPresent"
```

### From Chart version < 0.18.0
Trace ingestion must now be enabled with the `enabled` key:
```yaml
traces:
  otlp:
    grpc:
      enabled: true
    http:
      enabled: true
  zipkin:
    enabled: true
  jaeger:
    thriftHttp:
      enabled: true
  opencensus:
    enabled: true
```

### From Chart versions < 0.9.0

This release the component label was shortened to be more aligned with the Loki-distributed chart and the [mixin](https://github.com/grafana/tempo/tree/master/operations/tempo-mixin) dashboards.

Due to the label changes, an existing installation cannot be upgraded without manual interaction. There are basically two options:

Option 1
Uninstall the old release and re-install the new one. There will be no data loss, as the collectors/agents can cache for a short period.

Option 2
Add new selector labels to the existing pods. This option will make your pods also temporarely unavailable, option 1 is faster:

```
kubectl label pod -n <namespace> -l app.kubernetes.io/component=<release-name>-tempo-distributed-<component>,app.kubernetes.io/instance=<instance-name> app.kubernetes.io/component=<component> --overwrite
```

Perform a non-cascading deletion of the Deployments and Statefulsets which will keep the pods running:

```
kubectl delete <deployment/statefulset> -n <namespace> -l app.kubernetes.io/component=<release-name>-tempo-distributed-<component>,app.kubernetes.io/instance=<instance-name> --cascade=false
```

Perform a regular Helm upgrade on the existing release. The new Deployment/Statefulset will pick up the existing pods and perform a rolling upgrade.

### From Chart versions < 0.8.0

By default all tracing protocols are disabled and you need to specify which protocols to enable for ingestion.

For example to enable Jaeger grpc thrift http and zipkin protocols:
```yaml
traces:
  jaeger:
    grpc: true
    thriftHttp: true
  zipkin: true
```

The distributor service is now called {{tempo.fullname}}-distributor. That could impact your ingestion towards this service.

### From Chart Versions < 0.7.0

The memcached default args are removed and should be provided manually. The settings for the `memcached.exporter` moved to `memcachedExporter`

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| adminApi.affinity | string | Soft node and soft zone anti-affinity | Affinity for admin-api pods. Passed through `tpl` and, thus, to be configured as string |
| adminApi.annotations | object | `{}` |  |
| adminApi.containerSecurityContext | object | `{"readOnlyRootFilesystem":true}` | The SecurityContext for admin_api containers |
| adminApi.env | list | `[]` |  |
| adminApi.extraArgs | object | `{}` |  |
| adminApi.extraContainers | list | `[]` |  |
| adminApi.extraEnvFrom | list | `[]` |  |
| adminApi.extraVolumeMounts | list | `[]` |  |
| adminApi.extraVolumes | list | `[]` |  |
| adminApi.initContainers | list | `[]` |  |
| adminApi.nodeSelector | object | `{}` |  |
| adminApi.persistence.subPath | string | `nil` |  |
| adminApi.podAnnotations | object | `{}` |  |
| adminApi.podDisruptionBudget | object | `{}` |  |
| adminApi.podLabels | object | `{}` |  |
| adminApi.readinessProbe.httpGet.path | string | `"/ready"` |  |
| adminApi.readinessProbe.httpGet.port | string | `"http-metrics"` |  |
| adminApi.readinessProbe.initialDelaySeconds | int | `45` |  |
| adminApi.replicas | int | `1` |  |
| adminApi.resources.requests.cpu | string | `"10m"` |  |
| adminApi.resources.requests.memory | string | `"32Mi"` |  |
| adminApi.securityContext | object | `{}` |  |
| adminApi.service.annotations | object | `{}` |  |
| adminApi.service.labels | object | `{}` |  |
| adminApi.strategy.rollingUpdate.maxSurge | int | `0` |  |
| adminApi.strategy.rollingUpdate.maxUnavailable | int | `1` |  |
| adminApi.strategy.type | string | `"RollingUpdate"` |  |
| adminApi.terminationGracePeriodSeconds | int | `60` |  |
| adminApi.tolerations | list | `[]` |  |
| adminApi.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for admin-api pods. Passed through `tpl` and, thus, to be configured as string |
| compactor.config.compaction.block_retention | string | `"48h"` | Duration to keep blocks |
| compactor.config.compaction.compacted_block_retention | string | `"1h"` |  |
| compactor.config.compaction.compaction_cycle | string | `"30s"` | The time between compaction cycles |
| compactor.config.compaction.compaction_window | string | `"1h"` | Blocks in this time window will be compacted together |
| compactor.config.compaction.max_block_bytes | int | `107374182400` | Maximum size of a compacted block in bytes |
| compactor.config.compaction.max_compaction_objects | int | `6000000` | Maximum number of traces in a compacted block. WARNING: Deprecated. Use max_block_bytes instead. |
| compactor.config.compaction.max_time_per_tenant | string | `"5m"` | The maximum amount of time to spend compacting a single tenant before moving to the next |
| compactor.config.compaction.retention_concurrency | int | `10` | Number of tenants to process in parallel during retention |
| compactor.config.compaction.v2_in_buffer_bytes | int | `5242880` | Amount of data to buffer from input blocks |
| compactor.config.compaction.v2_out_buffer_bytes | int | `20971520` | Flush data to backend when buffer is this large |
| compactor.config.compaction.v2_prefetch_traces_count | int | `1000` | Number of traces to buffer in memory during compaction |
| compactor.dnsConfigOverides.dnsConfig.options[0].name | string | `"ndots"` |  |
| compactor.dnsConfigOverides.dnsConfig.options[0].value | string | `"3"` |  |
| compactor.dnsConfigOverides.enabled | bool | `false` |  |
| compactor.extraArgs | list | `[]` | Additional CLI args for the compactor |
| compactor.extraEnv | list | `[]` | Environment variables to add to the compactor pods |
| compactor.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the compactor pods |
| compactor.extraVolumeMounts | list | `[]` | Extra volumes for compactor pods |
| compactor.extraVolumes | list | `[]` | Extra volumes for compactor deployment |
| compactor.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| compactor.image.registry | string | `nil` | The Docker registry for the compactor image. Overrides `tempo.image.registry` |
| compactor.image.repository | string | `nil` | Docker image repository for the compactor image. Overrides `tempo.image.repository` |
| compactor.image.tag | string | `nil` | Docker image tag for the compactor image. Overrides `tempo.image.tag` |
| compactor.nodeSelector | object | `{}` | Node selector for compactor pods |
| compactor.podAnnotations | object | `{}` | Annotations for compactor pods |
| compactor.podLabels | object | `{}` | Labels for compactor pods |
| compactor.priorityClassName | string | `nil` | The name of the PriorityClass for compactor pods |
| compactor.replicas | int | `1` | Number of replicas for the compactor |
| compactor.resources | object | `{}` | Resource requests and limits for the compactor |
| compactor.service.annotations | object | `{}` | Annotations for compactor service |
| compactor.terminationGracePeriodSeconds | int | `30` | Grace period to allow the compactor to shutdown before it is killed |
| compactor.tolerations | list | `[]` | Tolerations for compactor pods |
| config | string | See values.yaml | Config file contents for Tempo distributed. Passed through the `tpl` function to allow templating |
| configStorageType | string | `"ConfigMap"` | Defines what kind of object stores the configuration, a ConfigMap or a Secret. In order to move sensitive information (such as credentials) from the ConfigMap/Secret to a more secure location (e.g. vault), it is possible to use [environment variables in the configuration](https://grafana.com/docs/mimir/latest/operators-guide/configuring/reference-configuration-parameters/#use-environment-variables-in-the-configuration). Such environment variables can be then stored in a separate Secret and injected via the global.extraEnvFrom value. For details about environment injection from a Secret please see [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#use-case-as-container-environment-variables). |
| distributor.affinity | string | Hard node and soft zone anti-affinity | Affinity for distributor pods. Passed through `tpl` and, thus, to be configured as string |
| distributor.appProtocol | object | `{"grpc":null}` | Adds the appProtocol field to the distributor service. This allows distributor to work with istio protocol selection. |
| distributor.appProtocol.grpc | string | `nil` | Set the optional grpc service protocol. Ex: "grpc", "http2" or "https" |
| distributor.autoscaling.enabled | bool | `false` | Enable autoscaling for the distributor |
| distributor.autoscaling.maxReplicas | int | `3` | Maximum autoscaling replicas for the distributor |
| distributor.autoscaling.minReplicas | int | `1` | Minimum autoscaling replicas for the distributor |
| distributor.autoscaling.targetCPUUtilizationPercentage | int | `60` | Target CPU utilisation percentage for the distributor |
| distributor.autoscaling.targetMemoryUtilizationPercentage | string | `nil` | Target memory utilisation percentage for the distributor |
| distributor.config.extend_writes | string | `nil` | Disables write extension with inactive ingesters |
| distributor.config.log_received_spans | object | `{"enabled":false,"filter_by_status_error":false,"include_all_attributes":false}` | Enable to log every received span to help debug ingestion or calculate span error distributions using the logs |
| distributor.config.log_received_traces | string | `nil` | WARNING: Deprecated. Use log_received_spans instead. |
| distributor.extraArgs | list | `[]` | Additional CLI args for the distributor |
| distributor.extraEnv | list | `[]` | Environment variables to add to the distributor pods |
| distributor.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the distributor pods |
| distributor.extraVolumeMounts | list | `[]` | Extra volumes for distributor pods |
| distributor.extraVolumes | list | `[]` | Extra volumes for distributor deployment |
| distributor.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| distributor.image.registry | string | `nil` | The Docker registry for the ingester image. Overrides `tempo.image.registry` |
| distributor.image.repository | string | `nil` | Docker image repository for the ingester image. Overrides `tempo.image.repository` |
| distributor.image.tag | string | `nil` | Docker image tag for the ingester image. Overrides `tempo.image.tag` |
| distributor.nodeSelector | object | `{}` | Node selector for distributor pods |
| distributor.podAnnotations | object | `{}` | Annotations for distributor pods |
| distributor.podLabels | object | `{}` | Labels for distributor pods |
| distributor.priorityClassName | string | `nil` | The name of the PriorityClass for distributor pods |
| distributor.replicas | int | `1` | Number of replicas for the distributor |
| distributor.resources | object | `{}` | Resource requests and limits for the distributor |
| distributor.service.annotations | object | `{}` | Annotations for distributor service |
| distributor.service.loadBalancerIP | string | `""` | If type is LoadBalancer you can assign the IP to the LoadBalancer |
| distributor.service.loadBalancerSourceRanges | list | `[]` | If type is LoadBalancer limit incoming traffic from IPs. |
| distributor.service.type | string | `"ClusterIP"` | Type of service for the distributor |
| distributor.terminationGracePeriodSeconds | int | `30` | Grace period to allow the distributor to shutdown before it is killed |
| distributor.tolerations | list | `[]` | Tolerations for distributor pods |
| distributor.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for distributor pods. Passed through `tpl` and, thus, to be configured as string |
| enterprise.enabled | bool | `false` |  |
| enterprise.image.repository | string | `"grafana/enterprise-traces"` | Grafana Enterprise Metrics container image repository. Note: for Grafana Tempo use the value 'image.repository' |
| enterprise.image.tag | string | `"v2.1.0"` | Grafana Enterprise Metrics container image tag. Note: for Grafana Tempo use the value 'image.tag' |
| enterpriseGateway.affinity | string | Soft node and soft zone anti-affinity | Affinity for enterprise-gateway pods. Passed through `tpl` and, thus, to be configured as string |
| enterpriseGateway.annotations | object | `{}` |  |
| enterpriseGateway.containerSecurityContext | object | `{"readOnlyRootFilesystem":true}` | The SecurityContext for gateway containers |
| enterpriseGateway.env | list | `[]` |  |
| enterpriseGateway.extraArgs | object | `{}` |  |
| enterpriseGateway.extraContainers | list | `[]` |  |
| enterpriseGateway.extraEnvFrom | list | `[]` |  |
| enterpriseGateway.extraVolumeMounts | list | `[]` |  |
| enterpriseGateway.extraVolumes | list | `[]` |  |
| enterpriseGateway.ingress.annotations | object | `{}` | Annotations for the gateway ingress |
| enterpriseGateway.ingress.enabled | bool | `false` | Specifies whether an ingress for the gateway should be created |
| enterpriseGateway.ingress.hosts | list | `[{"host":"gateway.gem.example.com","paths":[{"path":"/"}]}]` | Hosts configuration for the gateway ingress |
| enterpriseGateway.ingress.tls | list | `[{"hosts":["gateway.gem.example.com"],"secretName":"gem-gateway-tls"}]` | TLS configuration for the gateway ingress |
| enterpriseGateway.initContainers | list | `[]` |  |
| enterpriseGateway.nodeSelector | object | `{}` |  |
| enterpriseGateway.persistence.subPath | string | `nil` |  |
| enterpriseGateway.podAnnotations | object | `{}` |  |
| enterpriseGateway.podDisruptionBudget | object | `{}` |  |
| enterpriseGateway.podLabels | object | `{}` |  |
| enterpriseGateway.readinessProbe.httpGet.path | string | `"/ready"` |  |
| enterpriseGateway.readinessProbe.httpGet.port | string | `"http-metrics"` |  |
| enterpriseGateway.readinessProbe.initialDelaySeconds | int | `45` |  |
| enterpriseGateway.replicas | int | `1` |  |
| enterpriseGateway.resources.requests.cpu | string | `"10m"` |  |
| enterpriseGateway.resources.requests.memory | string | `"32Mi"` |  |
| enterpriseGateway.securityContext | object | `{}` |  |
| enterpriseGateway.service.annotations | object | `{}` |  |
| enterpriseGateway.service.labels | object | `{}` |  |
| enterpriseGateway.service.port | string | `nil` | If the port is left undefined, the service will listen on the same port as the pod |
| enterpriseGateway.strategy.rollingUpdate.maxSurge | int | `0` |  |
| enterpriseGateway.strategy.rollingUpdate.maxUnavailable | int | `1` |  |
| enterpriseGateway.strategy.type | string | `"RollingUpdate"` |  |
| enterpriseGateway.terminationGracePeriodSeconds | int | `60` |  |
| enterpriseGateway.tolerations | list | `[]` |  |
| enterpriseGateway.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for enterprise-gateway pods. Passed through `tpl` and, thus, to be configured as string |
| enterpriseGateway.useDefaultProxyURLs | bool | `true` |  |
| externalConfigSecretName | string | `"{{ include \"tempo.resourceName\" (dict \"ctx\" . \"component\" \"config\") }}"` | Name of the Secret or ConfigMap that contains the configuration (used for naming even if config is internal). |
| externalConfigVersion | string | `"0"` | When 'useExternalConfig' is true, then changing 'externalConfigVersion' triggers restart of services - otherwise changes to the configuration cause a restart. |
| fullnameOverride | string | `""` |  |
| gateway.affinity | string | Hard node and soft zone anti-affinity | Affinity for gateway pods. Passed through `tpl` and, thus, to be configured as string |
| gateway.autoscaling.enabled | bool | `false` | Enable autoscaling for the gateway |
| gateway.autoscaling.maxReplicas | int | `3` | Maximum autoscaling replicas for the gateway |
| gateway.autoscaling.minReplicas | int | `1` | Minimum autoscaling replicas for the gateway |
| gateway.autoscaling.targetCPUUtilizationPercentage | int | `60` | Target CPU utilisation percentage for the gateway |
| gateway.autoscaling.targetMemoryUtilizationPercentage | string | `nil` | Target memory utilisation percentage for the gateway |
| gateway.basicAuth.enabled | bool | `false` | Enables basic authentication for the gateway |
| gateway.basicAuth.existingSecret | string | `nil` | Existing basic auth secret to use. Must contain '.htpasswd' |
| gateway.basicAuth.htpasswd | string | `"{{ htpasswd (required \"'gateway.basicAuth.username' is required\" .Values.gateway.basicAuth.username) (required \"'gateway.basicAuth.password' is required\" .Values.gateway.basicAuth.password) }}"` | Uses the specified username and password to compute a htpasswd using Sprig's `htpasswd` function. The value is templated using `tpl`. Override this to use a custom htpasswd, e.g. in case the default causes high CPU load. |
| gateway.basicAuth.password | string | `nil` | The basic auth password for the gateway |
| gateway.basicAuth.username | string | `nil` | The basic auth username for the gateway |
| gateway.enabled | bool | `false` | Specifies whether the gateway should be enabled |
| gateway.extraArgs | list | `[]` | Additional CLI args for the gateway |
| gateway.extraEnv | list | `[]` | Environment variables to add to the gateway pods |
| gateway.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the gateway pods |
| gateway.extraVolumeMounts | list | `[]` | Volume mounts to add to the gateway pods |
| gateway.extraVolumes | list | `[]` | Volumes to add to the gateway pods |
| gateway.image.pullPolicy | string | `"IfNotPresent"` | The gateway image pull policy |
| gateway.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `global.image.pullSecrets` |
| gateway.image.registry | string | `nil` | The Docker registry for the gateway image. Overrides `global.image.registry` |
| gateway.image.repository | string | `"nginxinc/nginx-unprivileged"` | The gateway image repository |
| gateway.image.tag | string | `"1.19-alpine"` | The gateway image tag |
| gateway.ingress.annotations | object | `{}` | Annotations for the gateway ingress |
| gateway.ingress.enabled | bool | `false` | Specifies whether an ingress for the gateway should be created |
| gateway.ingress.hosts | list | `[{"host":"gateway.tempo.example.com","paths":[{"path":"/"}]}]` | Hosts configuration for the gateway ingress |
| gateway.ingress.tls | list | `[{"hosts":["gateway.tempo.example.com"],"secretName":"tempo-gateway-tls"}]` | TLS configuration for the gateway ingress |
| gateway.nginxConfig.file | string | See values.yaml | Config file contents for Nginx. Passed through the `tpl` function to allow templating |
| gateway.nginxConfig.httpSnippet | string | `""` | Allows appending custom configuration to the http block |
| gateway.nginxConfig.logFormat | string | `"main '$remote_addr - $remote_user [$time_local]  $status '\n        '\"$request\" $body_bytes_sent \"$http_referer\" '\n        '\"$http_user_agent\" \"$http_x_forwarded_for\"';"` | NGINX log format |
| gateway.nginxConfig.resolver | string | `""` | Allows overriding the DNS resolver address nginx will use |
| gateway.nginxConfig.serverSnippet | string | `""` | Allows appending custom configuration to the server block |
| gateway.nodeSelector | object | `{}` | Node selector for gateway pods |
| gateway.podAnnotations | object | `{}` | Annotations for gateway pods |
| gateway.podLabels | object | `{}` | Labels for gateway pods |
| gateway.priorityClassName | string | `nil` | The name of the PriorityClass for gateway pods |
| gateway.readinessProbe.httpGet.path | string | `"/"` |  |
| gateway.readinessProbe.httpGet.port | string | `"http-metrics"` |  |
| gateway.readinessProbe.initialDelaySeconds | int | `15` |  |
| gateway.readinessProbe.timeoutSeconds | int | `1` |  |
| gateway.replicas | int | `1` | Number of replicas for the gateway |
| gateway.resources | object | `{}` | Resource requests and limits for the gateway |
| gateway.service.additionalPorts | object | `{}` | Additional ports to be opneed on gateway service (e.g. for RPC connections) |
| gateway.service.annotations | object | `{}` | Annotations for the gateway service |
| gateway.service.clusterIP | string | `nil` | ClusterIP of the gateway service |
| gateway.service.labels | object | `{}` | Labels for gateway service |
| gateway.service.loadBalancerIP | string | `nil` | Load balancer IPO address if service type is LoadBalancer |
| gateway.service.nodePort | string | `nil` | Node port if service type is NodePort |
| gateway.service.port | int | `80` | Port of the gateway service |
| gateway.service.type | string | `"ClusterIP"` | Type of the gateway service |
| gateway.terminationGracePeriodSeconds | int | `30` | Grace period to allow the gateway to shutdown before it is killed |
| gateway.tolerations | list | `[]` | Tolerations for gateway pods |
| gateway.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for gateway pods. Passed through `tpl` and, thus, to be configured as string |
| gateway.verboseLogging | bool | `true` | Enable logging of 2xx and 3xx HTTP requests |
| global.clusterDomain | string | `"cluster.local"` | configures cluster domain ("cluster.local" by default) |
| global.dnsNamespace | string | `"kube-system"` | configures DNS service namespace |
| global.dnsService | string | `"kube-dns"` | configures DNS service name |
| global.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets for all images, excluding enterprise. Names of existing secrets with private container registry credentials. Ref: https://kubernetes.io/docs/concepts/containers/images/#specifying-imagepullsecrets-on-a-pod Example: pullSecrets: [ my-dockerconfigjson-secret ] |
| global.image.registry | string | `"docker.io"` | Overrides the Docker registry globally for all images, excluding enterprise. |
| global.priorityClassName | string | `nil` | Overrides the priorityClassName for all pods |
| global_overrides.metrics_generator_processors[0] | string | `"service-graphs"` |  |
| global_overrides.metrics_generator_processors[1] | string | `"span-metrics"` |  |
| global_overrides.per_tenant_override_config | string | `"/conf/overrides.yaml"` |  |
| ingester.affinity | string | Soft node and soft zone anti-affinity | Affinity for ingester pods. Passed through `tpl` and, thus, to be configured as string |
| ingester.annotations | object | `{}` | Annotations for the ingester StatefulSet |
| ingester.appProtocol | object | `{"grpc":null}` | Adds the appProtocol field to the ingester service. This allows ingester to work with istio protocol selection. |
| ingester.appProtocol.grpc | string | `nil` | Set the optional grpc service protocol. Ex: "grpc", "http2" or "https" |
| ingester.autoscaling.enabled | bool | `false` | Enable autoscaling for the ingester |
| ingester.autoscaling.maxReplicas | int | `3` | Maximum autoscaling replicas for the ingester |
| ingester.autoscaling.minReplicas | int | `1` | Minimum autoscaling replicas for the ingester |
| ingester.autoscaling.targetCPUUtilizationPercentage | int | `60` | Target CPU utilisation percentage for the ingester |
| ingester.autoscaling.targetMemoryUtilizationPercentage | string | `nil` | Target memory utilisation percentage for the ingester |
| ingester.config.complete_block_timeout | string | `nil` | Duration to keep blocks in the ingester after they have been flushed |
| ingester.config.flush_check_period | string | `nil` | How often to sweep all tenants and move traces from live -> wal -> completed blocks. |
| ingester.config.max_block_bytes | string | `nil` | Maximum size of a block before cutting it |
| ingester.config.max_block_duration | string | `nil` | Maximum length of time before cutting a block |
| ingester.config.replication_factor | int | `3` | Number of copies of spans to store in the ingester ring |
| ingester.config.trace_idle_period | string | `nil` | Amount of time a trace must be idle before flushing it to the wal. |
| ingester.extraArgs | list | `[]` | Additional CLI args for the ingester |
| ingester.extraEnv | list | `[]` | Environment variables to add to the ingester pods |
| ingester.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the ingester pods |
| ingester.extraVolumeMounts | list | `[]` | Extra volumes for ingester pods |
| ingester.extraVolumes | list | `[]` | Extra volumes for ingester deployment |
| ingester.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| ingester.image.registry | string | `nil` | The Docker registry for the ingester image. Overrides `tempo.image.registry` |
| ingester.image.repository | string | `nil` | Docker image repository for the ingester image. Overrides `tempo.image.repository` |
| ingester.image.tag | string | `nil` | Docker image tag for the ingester image. Overrides `tempo.image.tag` |
| ingester.nodeSelector | object | `{}` | Node selector for ingester pods |
| ingester.persistence.annotations | object | `{}` | Annotations for ingester's persist volume claim |
| ingester.persistence.enabled | bool | `false` | Enable creating PVCs which is required when using boltdb-shipper |
| ingester.persistence.inMemory | bool | `false` | use emptyDir with ramdisk instead of PVC. **Please note that all data in ingester will be lost on pod restart** |
| ingester.persistence.size | string | `"10Gi"` | Size of persistent or memory disk |
| ingester.persistence.storageClass | string | `nil` | Storage class to be used. If defined, storageClassName: <storageClass>. If set to "-", storageClassName: "", which disables dynamic provisioning. If empty or set to null, no storageClassName spec is set, choosing the default provisioner (gp2 on AWS, standard on GKE, AWS, and OpenStack). |
| ingester.podAnnotations | object | `{}` | Annotations for ingester pods |
| ingester.podLabels | object | `{}` | Labels for ingester pods |
| ingester.priorityClassName | string | `nil` | The name of the PriorityClass for ingester pods |
| ingester.replicas | int | `3` | Number of replicas for the ingester |
| ingester.resources | object | `{}` | Resource requests and limits for the ingester |
| ingester.service.annotations | object | `{}` | Annotations for ingester service |
| ingester.terminationGracePeriodSeconds | int | `300` | Grace period to allow the ingester to shutdown before it is killed. Especially for the ingestor, this must be increased. It must be long enough so ingesters can be gracefully shutdown flushing/transferring all data and to successfully leave the member ring on shutdown. |
| ingester.tolerations | list | `[]` | Tolerations for ingester pods |
| ingester.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for ingester pods. Passed through `tpl` and, thus, to be configured as string |
| license.contents | string | `"NOTAVALIDLICENSE"` |  |
| license.external | bool | `false` |  |
| license.secretName | string | `"{{ include \"tempo.resourceName\" (dict \"ctx\" . \"component\" \"license\") }}"` |  |
| memcached.affinity | string | Hard node and soft zone anti-affinity | Affinity for memcached pods. Passed through `tpl` and, thus, to be configured as string |
| memcached.enabled | bool | `true` | Specified whether the memcached cachce should be enabled |
| memcached.extraArgs | list | `[]` | Additional CLI args for memcached |
| memcached.extraEnv | list | `[]` | Environment variables to add to memcached pods |
| memcached.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to memcached pods |
| memcached.host | string | `"memcached"` |  |
| memcached.image.pullPolicy | string | `"IfNotPresent"` | Memcached Docker image pull policy |
| memcached.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `global.image.pullSecrets` |
| memcached.image.registry | string | `nil` | The Docker registry for the Memcached image. Overrides `global.image.registry` |
| memcached.image.repository | string | `"memcached"` | Memcached Docker image repository |
| memcached.image.tag | string | `"1.5.17-alpine"` | Memcached Docker image tag |
| memcached.podAnnotations | object | `{}` | Annotations for memcached pods |
| memcached.podLabels | object | `{}` | Labels for memcached pods |
| memcached.replicas | int | `1` |  |
| memcached.resources | object | `{}` | Resource requests and limits for memcached |
| memcached.service.annotations | object | `{}` | Annotations for memcached service |
| memcached.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for memcached pods. Passed through `tpl` and, thus, to be configured as string |
| memcachedExporter.enabled | bool | `false` | Specifies whether the Memcached Exporter should be enabled |
| memcachedExporter.image.pullPolicy | string | `"IfNotPresent"` | Memcached Exporter Docker image pull policy |
| memcachedExporter.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `global.image.pullSecrets` |
| memcachedExporter.image.registry | string | `nil` | The Docker registry for the Memcached Exporter image. Overrides `global.image.registry` |
| memcachedExporter.image.repository | string | `"prom/memcached-exporter"` | Memcached Exporter Docker image repository |
| memcachedExporter.image.tag | string | `"v0.8.0"` | Memcached Exporter Docker image tag |
| memcachedExporter.resources | object | `{}` |  |
| metaMonitoring.grafanaAgent.annotations | object | `{}` | Annotations to add to all monitoring.grafana.com custom resources. Does not affect the ServiceMonitors for kubernetes metrics; use serviceMonitor.annotations for that. |
| metaMonitoring.grafanaAgent.enabled | bool | `false` | Controls whether to create PodLogs, MetricsInstance, LogsInstance, and GrafanaAgent CRs to scrape the ServiceMonitors of the chart and ship metrics and logs to the remote endpoints below. Note that you need to configure serviceMonitor in order to have some metrics available. |
| metaMonitoring.grafanaAgent.installOperator | bool | `false` | Controls whether to install the Grafana Agent Operator and its CRDs. Note that helm will not install CRDs if this flag is enabled during an upgrade. In that case install the CRDs manually from https://github.com/grafana/agent/tree/main/production/operator/crds |
| metaMonitoring.grafanaAgent.labels | object | `{}` | Labels to add to all monitoring.grafana.com custom resources. Does not affect the ServiceMonitors for kubernetes metrics; use serviceMonitor.labels for that. |
| metaMonitoring.grafanaAgent.logs.additionalClientConfigs | list | `[]` | Client configurations for the LogsInstance that will scrape Mimir pods. Follows the format of .remote. |
| metaMonitoring.grafanaAgent.logs.remote | object | `{"auth":{"passwordSecretKey":"","passwordSecretName":"","tenantId":"","username":""},"url":""}` | Default destination for logs. The config here is translated to Promtail client configuration to write logs to this Loki-compatible remote. Optional. |
| metaMonitoring.grafanaAgent.logs.remote.auth.passwordSecretKey | string | `""` | The value under this key in passwordSecretName will be used as the basic authentication password. Required only if passwordSecretName is set. |
| metaMonitoring.grafanaAgent.logs.remote.auth.passwordSecretName | string | `""` | The value under key passwordSecretKey in this secret will be used as the basic authentication password. Required only if passwordSecretKey is set. |
| metaMonitoring.grafanaAgent.logs.remote.auth.tenantId | string | `""` | Used to set X-Scope-OrgID header on requests. Usually not used in combination with username and password. |
| metaMonitoring.grafanaAgent.logs.remote.auth.username | string | `""` | Basic authentication username. Optional. |
| metaMonitoring.grafanaAgent.logs.remote.url | string | `""` | Full URL for Loki push endpoint. Usually ends in /loki/api/v1/push |
| metaMonitoring.grafanaAgent.metrics.additionalRemoteWriteConfigs | list | `[]` | Additional remote-write for the MetricsInstance that will scrape Mimir pods. Follows the format of .remote. |
| metaMonitoring.grafanaAgent.metrics.remote | object | `{"auth":{"passwordSecretKey":"","passwordSecretName":"","username":""},"headers":{},"url":""}` | Default destination for metrics. The config here is translated to remote_write configuration to push metrics to this Prometheus-compatible remote. Optional. Note that you need to configure serviceMonitor in order to have some metrics available. |
| metaMonitoring.grafanaAgent.metrics.remote.auth.passwordSecretKey | string | `""` | The value under this key in passwordSecretName will be used as the basic authentication password. Required only if passwordSecretName is set. |
| metaMonitoring.grafanaAgent.metrics.remote.auth.passwordSecretName | string | `""` | The value under key passwordSecretKey in this secret will be used as the basic authentication password. Required only if passwordSecretKey is set. |
| metaMonitoring.grafanaAgent.metrics.remote.auth.username | string | `""` | Basic authentication username. Optional. |
| metaMonitoring.grafanaAgent.metrics.remote.headers | object | `{}` | Used to add HTTP headers to remote-write requests. |
| metaMonitoring.grafanaAgent.metrics.remote.url | string | `""` | Full URL for Prometheus remote-write. Usually ends in /push |
| metaMonitoring.grafanaAgent.metrics.scrapeK8s.enabled | bool | `true` | When grafanaAgent.enabled and serviceMonitor.enabled, controls whether to create ServiceMonitors CRs for cadvisor, kubelet, and kube-state-metrics. The scraped metrics are reduced to those pertaining to Mimir pods only. |
| metaMonitoring.grafanaAgent.metrics.scrapeK8s.kubeStateMetrics | object | `{"labelSelectors":{"app.kubernetes.io/name":"kube-state-metrics"},"namespace":"kube-system"}` | Controls service discovery of kube-state-metrics. |
| metaMonitoring.grafanaAgent.namespace | string | `""` | Sets the namespace of the resources. Leave empty or unset to use the same namespace as the Helm release. |
| metaMonitoring.serviceMonitor.annotations | object | `{}` | ServiceMonitor annotations |
| metaMonitoring.serviceMonitor.enabled | bool | `false` | If enabled, ServiceMonitor resources for Prometheus Operator are created |
| metaMonitoring.serviceMonitor.interval | string | `nil` | ServiceMonitor scrape interval |
| metaMonitoring.serviceMonitor.labels | object | `{}` | Additional ServiceMonitor labels |
| metaMonitoring.serviceMonitor.metricRelabelings | list | `[]` | ServiceMonitor metric relabel configs to apply to samples before ingestion https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api.md#endpoint |
| metaMonitoring.serviceMonitor.namespace | string | `nil` | Alternative namespace for ServiceMonitor resources |
| metaMonitoring.serviceMonitor.namespaceSelector | object | `{}` | Namespace selector for ServiceMonitor resources |
| metaMonitoring.serviceMonitor.relabelings | list | `[]` | ServiceMonitor relabel configs to apply to samples before scraping https://github.com/prometheus-operator/prometheus-operator/blob/master/Documentation/api.md#relabelconfig |
| metaMonitoring.serviceMonitor.scheme | string | `"http"` | ServiceMonitor will use http by default, but you can pick https as well |
| metaMonitoring.serviceMonitor.scrapeTimeout | string | `nil` | ServiceMonitor scrape timeout in Go duration format (e.g. 15s) |
| metaMonitoring.serviceMonitor.tlsConfig | string | `nil` | ServiceMonitor will use these tlsConfig settings to make the health check requests |
| metricsGenerator.affinity | string | Hard node and soft zone anti-affinity | Affinity for metrics-generator pods. Passed through `tpl` and, thus, to be configured as string |
| metricsGenerator.annotations | object | `{}` | Annotations for the metrics-generator StatefulSet |
| metricsGenerator.appProtocol | object | `{"grpc":null}` | Adds the appProtocol field to the metricsGenerator service. This allows metricsGenerator to work with istio protocol selection. |
| metricsGenerator.appProtocol.grpc | string | `nil` | Set the optional grpc service protocol. Ex: "grpc", "http2" or "https" |
| metricsGenerator.config | object | `{"processor":{"service_graphs":{"dimensions":[],"histogram_buckets":[0.1,0.2,0.4,0.8,1.6,3.2,6.4,12.8],"max_items":10000,"wait":"10s","workers":10},"span_metrics":{"dimensions":[],"histogram_buckets":[0.002,0.004,0.008,0.016,0.032,0.064,0.128,0.256,0.512,1.02,2.05,4.1]}},"registry":{"collection_interval":"15s","external_labels":{},"stale_duration":"15m"},"storage":{"path":"/var/tempo/wal","remote_write":[],"remote_write_flush_deadline":"1m","wal":null}}` | More information on configuration: https://grafana.com/docs/tempo/latest/configuration/#metrics-generator |
| metricsGenerator.config.processor.service_graphs.dimensions | list | `[]` | resource and span attributes and are added to the metrics if present. |
| metricsGenerator.config.processor.span_metrics.dimensions | list | `[]` | Dimensions are searched for in the resource and span attributes and are added to the metrics if present. |
| metricsGenerator.config.storage.remote_write | list | `[]` | https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write |
| metricsGenerator.enabled | bool | `false` | Specifies whether a metrics-generator should be deployed |
| metricsGenerator.extraArgs | list | `[]` | Additional CLI args for the metrics-generator |
| metricsGenerator.extraEnv | list | `[]` | Environment variables to add to the metrics-generator pods |
| metricsGenerator.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the metrics-generator pods |
| metricsGenerator.extraVolumeMounts | list | `[]` | Extra volumes for metrics-generator pods |
| metricsGenerator.extraVolumes | list | `[]` | Extra volumes for metrics-generator deployment |
| metricsGenerator.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| metricsGenerator.image.registry | string | `nil` | The Docker registry for the metrics-generator image. Overrides `tempo.image.registry` |
| metricsGenerator.image.repository | string | `nil` | Docker image repository for the metrics-generator image. Overrides `tempo.image.repository` |
| metricsGenerator.image.tag | string | `nil` | Docker image tag for the metrics-generator image. Overrides `tempo.image.tag` |
| metricsGenerator.nodeSelector | object | `{}` | Node selector for metrics-generator pods |
| metricsGenerator.podAnnotations | object | `{}` | Annotations for metrics-generator pods |
| metricsGenerator.podLabels | object | `{}` | Labels for metrics-generator pods |
| metricsGenerator.ports | list | `[{"name":"grpc","port":9095,"service":true},{"name":"http-memberlist","port":7946,"service":false},{"name":"http-metrics","port":3100,"service":true}]` | Default ports |
| metricsGenerator.priorityClassName | string | `nil` | The name of the PriorityClass for metrics-generator pods |
| metricsGenerator.replicas | int | `1` | Number of replicas for the metrics-generator |
| metricsGenerator.resources | object | `{}` | Resource requests and limits for the metrics-generator |
| metricsGenerator.service.annotations | object | `{}` | Annotations for Metrics Generator service |
| metricsGenerator.terminationGracePeriodSeconds | int | `300` | Grace period to allow the metrics-generator to shutdown before it is killed. Especially for the ingestor, this must be increased. It must be long enough so metrics-generators can be gracefully shutdown flushing/transferring all data and to successfully leave the member ring on shutdown. |
| metricsGenerator.tolerations | list | `[]` | Tolerations for metrics-generator pods |
| metricsGenerator.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for metrics-generator pods. Passed through `tpl` and, thus, to be configured as string |
| metricsGenerator.walEmptyDir | object | `{}` | The EmptyDir location where the /var/tempo will be mounted on. Defaults to local disk, can be set to memory. |
| minio.buckets[0].name | string | `"tempo-traces"` |  |
| minio.buckets[0].policy | string | `"none"` |  |
| minio.buckets[0].purge | bool | `false` |  |
| minio.buckets[1].name | string | `"enterprise-traces"` |  |
| minio.buckets[1].policy | string | `"none"` |  |
| minio.buckets[1].purge | bool | `false` |  |
| minio.buckets[2].name | string | `"enterprise-traces-admin"` |  |
| minio.buckets[2].policy | string | `"none"` |  |
| minio.buckets[2].purge | bool | `false` |  |
| minio.configPathmc | string | `"/tmp/minio/mc/"` |  |
| minio.enabled | bool | `false` |  |
| minio.mode | string | `"standalone"` |  |
| minio.persistence.size | string | `"5Gi"` |  |
| minio.resources.requests.cpu | string | `"100m"` |  |
| minio.resources.requests.memory | string | `"128Mi"` |  |
| minio.rootPassword | string | `"supersecret"` |  |
| minio.rootUser | string | `"grafana-tempo"` |  |
| multitenancyEnabled | bool | `false` |  |
| overrides | string | `"overrides: {}\n"` |  |
| prometheusRule.annotations | object | `{}` | PrometheusRule annotations |
| prometheusRule.enabled | bool | `false` | If enabled, a PrometheusRule resource for Prometheus Operator is created |
| prometheusRule.groups | list | `[]` | Contents of Prometheus rules file |
| prometheusRule.labels | object | `{}` | Additional PrometheusRule labels |
| prometheusRule.namespace | string | `nil` | Alternative namespace for the PrometheusRule resource |
| querier.affinity | string | Hard node and soft zone anti-affinity | Affinity for querier pods. Passed through `tpl` and, thus, to be configured as string |
| querier.appProtocol | object | `{"grpc":null}` | Adds the appProtocol field to the querier service. This allows querier to work with istio protocol selection. |
| querier.appProtocol.grpc | string | `nil` | Set the optional grpc service protocol. Ex: "grpc", "http2" or "https" |
| querier.autoscaling.enabled | bool | `false` | Enable autoscaling for the querier |
| querier.autoscaling.maxReplicas | int | `3` | Maximum autoscaling replicas for the querier |
| querier.autoscaling.minReplicas | int | `1` | Minimum autoscaling replicas for the querier |
| querier.autoscaling.targetCPUUtilizationPercentage | int | `60` | Target CPU utilisation percentage for the querier |
| querier.autoscaling.targetMemoryUtilizationPercentage | string | `nil` | Target memory utilisation percentage for the querier |
| querier.config.frontend_worker.grpc_client_config | object | `{}` | grpc client configuration |
| querier.config.max_concurrent_queries | int | `20` | This value controls the overall number of simultaneous subqueries that the querier will service at once. It does not distinguish between the types of queries. |
| querier.config.search.external_endpoints | list | `[]` | A list of external endpoints that the querier will use to offload backend search requests |
| querier.config.search.external_hedge_requests_at | string | `"8s"` | If set to a non-zero value a second request will be issued at the provided duration. Recommended to be set to p99 of external search requests to reduce long tail latency. |
| querier.config.search.external_hedge_requests_up_to | int | `2` | The maximum number of requests to execute when hedging. Requires hedge_requests_at to be set. |
| querier.config.search.prefer_self | int | `10` | If search_external_endpoints is set then the querier will primarily act as a proxy for whatever serverless backend you have configured. This setting allows the operator to have the querier prefer itself for a configurable number of subqueries. |
| querier.config.search.query_timeout | string | `"30s"` | Timeout for search requests |
| querier.config.trace_by_id.query_timeout | string | `"10s"` | Timeout for trace lookup requests |
| querier.extraArgs | list | `[]` | Additional CLI args for the querier |
| querier.extraEnv | list | `[]` | Environment variables to add to the querier pods |
| querier.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the querier pods |
| querier.extraVolumeMounts | list | `[]` | Extra volumes for querier pods |
| querier.extraVolumes | list | `[]` | Extra volumes for querier deployment |
| querier.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| querier.image.registry | string | `nil` | The Docker registry for the querier image. Overrides `tempo.image.registry` |
| querier.image.repository | string | `nil` | Docker image repository for the querier image. Overrides `tempo.image.repository` |
| querier.image.tag | string | `nil` | Docker image tag for the querier image. Overrides `tempo.image.tag` |
| querier.nodeSelector | object | `{}` | Node selector for querier pods |
| querier.podAnnotations | object | `{}` | Annotations for querier pods |
| querier.podLabels | object | `{}` | Labels for querier pods |
| querier.priorityClassName | string | `nil` | The name of the PriorityClass for querier pods |
| querier.replicas | int | `1` | Number of replicas for the querier |
| querier.resources | object | `{}` | Resource requests and limits for the querier |
| querier.service.annotations | object | `{}` | Annotations for querier service |
| querier.terminationGracePeriodSeconds | int | `30` | Grace period to allow the querier to shutdown before it is killed |
| querier.tolerations | list | `[]` | Tolerations for querier pods |
| querier.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for querier pods. Passed through `tpl` and, thus, to be configured as string |
| queryFrontend.affinity | string | Hard node and soft zone anti-affinity | Affinity for query-frontend pods. Passed through `tpl` and, thus, to be configured as string |
| queryFrontend.appProtocol | object | `{"grpc":null}` | Adds the appProtocol field to the queriyFrontend service. This allows queriyFrontend to work with istio protocol selection. |
| queryFrontend.appProtocol.grpc | string | `nil` | Set the optional grpc service protocol. Ex: "grpc", "http2" or "https" |
| queryFrontend.autoscaling.enabled | bool | `false` | Enable autoscaling for the query-frontend |
| queryFrontend.autoscaling.maxReplicas | int | `3` | Maximum autoscaling replicas for the query-frontend |
| queryFrontend.autoscaling.minReplicas | int | `1` | Minimum autoscaling replicas for the query-frontend |
| queryFrontend.autoscaling.targetCPUUtilizationPercentage | int | `60` | Target CPU utilisation percentage for the query-frontend |
| queryFrontend.autoscaling.targetMemoryUtilizationPercentage | string | `nil` | Target memory utilisation percentage for the query-frontend |
| queryFrontend.config.max_retries | int | `2` | Number of times to retry a request sent to a querier |
| queryFrontend.config.search.concurrent_jobs | int | `1000` | The number of concurrent jobs to execute when searching the backend |
| queryFrontend.config.search.target_bytes_per_job | int | `104857600` | The target number of bytes for each job to handle when performing a backend search |
| queryFrontend.config.tolerate_failed_blocks | int | `0` | Number of block queries that are tolerated to error before considering the entire query as failed. Numbers greater than 0 make possible for a read to return partial results |
| queryFrontend.config.trace_by_id | object | `{"hedge_requests_at":"2s","hedge_requests_up_to":2,"query_shards":50}` | Trace by ID lookup configuration |
| queryFrontend.config.trace_by_id.hedge_requests_at | string | `"2s"` | If set to a non-zero value, a second request will be issued at the provided duration. Recommended to be set to p99 of search requests to reduce long-tail latency. |
| queryFrontend.config.trace_by_id.hedge_requests_up_to | int | `2` | The maximum number of requests to execute when hedging. Requires hedge_requests_at to be set. Must be greater than 0. |
| queryFrontend.config.trace_by_id.query_shards | int | `50` | The number of shards to split a trace by id query into. |
| queryFrontend.extraArgs | list | `[]` | Additional CLI args for the query-frontend |
| queryFrontend.extraEnv | list | `[]` | Environment variables to add to the query-frontend pods |
| queryFrontend.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the query-frontend pods |
| queryFrontend.extraVolumeMounts | list | `[]` | Extra volumes for query-frontend pods |
| queryFrontend.extraVolumes | list | `[]` | Extra volumes for query-frontend deployment |
| queryFrontend.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| queryFrontend.image.registry | string | `nil` | The Docker registry for the query-frontend image. Overrides `tempo.image.registry` |
| queryFrontend.image.repository | string | `nil` | Docker image repository for the query-frontend image. Overrides `tempo.image.repository` |
| queryFrontend.image.tag | string | `nil` | Docker image tag for the query-frontend image. Overrides `tempo.image.tag` |
| queryFrontend.ingress.annotations | object | `{}` | Annotations for the Jaeger ingress |
| queryFrontend.ingress.enabled | bool | `false` | Specifies whether an ingress for the Jaeger should be created |
| queryFrontend.ingress.hosts | list | `[{"host":"query.tempo.example.com","paths":[{"path":"/"}]}]` | Hosts configuration for the Jaeger ingress |
| queryFrontend.ingress.tls | list | `[{"hosts":["query.tempo.example.com"],"secretName":"tempo-query-tls"}]` | TLS configuration for the Jaeger ingress |
| queryFrontend.nodeSelector | object | `{}` | Node selector for query-frontend pods |
| queryFrontend.podAnnotations | object | `{}` | Annotations for query-frontend pods |
| queryFrontend.podLabels | object | `{}` | Labels for queryFrontend pods |
| queryFrontend.priorityClassName | string | `nil` | The name of the PriorityClass for query-frontend pods |
| queryFrontend.query.config | string | `"backend: 127.0.0.1:3100\n"` |  |
| queryFrontend.query.enabled | bool | `false` | Required for grafana version <7.5 for compatibility with jaeger-ui. Doesn't work on ARM arch |
| queryFrontend.query.extraArgs | list | `[]` | Additional CLI args for tempo-query pods |
| queryFrontend.query.extraEnv | list | `[]` | Environment variables to add to the tempo-query pods |
| queryFrontend.query.extraEnvFrom | list | `[]` | Environment variables from secrets or configmaps to add to the tempo-query pods |
| queryFrontend.query.extraVolumeMounts | list | `[]` | Extra volumes for tempo-query pods |
| queryFrontend.query.extraVolumes | list | `[]` | Extra volumes for tempo-query deployment |
| queryFrontend.query.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `tempo.image.pullSecrets` |
| queryFrontend.query.image.registry | string | `nil` | The Docker registry for the query-frontend image. Overrides `tempo.image.registry` |
| queryFrontend.query.image.repository | string | `"grafana/tempo-query"` | Docker image repository for the query-frontend image. Overrides `tempo.image.repository` |
| queryFrontend.query.image.tag | string | `nil` | Docker image tag for the query-frontend image. Overrides `tempo.image.tag` |
| queryFrontend.query.resources | object | `{}` | Resource requests and limits for the query |
| queryFrontend.replicas | int | `1` | Number of replicas for the query-frontend |
| queryFrontend.resources | object | `{}` | Resource requests and limits for the query-frontend |
| queryFrontend.service.annotations | object | `{}` | Annotations for queryFrontend service |
| queryFrontend.service.loadBalancerIP | string | `""` | If type is LoadBalancer you can assign the IP to the LoadBalancer |
| queryFrontend.service.loadBalancerSourceRanges | list | `[]` | If type is LoadBalancer limit incoming traffic from IPs. |
| queryFrontend.service.port | int | `16686` | Port of the query-frontend service |
| queryFrontend.service.type | string | `"ClusterIP"` | Type of service for the queryFrontend |
| queryFrontend.serviceDiscovery.annotations | object | `{}` | Annotations for queryFrontendDiscovery service |
| queryFrontend.terminationGracePeriodSeconds | int | `30` | Grace period to allow the query-frontend to shutdown before it is killed |
| queryFrontend.tolerations | list | `[]` | Tolerations for query-frontend pods |
| queryFrontend.topologySpreadConstraints | string | Defaults to allow skew no more then 1 node per AZ | topologySpread for query-frontend pods. Passed through `tpl` and, thus, to be configured as string |
| rbac.create | bool | `false` | Specifies whether RBAC manifests should be created |
| rbac.pspEnabled | bool | `false` | Specifies whether a PodSecurityPolicy should be created |
| reportingEnabled | bool | `true` | If true, Tempo will report anonymous usage data about the shape of a deployment to Grafana Labs |
| server.grpc_server_max_recv_msg_size | int | `4194304` | Max gRPC message size that can be received |
| server.grpc_server_max_send_msg_size | int | `4194304` | Max gRPC message size that can be sent |
| server.httpListenPort | int | `3100` | HTTP server listen host |
| server.http_server_read_timeout | string | `"30s"` | Read timeout for HTTP server |
| server.http_server_write_timeout | string | `"30s"` | Write timeout for HTTP server |
| server.logFormat | string | `"logfmt"` | Log format. Can be set to logfmt (default) or json. |
| server.logLevel | string | `"info"` | Log level. Can be set to trace, debug, info (default), warn, error, fatal, panic |
| serviceAccount.annotations | object | `{}` | Annotations for the service account |
| serviceAccount.create | bool | `true` | Specifies whether a ServiceAccount should be created |
| serviceAccount.imagePullSecrets | list | `[]` | Image pull secrets for the service account |
| serviceAccount.name | string | `nil` | The name of the ServiceAccount to use. If not set and create is true, a name is generated using the fullname template |
| storage.admin.backend | string | `"filesystem"` | The supported storage backends are gcs, s3 and azure, as specified in https://grafana.com/docs/enterprise-traces/latest/config/reference/#admin_client_config |
| storage.trace.backend | string | `"local"` | The supported storage backends are gcs, s3 and azure, as specified in https://grafana.com/docs/tempo/latest/configuration/#storage |
| storage.trace.block.version | string | `"vParquet"` | The supported block versions are v2 and vParquet, as specified in https://grafana.com/docs/tempo/latest/configuration/parquet/ |
| tempo.image.pullPolicy | string | `"IfNotPresent"` |  |
| tempo.image.pullSecrets | list | `[]` | Optional list of imagePullSecrets. Overrides `global.image.pullSecrets` |
| tempo.image.registry | string | `"docker.io"` | The Docker registry |
| tempo.image.repository | string | `"grafana/tempo"` | Docker image repository |
| tempo.image.tag | string | `nil` | Overrides the image tag whose default is the chart's appVersion |
| tempo.memberlist | object | `{"appProtocol":null}` | Memberlist service configuration. |
| tempo.memberlist.appProtocol | string | `nil` | Adds the appProtocol field to the memberlist service. This allows memberlist to work with istio protocol selection. Set the optional service protocol. Ex: "tcp", "http" or "https". |
| tempo.podAnnotations | object | `{}` | Common annotations for all pods |
| tempo.podLabels | object | `{}` | Global labels for all tempo pods |
| tempo.podSecurityContext | object | `{"fsGroup":1000}` | podSecurityContext holds pod-level security attributes and common container settings |
| tempo.readinessProbe.httpGet.path | string | `"/ready"` |  |
| tempo.readinessProbe.httpGet.port | string | `"http-metrics"` |  |
| tempo.readinessProbe.initialDelaySeconds | int | `30` |  |
| tempo.readinessProbe.timeoutSeconds | int | `1` |  |
| tempo.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsGroup":1000,"runAsNonRoot":true,"runAsUser":1000}` | SecurityContext holds container-level security attributes and common container settings |
| tempo.structuredConfig | object | `{}` | Structured tempo configuration |
| tokengenJob.annotations | object | `{}` |  |
| tokengenJob.containerSecurityContext | object | `{"readOnlyRootFilesystem":true}` | The SecurityContext for tokenjobgen containers |
| tokengenJob.enable | bool | `true` |  |
| tokengenJob.env | list | `[]` |  |
| tokengenJob.extraArgs | object | `{}` |  |
| tokengenJob.extraEnvFrom | list | `[]` |  |
| tokengenJob.initContainers | list | `[]` |  |
| traces.jaeger.grpc.enabled | bool | `false` | Enable Tempo to ingest Jaeger GRPC traces |
| traces.jaeger.grpc.receiverConfig | object | `{}` | Jaeger GRPC receiver config |
| traces.jaeger.thriftBinary.enabled | bool | `false` | Enable Tempo to ingest Jaeger Thrift Binary traces |
| traces.jaeger.thriftBinary.receiverConfig | object | `{}` | Jaeger Thrift Binary receiver config |
| traces.jaeger.thriftCompact.enabled | bool | `false` | Enable Tempo to ingest Jaeger Thrift Compact traces |
| traces.jaeger.thriftCompact.receiverConfig | object | `{}` | Jaeger Thrift Compact receiver config |
| traces.jaeger.thriftHttp.enabled | bool | `false` | Enable Tempo to ingest Jaeger Thrift HTTP traces |
| traces.jaeger.thriftHttp.receiverConfig | object | `{}` | Jaeger Thrift HTTP receiver config |
| traces.kafka | object | `{}` | Enable Tempo to ingest traces from Kafka. Reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kafkareceiver |
| traces.opencensus.enabled | bool | `false` | Enable Tempo to ingest Open Census traces |
| traces.opencensus.receiverConfig | object | `{}` | Open Census receiver config |
| traces.otlp.grpc.enabled | bool | `false` | Enable Tempo to ingest Open Telemetry GRPC traces |
| traces.otlp.grpc.receiverConfig | object | `{}` | GRPC receiver advanced config |
| traces.otlp.http.enabled | bool | `false` | Enable Tempo to ingest Open Telemetry HTTP traces |
| traces.otlp.http.receiverConfig | object | `{}` | HTTP receiver advanced config |
| traces.zipkin.enabled | bool | `false` | Enable Tempo to ingest Zipkin traces |
| traces.zipkin.receiverConfig | object | `{}` | Zipkin receiver config |
| useExternalConfig | bool | `false` | Configuration is loaded from the secret called 'externalConfigSecretName'. If 'useExternalConfig' is true, then the configuration is not generated, just consumed.  Top level keys for `tempo.yaml` and `overrides.yaml` are to be provided by the user. |

## Components

The chart supports the components shown in the following table.
Ingester, distributor, querier, query-frontend, and compactor are always installed.
The other components are optional and must be explicitly enabled.

| Component | Optional |
| --- | --- |
| ingester | no |
| distributor | no |
| querier | no |
| query-frontend | no |
| compactor | no |
| metrics-generator | yes |
| memcached | yes |
| gateway | yes |

## [Configuration](https://grafana.com/docs/tempo/latest/configuration/)

This chart configures Tempo in microservices mode.

**NOTE:**
In its default configuration, the chart uses `local` filesystem as storage.
The reason for this is that the chart can be validated and installed in a CI pipeline.
However, this setup is not fully functional.
The recommendation is to use object storage, such as S3, GCS, MinIO, etc., or one of the other options documented at https://grafana.com/docs/tempo/latest/configuration/#storage.

Alternatively, in order to quickly test Tempo using the filestore, the [single binary chart](https://github.com/grafana/helm-charts/tree/main/charts/tempo) can be used.

### Overriding configuration variables with structuredConfig

tempo.structuredConfig variable can be used to alter individual values in the configuration and it's structured YAML instead of text. It takes precedence over all other variable adjustments inside tempo.yaml config file, ie s3 storage settings.

Example:

```yaml
tempo:
  structuredConfig:
    query_frontend:
      search:
        max_duration: 12h0m0s
```

### Activate metrics generator

Metrics-generator is disabled by default and can be activated by configuring the following values:

```yaml
metricsGenerator:
  enabled: true
  config:
    storage_remote_write:
     - url: http://cortex/api/v1/push
       send_exemplars: true
    #   headers:
    #     x-scope-orgid: operations
# Global overrides
global_overrides:
  metrics_generator_processors:
    - service-graphs
    - span-metrics
```

----

### Directory and File Locations

* Volumes are mounted to `/var/tempo`. The various directories Tempo needs should be configured as subdirectories (e. g. `/var/tempo/wal`, `/var/tempo/traces`). Tempo will create the directories automatically.
* The config file is mounted to `/conf/tempo-query.yaml` and passed as CLI arg.

### Example configuration using S3 for storage

```yaml
config: |
  multitenancy_enabled: false
  compactor:
    compaction:
      block_retention: 48h
    ring:
      kvstore:
        store: memberlist
  distributor:
    receivers:
      jaeger:
        protocols:
          grpc:
            endpoint: 0.0.0.0:14250
          thrift_binary:
            endpoint: 0.0.0.0:6832
          thrift_compact:
            endpoint: 0.0.0.0:6831
          thrift_http:
            endpoint: 0.0.0.0:14268
  querier:
    frontend_worker:
      frontend_address: {{ include "tempo.resourceName" (dict "ctx" . "component" "query-frontend") }}:9095
  ingester:
    lifecycler:
      ring:
        replication_factor: 1
  memberlist:
    abort_if_cluster_join_fails: false
    join_members:
      - {{ include "tempo.fullname" . }}-memberlist
  overrides:
    per_tenant_override_config: /conf/overrides.yaml
  server:
    http_listen_port: 3100
  storage:
    trace:
      backend: s3
      s3:
        access_key: tempo
        bucket: tempo
        endpoint: minio:9000
        insecure: true
        secret_key: supersecret
      pool:
        queue_depth: 2000
      wal:
        path: /var/tempo/wal
      memcached:
        consistent_hash: true
        host: a-tempo-distributed-memcached
        service: memcached-client
        timeout: 500ms
```
