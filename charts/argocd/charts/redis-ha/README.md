# Redis

[Redis](http://redis.io/) is an advanced key-value cache and store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets, sorted sets, bitmaps and hyperloglogs.

## TL;DR

```bash
helm repo add dandydev https://dandydeveloper.github.io/charts
helm install dandydev/redis-ha
```

By default this chart install 3 pods total:

* one pod containing a redis master and sentinel container (optional prometheus metrics exporter sidecar available)
* two pods each containing a redis slave and sentinel containers (optional prometheus metrics exporter sidecars available)

## Introduction

This chart bootstraps a [Redis](https://redis.io) highly available master/slave statefulset in a [Kubernetes](http://kubernetes.io) cluster using the Helm package manager.

## Prerequisites

* Kubernetes 1.8+ with Beta APIs enabled
* PV provisioner support in the underlying infrastructure
* Helm v3+

## Upgrading the Chart

Please note that there have been a number of changes simplifying the redis management strategy (for better failover and elections) in the 3.x version of this chart. These changes allow the use of official [redis](https://hub.docker.com/_/redis/) images that do not require special RBAC or ServiceAccount roles. As a result when upgrading from version >=2.0.1 to >=3.0.0 of this chart, `Role`, `RoleBinding`, and `ServiceAccount` resources should be deleted manually.

### Upgrading the chart from 3.x to 4.x

Starting from version `4.x` HAProxy sidecar prometheus-exporter removed and replaced by the embedded [HAProxy metrics endpoint](https://github.com/haproxy/haproxy/tree/master/contrib/prometheus-exporter), as a result when upgrading from version 3.x to 4.x section `haproxy.exporter` should be removed and the `haproxy.metrics` need to be configured for fit your needs.

## Installing the Chart

To install the chart

```bash
helm repo add dandydev https://dandydeveloper.github.io/charts
helm install dandydev/redis-ha
```

The command deploys Redis on the Kubernetes cluster in the default configuration. By default this chart install one master pod containing redis master container and sentinel container along with 2 redis slave pods each containing their own sentinel sidecars. The [configuration](#configuration) section lists the parameters that can be configured during installation.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the deployment:

```bash
helm delete <chart-name>
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the Redis chart and their default values.

### General parameters

| Parameter | Description | Type | Default |
|-----|------|---------|-------------|
| `additionalAffinities` | Additional affinities to add to the Redis server pods. # Ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity | object | `{}` |
| `affinity` | Override all other affinity settings for the Redis server pods with a string. | string | `""` |
| `auth` | Configures redis with AUTH (requirepass & masterauth conf params) | bool | `false` |
| `authKey` | Defines the key holding the redis password in existing secret. | string | `"auth"` |
| `authSecretAnnotations` | Annotations for auth secret | object | `{}` |
| `configmap.labels` | Custom labels for the redis configmap | object | `{}` |
| `configmapTest.image` | Image for redis-ha-configmap-test hook | object | `{"repository":"koalaman/shellcheck","tag":"v0.10.0"}` |
| `configmapTest.image.repository` | Repository of the configmap shellcheck test image. | string | `"koalaman/shellcheck"` |
| `configmapTest.image.tag` | Tag of the configmap shellcheck test image. | string | `"v0.10.0"` |
| `configmapTest.resources` | Resources for the ConfigMap test pod | object | `{}` |
| `containerSecurityContext` | Security context to be added to the Redis containers. | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}}` |
| `emptyDir` | Configuration of `emptyDir`, used only if persistentVolume is disabled and no hostPath specified | object | `{}` |
| `existingSecret` | An existing secret containing a key defined by `authKey` that configures `requirepass` and `masterauth` in the conf parameters (Requires `auth: enabled`, cannot be used in conjunction with `.Values.redisPassword`) | string | `nil` |
| `extraContainers` | Extra containers to include in StatefulSet | list | `[]` |
| `extraInitContainers` | Extra init containers to include in StatefulSet | list | `[]` |
| `extraLabels` | Labels added here are applied to all created resources | object | `{}` |
| `extraVolumes` | Extra volumes to include in StatefulSet | list | `[]` |
| `fullnameOverride` | Full name of the Redis HA Resources | string | `""` |
| `global.compatibility` | Openshift compatibility options | object | `{"openshift":{"adaptSecurityContext":"auto"}}` |
| `global.priorityClassName` | Default priority class for all components | string | `""` |
| `hardAntiAffinity` | Whether the Redis server pods should be forced to run on separate nodes. # This is accomplished by setting their AntiAffinity with requiredDuringSchedulingIgnoredDuringExecution as opposed to preferred. # Ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#inter-pod-affinity-and-anti-affinity-beta-feature | bool | `true` |
| `hostPath.chown` | if chown is true, an init-container with root permissions is launched to change the owner of the hostPath folder to the user defined in the security context | bool | `true` |
| `hostPath.path` | Use this path on the host for data storage. path is evaluated as template so placeholders are replaced | string | `""` |
| `image.pullPolicy` | Redis image pull policy | string | `"IfNotPresent"` |
| `image.repository` | Redis image repository | string | `"public.ecr.aws/docker/library/redis"` |
| `image.tag` | Redis image tag | string | `"8.2.1-alpine"` |
| `imagePullSecrets` | Reference to one or more secrets to be used when pulling redis images | list | `[]` |
| `init.resources` | Extra init resources | object | `{}` |
| `labels` | Custom labels for the redis pod | object | `{}` |
| `nameOverride` | Name override for Redis HA resources | string | `""` |
| `networkPolicy.annotations` | Annotations for NetworkPolicy | object | `{}` |
| `networkPolicy.egressRules` | user can define egress rules too, uses the same structure as ingressRules | list | `[{"ports":[{"port":53,"protocol":"UDP"},{"port":53,"protocol":"TCP"}],"selectors":[{"namespaceSelector":{}},{"ipBlock":{"cidr":"169.254.0.0/16"}}]}]` |
| `networkPolicy.egressRules[0].selectors[0]` | Allow all destinations for DNS traffic | object | `{"namespaceSelector":{}}` |
| `networkPolicy.enabled` | whether NetworkPolicy for Redis StatefulSets should be created. when enabled, inter-Redis connectivity is created | bool | `false` |
| `networkPolicy.ingressRules` | User defined ingress rules that Redis should permit into. Uses the format defined in https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors | list | `[]` |
| `networkPolicy.labels` | Labels for NetworkPolicy | object | `{}` |
| `nodeSelector` | Node labels for pod assignment | object | `{}` |
| `persistentVolume.accessModes` | Persistent volume access modes | list | `["ReadWriteOnce"]` |
| `persistentVolume.annotations` | Annotations for the volume | object | `{}` |
| `persistentVolume.enabled` | Enable persistent volume | bool | `true` |
| `persistentVolume.labels` | Labels for the volume | object | `{}` |
| `persistentVolume.size` | Persistent volume size | string | `"10Gi"` |
| `persistentVolume.storageClass` | redis-ha data Persistent Volume Storage Class | string | `nil` |
| `podDisruptionBudget` | Pod Disruption Budget rules | object | `{}` |
| `podManagementPolicy` | The statefulset pod management policy | string | `"OrderedReady"` |
| `priorityClassName` | Kubernetes priorityClass name for the redis-ha-server pod | string | `""` |
| `rbac.create` | Create and use RBAC resources | bool | `true` |
| `redis.annotations` | Annotations for the redis statefulset | object | `{}` |
| `redis.authClients` | It is possible to disable client side certificates authentication when "authClients" is set to "no" | string | `""` |
| `redis.config` | Any valid redis config options in this section will be applied to each server, For multi-value configs use list instead of string (for example loadmodule) (see below) | object | see values.yaml |
| `redis.config.maxmemory` | Max memory to use for each redis instance. Default is unlimited. | string | `"0"` |
| `redis.config.maxmemory-policy` | Max memory policy to use for each redis instance. Default is volatile-lru. | string | `"volatile-lru"` |
| `redis.config.min-replicas-max-lag` | Value in seconds | int | `5` |
| `redis.config.repl-diskless-sync` | When enabled, directly sends the RDB over the wire to slaves, without using the disk as intermediate storage. Default is false. | string | `"yes"` |
| `redis.config.save` | Please note that local (on-disk) RDBs will still be created when re-syncing with a new slave. The only way to prevent this is to enable diskless replication. | string | `"900 1"` |
| `redis.customArgs` | Allows overriding the redis container arguments | list | `[]` |
| `redis.customCommand` | Allows overriding the redis container command | list | `[]` |
| `redis.customConfig` | Allows for custom redis.conf files to be applied. If this is used then `redis.config` is ignored | string | `nil` |
| `redis.disableCommands` | Array with commands to disable | list | `["FLUSHDB","FLUSHALL"]` |
| `redis.envFrom` | Load environment variables from ConfigMap/Secret | list | `[]` |
| `redis.extraVolumeMounts` | additional volumeMounts for Redis container | list | `[]` |
| `redis.lifecycle` | Container Lifecycle Hooks for redis container Ref: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/ | object | see values.yaml |
| `redis.livenessProbe` | Liveness probe parameters for redis container | object | `{"enabled":true,"failureThreshold":5,"initialDelaySeconds":30,"periodSeconds":15,"successThreshold":1,"timeoutSeconds":15}` |
| `redis.livenessProbe.enabled` | Enable the Liveness Probe | bool | `true` |
| `redis.livenessProbe.failureThreshold` | Failure threshold for liveness probe | int | `5` |
| `redis.livenessProbe.initialDelaySeconds` | Initial delay in seconds for liveness probe | int | `30` |
| `redis.livenessProbe.periodSeconds` | Period in seconds after which liveness probe will be repeated | int | `15` |
| `redis.livenessProbe.successThreshold` | Success threshold for liveness probe | int | `1` |
| `redis.livenessProbe.timeoutSeconds` | Timeout seconds for liveness probe | int | `15` |
| `redis.masterGroupName` | Redis convention for naming the cluster group: must match `^[\\w-\\.]+$` and can be templated | string | `"mymaster"` |
| `redis.podAnnotations` | Annotations to be added to the redis statefulset pods | object | `{}` |
| `redis.port` | Port to access the redis service | int | `6379` |
| `redis.readinessProbe` | Readiness probe parameters for redis container | object | `{"enabled":true,"failureThreshold":5,"initialDelaySeconds":30,"periodSeconds":15,"successThreshold":1,"timeoutSeconds":15}` |
| `redis.readinessProbe.enabled` | Enable the Readiness Probe | bool | `true` |
| `redis.readinessProbe.failureThreshold` | Failure threshold for readiness probe | int | `5` |
| `redis.readinessProbe.initialDelaySeconds` | Initial delay in seconds for readiness probe | int | `30` |
| `redis.readinessProbe.periodSeconds` | Period in seconds after which readiness probe will be repeated | int | `15` |
| `redis.readinessProbe.successThreshold` | Success threshold for readiness probe | int | `1` |
| `redis.readinessProbe.timeoutSeconds` | Timeout seconds for readiness probe | int | `15` |
| `redis.resources` | CPU/Memory for master/slave nodes resource requests/limits | object | `{}` |
| `redis.startupProbe` | Startup probe parameters for redis container | object | `{"enabled":true,"failureThreshold":5,"initialDelaySeconds":30,"periodSeconds":15,"successThreshold":1,"timeoutSeconds":15}` |
| `redis.startupProbe.enabled` | Enable Startup Probe | bool | `true` |
| `redis.startupProbe.failureThreshold` | Failure threshold for startup probe | int | `5` |
| `redis.startupProbe.initialDelaySeconds` | Initial delay in seconds for startup probe | int | `30` |
| `redis.startupProbe.periodSeconds` | Period in seconds after which startup probe will be repeated | int | `15` |
| `redis.startupProbe.successThreshold` | Success threshold for startup probe | int | `1` |
| `redis.startupProbe.timeoutSeconds` | Timeout seconds for startup probe | int | `15` |
| `redis.terminationGracePeriodSeconds` | Increase terminationGracePeriodSeconds to allow writing large RDB snapshots. (k8s default is 30s) ref: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-forced | int | `60` |
| `redis.tlsPort` | TLS Port to access the redis service | int | `nil` |
| `redis.tlsReplication` | Configures redis with tls-replication parameter, if true sets "tls-replication yes" in redis.conf | bool | `nil` |
| `redis.updateStrategy` | Update strategy for Redis StatefulSet # ref: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies | object | `{"type":"RollingUpdate"}` |
| `redisPassword` | A password that configures a `requirepass` and `masterauth` in the conf parameters (Requires `auth: enabled`) | string | `nil` |
| `replicas` | Number of redis master/slave | int | `3` |
| `restore.existingSecret` | Set existingSecret to true to use secret specified in existingSecret above | bool | `false` |
| `restore.redis.source` |  | string | `""` |
| `restore.s3.access_key` | Restore init container - AWS AWS_ACCESS_KEY_ID to access restore.s3.source | string | `""` |
| `restore.s3.region` | Restore init container - AWS AWS_REGION to access restore.s3.source | string | `""` |
| `restore.s3.secret_key` | Restore init container - AWS AWS_SECRET_ACCESS_KEY to access restore.s3.source | string | `""` |
| `restore.s3.source` | Restore init container - AWS S3 location of dump - i.e. s3://bucket/dump.rdb or false | string | `""` |
| `restore.ssh.key` | Restore init container - SSH private key to scp restore.ssh.source to init container. Key should be in one line separated with \n. i.e. `-----BEGIN RSA PRIVATE KEY-----\n...\n...\n-----END RSA PRIVATE KEY-----` | string | `""` |
| `restore.ssh.source` | Restore init container - SSH scp location of dump - i.e. user@server:/path/dump.rdb or false | string | `""` |
| `restore.timeout` | Timeout for the restore | int | `600` |
| `ro_replicas` | Comma separated list of slaves which never get promoted to be master. Count starts with 0. Allowed values 1-9. i.e. 3,4 - 3th and 4th redis slave never make it to be master, where master is index 0. | string | `""` |
| `schedulerName` | Use an alternate scheduler, e.g. "stork". ref: https://kubernetes.io/docs/tasks/administer-cluster/configure-multiple-schedulers/ | string | `""` |
| `securityContext` | Security context to be added to the Redis StatefulSet. | object | `{"fsGroup":1000,"runAsNonRoot":true,"runAsUser":1000}` |
| `serviceAccount.annotations` | Annotations to be added to the service account for the redis statefulset | object | `{}` |
| `serviceAccount.automountToken` | opt in/out of automounting API credentials into container. Ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/ | bool | `false` |
| `serviceAccount.create` | Specifies whether a ServiceAccount should be created | bool | `true` |
| `serviceAccount.name` | The name of the ServiceAccount to use. If not set and create is true, a name is generated using the redis-ha.fullname template | string | `""` |
| `serviceLabels` | Custom labels for redis service | object | `{}` |
| `splitBrainDetection.interval` | Interval between redis sentinel and server split brain checks (in seconds) | int | `60` |
| `splitBrainDetection.resources` | splitBrainDetection resources | object | `{}` |
| `splitBrainDetection.retryInterval` |  | int | `10` |
| `sysctlImage.command` | sysctlImage command to execute | list | `[]` |
| `sysctlImage.enabled` | Enable an init container to modify Kernel settings | bool | `false` |
| `sysctlImage.mountHostSys` | Mount the host `/sys` folder to `/host-sys` | bool | `false` |
| `sysctlImage.pullPolicy` | sysctlImage Init container pull policy | string | `"Always"` |
| `sysctlImage.registry` | sysctlImage Init container registry | string | `"public.ecr.aws/docker/library"` |
| `sysctlImage.repository` | sysctlImage Init container name | string | `"busybox"` |
| `sysctlImage.resources` | sysctlImage resources | object | `{}` |
| `sysctlImage.tag` | sysctlImage Init container tag | string | `"1.34.1"` |
| `tls.caCertFile` | Name of CA certificate file | string | `"ca.crt"` |
| `tls.certFile` | Name of certificate file | string | `"redis.crt"` |
| `tls.dhParamsFile` | Name of Diffie-Hellman (DH) key exchange parameters file (Example: redis.dh) | string | `nil` |
| `tls.keyFile` | Name of key file | string | `"redis.key"` |
| `tolerations` |  | list | `[]` |
| `topologySpreadConstraints.enabled` | Enable topology spread constraints | bool | `false` |
| `topologySpreadConstraints.maxSkew` | Max skew of pods tolerated | string | `""` |
| `topologySpreadConstraints.topologyKey` | Topology key for spread constraints | string | `""` |
| `topologySpreadConstraints.whenUnsatisfiable` | Enforcement policy, hard or soft | string | `""` |

### Redis Sentinel parameters

| Parameter | Description | Type | Default |
|-----|------|---------|-------------|
| `sentinel.auth` | Enables or disables sentinel AUTH (Requires `sentinel.password` to be set) | bool | `false` |
| `sentinel.authClients` | It is possible to disable client side certificates authentication when "authClients" is set to "no" | string | `""` |
| `sentinel.authKey` | The key holding the sentinel password in an existing secret. | string | `"sentinel-password"` |
| `sentinel.config` | Valid sentinel config options in this section will be applied as config options to each sentinel (see below) | object | see values.yaml |
| `sentinel.customArgs` |  | list | `[]` |
| `sentinel.customCommand` |  | list | `[]` |
| `sentinel.customConfig` | Allows for custom sentinel.conf files to be applied. If this is used then `sentinel.config` is ignored | string | `""` |
| `sentinel.existingSecret` | An existing secret containing a key defined by `sentinel.authKey` that configures `requirepass` in the conf parameters (Requires `sentinel.auth: enabled`, cannot be used in conjunction with `.Values.sentinel.password`) | string | `""` |
| `sentinel.extraVolumeMounts` | additional volumeMounts for Sentinel container | list | `[]` |
| `sentinel.lifecycle` | Container Lifecycle Hooks for sentinel container. Ref: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/ | object | `{}` |
| `sentinel.livenessProbe.enabled` |  | bool | `true` |
| `sentinel.livenessProbe.failureThreshold` | Failure threshold for liveness probe | int | `5` |
| `sentinel.livenessProbe.initialDelaySeconds` | Initial delay in seconds for liveness probe | int | `30` |
| `sentinel.livenessProbe.periodSeconds` | Period in seconds after which liveness probe will be repeated | int | `15` |
| `sentinel.livenessProbe.successThreshold` | Success threshold for liveness probe | int | `1` |
| `sentinel.livenessProbe.timeoutSeconds` | Timeout seconds for liveness probe | int | `15` |
| `sentinel.password` | A password that configures a `requirepass` in the conf parameters (Requires `sentinel.auth: enabled`) | string | `nil` |
| `sentinel.port` | Port to access the sentinel service | int | `26379` |
| `sentinel.quorum` | Minimum number of nodes expected to be live. | int | `2` |
| `sentinel.readinessProbe.enabled` |  | bool | `true` |
| `sentinel.readinessProbe.failureThreshold` | Failure threshold for readiness probe | int | `5` |
| `sentinel.readinessProbe.initialDelaySeconds` | Initial delay in seconds for readiness probe | int | `30` |
| `sentinel.readinessProbe.periodSeconds` | Period in seconds after which readiness probe will be repeated | int | `15` |
| `sentinel.readinessProbe.successThreshold` | Success threshold for readiness probe | int | `3` |
| `sentinel.readinessProbe.timeoutSeconds` | Timeout seconds for readiness probe | int | `15` |
| `sentinel.resources` | CPU/Memory for sentinel node resource requests/limits | object | `{}` |
| `sentinel.startupProbe` | Startup probe parameters for redis container | object | `{"enabled":true,"failureThreshold":3,"initialDelaySeconds":5,"periodSeconds":10,"successThreshold":1,"timeoutSeconds":15}` |
| `sentinel.startupProbe.enabled` | Enable Startup Probe | bool | `true` |
| `sentinel.startupProbe.failureThreshold` | Failure threshold for startup probe | int | `3` |
| `sentinel.startupProbe.initialDelaySeconds` | Initial delay in seconds for startup probe | int | `5` |
| `sentinel.startupProbe.periodSeconds` | Period in seconds after which startup probe will be repeated | int | `10` |
| `sentinel.startupProbe.successThreshold` | Success threshold for startup probe | int | `1` |
| `sentinel.startupProbe.timeoutSeconds` | Timeout seconds for startup probe | int | `15` |
| `sentinel.tlsPort` | TLS Port to access the sentinel service | int | `nil` |
| `sentinel.tlsReplication` | Configures sentinel with tls-replication parameter, if true sets "tls-replication yes" in sentinel.conf | bool | `nil` |

### HAProxy parameters

| Parameter | Description | Type | Default |
|-----|------|---------|-------------|
| `haproxy.IPv6.enabled` | Enable HAProxy parameters to bind and consume IPv6 addresses. Enabled by default. | bool | `true` |
| `haproxy.additionalAffinities` | Additional affinities to add to the haproxy pods. | object | `{}` |
| `haproxy.affinity` | Override all other affinity settings for the haproxy pods with a string. | string | `""` |
| `haproxy.annotations` | HAProxy template annotations | object | `{}` |
| `haproxy.checkFall` | haproxy.cfg `check fall` setting | int | `1` |
| `haproxy.checkInterval` | haproxy.cfg `check inter` setting | string | `"1s"` |
| `haproxy.containerPort` | Modify HAProxy deployment container port | int | `6379` |
| `haproxy.containerSecurityContext` | Security context to be added to the HAProxy containers. | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` |
| `haproxy.customConfig` | Allows for custom config-haproxy.cfg file to be applied. If this is used then default config will be overwriten | string | `nil` |
| `haproxy.deploymentAnnotations` | HAProxy deployment annotations | object | `{}` |
| `haproxy.deploymentStrategy` | Deployment strategy for the haproxy deployment | object | `{"type":"RollingUpdate"}` |
| `haproxy.emptyDir` | Configuration of `emptyDir` | object | `{}` |
| `haproxy.enabled` | Enabled HAProxy LoadBalancing/Proxy | bool | `false` |
| `haproxy.extraConfig` | Allows to place any additional configuration section to add to the default config-haproxy.cfg | string | `nil` |
| `haproxy.hardAntiAffinity` | Whether the haproxy pods should be forced to run on separate nodes. | bool | `true` |
| `haproxy.image.pullPolicy` | HAProxy Image PullPolicy | string | `"IfNotPresent"` |
| `haproxy.image.repository` | HAProxy Image Repository | string | `"public.ecr.aws/docker/library/haproxy"` |
| `haproxy.image.tag` | HAProxy Image Tag | string | `"3.0.8-alpine"` |
| `haproxy.imagePullSecrets` | Reference to one or more secrets to be used when pulling images ref: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/ | list | `[]` |
| `haproxy.init.resources` | Extra init resources | object | `{}` |
| `haproxy.labels` | Custom labels for the haproxy pod | object | `{}` |
| `haproxy.lifecycle` | Container lifecycle hooks. Ref: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/ | object | `{}` |
| `haproxy.metrics.enabled` | HAProxy enable prometheus metric scraping | bool | `false` |
| `haproxy.metrics.port` | HAProxy prometheus metrics scraping port | int | `9101` |
| `haproxy.metrics.portName` | HAProxy metrics scraping port name | string | `"http-exporter-port"` |
| `haproxy.metrics.scrapePath` | HAProxy prometheus metrics scraping path | string | `"/metrics"` |
| `haproxy.metrics.serviceMonitor.disableAPICheck` | Disable API Check on ServiceMonitor | bool | `false` |
| `haproxy.metrics.serviceMonitor.enabled` | When set true then use a ServiceMonitor to configure scraping | bool | `false` |
| `haproxy.metrics.serviceMonitor.endpointAdditionalProperties` | Set additional properties for the ServiceMonitor endpoints such as relabeling, scrapeTimeout, tlsConfig, and more. | object | `{}` |
| `haproxy.metrics.serviceMonitor.interval` | Set how frequently Prometheus should scrape (default is 30s) | string | `""` |
| `haproxy.metrics.serviceMonitor.labels` | Set labels for the ServiceMonitor, use this to define your scrape label for Prometheus Operator | object | `{}` |
| `haproxy.metrics.serviceMonitor.namespace` | Set the namespace the ServiceMonitor should be deployed | string | `.Release.Namespace` |
| `haproxy.metrics.serviceMonitor.telemetryPath` | Set path to redis-exporter telemtery-path (default is /metrics) | string | `""` |
| `haproxy.metrics.serviceMonitor.timeout` | Set timeout for scrape (default is 10s) | string | `""` |
| `haproxy.networkPolicy.annotations` | Annotations for Haproxy NetworkPolicy | object | `{}` |
| `haproxy.networkPolicy.egressRules` | user can define egress rules too, uses the same structure as ingressRules | list | `[]` |
| `haproxy.networkPolicy.enabled` | whether NetworkPolicy for Haproxy should be created | bool | `false` |
| `haproxy.networkPolicy.ingressRules` | user defined ingress rules that Haproxy should permit into. uses the format defined in https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors | list | `[]` |
| `haproxy.networkPolicy.labels` | Labels for Haproxy NetworkPolicy | object | `{}` |
| `haproxy.podAnnotations` | Annotations to be added to the HAProxy deployment pods | object | `{}` |
| `haproxy.podDisruptionBudget` | Pod Disruption Budget ref: https://kubernetes.io/docs/tasks/run-application/configure-pdb/ | object | `{}` |
| `haproxy.priorityClassName` | Kubernetes priorityClass name for the haproxy pod | string | `""` |
| `haproxy.readOnly` | Enable read-only redis-slaves | object | `{"enabled":false,"port":6380}` |
| `haproxy.readOnly.enabled` | Enable if you want a dedicated port in haproxy for redis-slaves | bool | `false` |
| `haproxy.readOnly.port` | Port for the read-only redis-slaves | int | `6380` |
| `haproxy.replicas` | Number of HAProxy instances | int | `3` |
| `haproxy.resources` | HAProxy resources | object | `{}` |
| `haproxy.securityContext` | Security context to be added to the HAProxy deployment. | object | `{"fsGroup":99,"runAsNonRoot":true,"runAsUser":99}` |
| `haproxy.service.annotations` | HAProxy service annotations | string | `nil` |
| `haproxy.service.externalIPs` | HAProxy external IPs | object | `{}` |
| `haproxy.service.externalTrafficPolicy` | HAProxy service externalTrafficPolicy value (haproxy.service.type must be LoadBalancer) | string | `nil` |
| `haproxy.service.labels` | HAProxy service labels | object | `{}` |
| `haproxy.service.loadBalancerIP` | HAProxy service loadbalancer IP | string | `nil` |
| `haproxy.service.loadBalancerSourceRanges` | List of CIDR's allowed to connect to LoadBalancer | list | `[]` |
| `haproxy.service.nodePort` | HAProxy service nodePort value (haproxy.service.type must be NodePort) | int | `nil` |
| `haproxy.service.type` | HAProxy service type "ClusterIP", "LoadBalancer" or "NodePort" | string | `"ClusterIP"` |
| `haproxy.serviceAccount.automountToken` |  | bool | `true` |
| `haproxy.serviceAccount.create` | Specifies whether a ServiceAccount should be created | bool | `true` |
| `haproxy.serviceAccountName` | HAProxy serviceAccountName | string | `"redis-sa"` |
| `haproxy.servicePort` | Modify HAProxy service port | int | `6379` |
| `haproxy.stickyBalancing` | HAProxy sticky load balancing to Redis nodes. Helps with connections shutdown. | bool | `false` |
| `haproxy.tests.resources` | Pod resources for the tests against HAProxy. | object | `{}` |
| `haproxy.timeout.check` | haproxy.cfg `timeout check` setting | string | `"2s"` |
| `haproxy.timeout.client` | haproxy.cfg `timeout client` setting | string | `"330s"` |
| `haproxy.timeout.connect` | haproxy.cfg `timeout connect` setting | string | `"4s"` |
| `haproxy.timeout.server` | haproxy.cfg `timeout server` setting | string | `"330s"` |
| `haproxy.tls` | Enable TLS termination on HAproxy, This will create a volume mount | object | `{"certMountPath":"/tmp/","enabled":false,"keyName":null,"secretName":""}` |
| `haproxy.tls.certMountPath` | Path to mount the secret that contains the certificates. haproxy | string | `"/tmp/"` |
| `haproxy.tls.enabled` | If "true" this will enable TLS termination on haproxy | bool | `false` |
| `haproxy.tls.keyName` | Key file name | string | `nil` |
| `haproxy.tls.secretName` | Secret containing the .pem file | string | `""` |

### Prometheus exporter parameters

| Parameter | Description | Type | Default |
|-----|------|---------|-------------|
| `exporter.address` | Address/Host for Redis instance. Exists to circumvent issues with IPv6 dns resolution that occurs on certain environments | string | `"localhost"` |
| `exporter.enabled` | If `true`, the prometheus exporter sidecar is enabled | bool | `false` |
| `exporter.extraArgs` | Additional args for redis exporter | object | `{}` |
| `exporter.image` | Exporter image | string | `"quay.io/oliver006/redis_exporter"` |
| `exporter.livenessProbe.httpGet.path` | Exporter liveness probe httpGet path | string | `"/metrics"` |
| `exporter.livenessProbe.httpGet.port` | Exporter liveness probe httpGet port | int | `9121` |
| `exporter.livenessProbe.initialDelaySeconds` | Initial delay in seconds for liveness probe of exporter | int | `15` |
| `exporter.livenessProbe.periodSeconds` | Period in seconds after which liveness probe will be repeated | int | `15` |
| `exporter.livenessProbe.timeoutSeconds` | Timeout seconds for liveness probe of exporter | int | `3` |
| `exporter.port` | Exporter port | int | `9121` |
| `exporter.portName` | Exporter port name | string | `"exporter-port"` |
| `exporter.pullPolicy` | Exporter image pullPolicy | string | `"IfNotPresent"` |
| `exporter.readinessProbe.httpGet.path` | Exporter readiness probe httpGet path | string | `"/metrics"` |
| `exporter.readinessProbe.httpGet.port` | Exporter readiness probe httpGet port | int | `9121` |
| `exporter.readinessProbe.initialDelaySeconds` | Initial delay in seconds for readiness probe of exporter | int | `15` |
| `exporter.readinessProbe.periodSeconds` | Period in seconds after which readiness probe will be repeated | int | `15` |
| `exporter.readinessProbe.successThreshold` | Success threshold for readiness probe of exporter | int | `2` |
| `exporter.readinessProbe.timeoutSeconds` | Timeout seconds for readiness probe of exporter | int | `3` |
| `exporter.resources` | cpu/memory resource limits/requests | object | `{}` |
| `exporter.scrapePath` | Exporter scrape path | string | `"/metrics"` |
| `exporter.script` | A custom custom Lua script that will be mounted to exporter for collection of custom metrics. Creates a ConfigMap and sets env var `REDIS_EXPORTER_SCRIPT`. | string | `""` |
| `exporter.serviceMonitor.disableAPICheck` | Disable API Check on ServiceMonitor | bool | `false` |
| `exporter.serviceMonitor.enabled` | When set true then use a ServiceMonitor to configure scraping | bool | `false` |
| `exporter.serviceMonitor.endpointAdditionalProperties` | Set additional properties for the ServiceMonitor endpoints such as relabeling, scrapeTimeout, tlsConfig, and more. | object | `{}` |
| `exporter.serviceMonitor.interval` | Set how frequently Prometheus should scrape (default is 30s) | string | `""` |
| `exporter.serviceMonitor.labels` | Set labels for the ServiceMonitor, use this to define your scrape label for Prometheus Operator | object | `{}` |
| `exporter.serviceMonitor.metricRelabelings` |  | list | `[]` |
| `exporter.serviceMonitor.namespace` | Set the namespace the ServiceMonitor should be deployed | string | `.Release.Namespace` |
| `exporter.serviceMonitor.relabelings` |  | list | `[]` |
| `exporter.serviceMonitor.telemetryPath` | Set path to redis-exporter telemtery-path (default is /metrics) | string | `""` |
| `exporter.serviceMonitor.timeout` | Set timeout for scrape (default is 10s) | string | `""` |
| `exporter.tag` | Exporter image tag | string | `"v1.67.0"` |
| `prometheusRule.additionalLabels` | Additional labels to be set in metadata. | object | `{}` |
| `prometheusRule.enabled` | If true, creates a Prometheus Operator PrometheusRule. | bool | `false` |
| `prometheusRule.interval` | How often rules in the group are evaluated (falls back to `global.evaluation_interval` if not set). | string | `"10s"` |
| `prometheusRule.namespace` | Namespace which Prometheus is running in. | string | `nil` |
| `prometheusRule.rules` | Rules spec template (see https://github.com/prometheus-operator/prometheus-operator/blob/master/Documentation/api.md#rule). | list | `[]` |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```bash
$ helm repo add dandydev https://dandydeveloper.github.io/charts
$ helm install \
  --set image=redis \
  --set tag=5.0.5-alpine \
    dandydev/redis-ha
```

The above command sets the Redis server within `default` namespace.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
helm install -f values.yaml dandydev/redis-ha
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## Custom Redis and Sentinel config options

This chart allows for most redis or sentinel config options to be passed as a key value pair through the `values.yaml` under `redis.config` and `sentinel.config`. See links below for all available options.

[Example redis.conf](http://download.redis.io/redis-stable/redis.conf)
[Example sentinel.conf](http://download.redis.io/redis-stable/sentinel.conf)

For example `repl-timeout 60` would be added to the `redis.config` section of the `values.yaml` as:

```yml
    repl-timeout: "60"
```

Note:

1. Some config options should be renamed by redis version，e.g.:

   ```yml
   # In redis 5.x，see https://raw.githubusercontent.com/antirez/redis/5.0/redis.conf
   min-replicas-to-write: 1
   min-replicas-max-lag: 5

   # In redis 4.x and redis 3.x，see https://raw.githubusercontent.com/antirez/redis/4.0/redis.conf and https://raw.githubusercontent.com/antirez/redis/3.0/redis.conf
   min-slaves-to-write 1
   min-slaves-max-lag 5
   ```

Sentinel options supported must be in the the `sentinel <option> <master-group-name> <value>` format. For example, `sentinel down-after-milliseconds 30000` would be added to the `sentinel.config` section of the `values.yaml` as:

```yml
    down-after-milliseconds: 30000
```

If more control is needed from either the redis or sentinel config then an entire config can be defined under `redis.customConfig` or `sentinel.customConfig`. Please note that these values will override any configuration options under their respective section. For example, if you define `sentinel.customConfig` then the `sentinel.config` is ignored.

## Host Kernel Settings

Redis may require some changes in the kernel of the host machine to work as expected, in particular increasing the `somaxconn` value and disabling transparent huge pages.
To do so, you can set up a privileged initContainer with the `sysctlImage` config values, for example:

```yml
sysctlImage:
  enabled: true
  mountHostSys: true
  command:
    - /bin/sh
    - -xc
    - |-
      sysctl -w net.core.somaxconn=10000
      echo never > /host-sys/kernel/mm/transparent_hugepage/enabled
```

## HAProxy startup

When HAProxy is enabled, it will attempt to connect to each announce-service of each redis replica instance in its init container before starting.
It will fail if announce-service IP is not available fast enough (10 seconds max by announce-service).
A such case could happen if the orchestator is pending the nomination of redis pods.
Risk is limited because announce-service is using `publishNotReadyAddresses: true`, although, in such case, HAProxy pod will be rescheduled afterward by the orchestrator.

PodDisruptionBudgets are not configured by default, you may need to set the `haproxy.podDisruptionBudget` parameter in values.yaml to enable it.

## Network policies

If `networkPolicy.enabled` is set to `true`, then a `NetworkPolicy` resource is created with default rules to allow inter-Redis and Sentinel connectivity.
This is a requirement for Redis Pods to come up successfully.

You will need to define `ingressRules` to permit your application connectivity to Redis.
The `selectors` block should be in the format of a [label selector](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors).
Templating is also supported in the selectors.
See such a configuration below.

```yaml
networkPolicy: true
  ingressRules:
    - selectors:
      - namespaceSelector:
          matchLabels:
            name: my-redis-client-namespace
        podSelector:
          matchLabels:
            # template example
            app: |-
              {{- .App.Name }}
      ## ports block is optional (defaults to below), define the block to override the defaults
      # ports:
      #   - port: 6379
      #     protocol: TCP
      #   - port: 26379
      #     protocol: TCP
```

Should your Pod require additional egress rules, define them in a `egressRules` key which is structured identically to an `ingressRules` key.

## Sentinel and redis server split brain detection

Under not entirely known yet circumstances redis sentinel and its corresponding redis server reach a condition that this chart authors call "split brain" (for short). The observed behaviour is the following: the sentinel switches to the new re-elected master, but does not switch its redis server. Majority of original discussion on the problem has happened at the #121.

The proposed solution is currently implemented as a sidecar container that runs a bash script with the following logic:

1. At intervals defined by splitBrainDetection.interval, the sidecar checks which node is recognized as master by Sentinel.
2. If the current pod is the master according to Sentinel, it verifies that the local Redis server is also running as master.
3. If the current pod is not the master, it ensures the local Redis server is replicating from the correct master node.
4. If any of these checks fail, the sidecar will retry the check at intervals defined by splitBrainDetection.retryInterval.
5. If the checks continue to fail after the retry attempts, the sidecar triggers a reinitialization: it regenerates the Redis configuration and instructs the Redis server to shut down. Kubernetes will then automatically restart the container.

# Change Log

## 4.14.9 - ** POTENTIAL BREAKING CHANGE. **
Introduced the ability to change the Haproxy Deployment container pod
- Container port in redis-haproxy-deployment.yam has been changed. Was **redis.port** To **haproxy.containerPort**. Default value is 6379.
- Port in redis-haproxy-service.yaml has been changed. Was **redis.port** To **haproxy.servicePort**. Default value is 6379.

## 4.21.0 - BREAKING CHANGES (Kubernetes Deprecation)
This version introduced the deprecation of the PSP and subsequently added fields to the securityContexts that were introduced in Kubernetes v1.19:

https://kubernetes.io/docs/tutorials/security/seccomp/

As a result, from this version onwards Kubernetes versions older than 1.19 will fail to install without the removal of `.Values.containerSecurityContext.seccompProfile` and `.Values.haproxy.containerSecurityContext.seccompProfile` (If HAProxy is enabled)

----------------------------------------------
Autogenerated from chart metadata using [helm-docs](https://github.com/norwoodj/helm-docs)
