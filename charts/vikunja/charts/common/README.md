# common

![Version: 1.5.0](https://img.shields.io/badge/Version-1.5.0-informational?style=flat-square) ![Type: library](https://img.shields.io/badge/Type-library-informational?style=flat-square)

Function library for Helm charts

Since a lot of the bjw-s charts follow a similar pattern, this library was built to reduce maintenance cost between the charts that use it and try achieve a goal of being DRY.

## Requirements

Kubernetes: `>=1.22.0-0`

## Dependencies

| Repository | Name | Version |
|------------|------|---------|

## Installing the Chart

This is a [Helm Library Chart](https://helm.sh/docs/topics/library_charts/#helm).

**WARNING: THIS CHART IS NOT MEANT TO BE INSTALLED DIRECTLY**

## Using this library

Include this chart as a dependency in your `Chart.yaml` e.g.

```yaml
# Chart.yaml
dependencies:
- name: common
  version: 1.5.0
  repository: https://bjw-s.github.io/helm-charts/
```

For more information, take a look at the [Docs](http://bjw-s.github.io/helm-charts/docs/common-library/introduction/).

## Configuration

Read through the [values.yaml](./values.yaml) file. It has several commented out suggested values.

## Custom configuration

N/A

## Values

**Important**: When deploying an application Helm chart you can add more values from our common library chart [here](https://github.com/bjw-s/helm-charts/tree/main/charts/library/common)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| addons | object | See below | The common chart supports several add-ons. These can be configured under this key. |
| addons.codeserver | object | See values.yaml | The common library supports adding a code-server add-on to access files. It can be configured under this key. |
| addons.codeserver.args | list | `["--auth","none"]` | Set codeserver command line arguments. Consider setting --user-data-dir to a persistent location to preserve code-server setting changes |
| addons.codeserver.enabled | bool | `false` | Enable running a code-server container in the pod |
| addons.codeserver.env | object | `{}` | Set any environment variables for code-server here |
| addons.codeserver.git | object | See below | Optionally allow access a Git repository by passing in a private SSH key |
| addons.codeserver.git.deployKey | string | `""` | Raw SSH private key |
| addons.codeserver.git.deployKeyBase64 | string | `""` | Base64-encoded SSH private key. When both variables are set, the raw SSH key takes precedence. |
| addons.codeserver.git.deployKeySecret | string | `""` | Existing secret containing SSH private key The chart expects it to be present under the `id_rsa` key. |
| addons.codeserver.image.pullPolicy | string | `"IfNotPresent"` | Specify the code-server image pull policy |
| addons.codeserver.image.repository | string | `"ghcr.io/coder/code-server"` | Specify the code-server image |
| addons.codeserver.image.tag | string | `"4.12.0"` | Specify the code-server image tag |
| addons.codeserver.ingress.enabled | bool | `false` | Enable an ingress for the code-server add-on. |
| addons.codeserver.ingress.ingressClassName | string | `nil` | Set the ingressClass that is used for this ingress. |
| addons.codeserver.service.enabled | bool | `true` | Enable a service for the code-server add-on. |
| addons.codeserver.volumeMounts | list | `[]` | Specify a list of volumes that get mounted in the code-server container. At least 1 volumeMount is required! |
| addons.codeserver.workingDir | string | `""` | Specify the working dir that will be opened when code-server starts If not given, the app will default to the mountpah of the first specified volumeMount |
| addons.netshoot | object | See values.yaml | The common library supports adding a netshoot add-on to troubleshoot network issues within a Pod. It can be configured under this key. |
| addons.netshoot.enabled | bool | `false` | Enable running a netshoot container in the pod |
| addons.netshoot.env | object | `{}` | Set any environment variables for netshoot here |
| addons.netshoot.image.pullPolicy | string | `"IfNotPresent"` | Specify the netshoot image pull policy |
| addons.netshoot.image.repository | string | `"ghcr.io/nicolaka/netshoot"` | Specify the netshoot image |
| addons.netshoot.image.tag | string | `"v0.10"` | Specify the netshoot image tag |
| addons.vpn | object | See values.yaml | The common chart supports adding a VPN add-on. It can be configured under this key. |
| addons.vpn.args | list | `[]` | Override the args for the vpn sidecar container |
| addons.vpn.configFile | string | `nil` | Provide a customized vpn configuration file to be used by the VPN. |
| addons.vpn.configFileSecret | string | `nil` | Reference an existing secret that contains the VPN configuration file The chart expects it to be present under the `vpnConfigfile` key. |
| addons.vpn.enabled | bool | `false` | Enable running a VPN in the pod to route traffic through a VPN |
| addons.vpn.env | object | `{}` | All variables specified here will be added to the vpn sidecar container See the documentation of the VPN image for all config values |
| addons.vpn.gluetun | object | See below | Make sure to read the [documentation](https://github.com/qdm12/gluetun/wiki) to see how to configure this addon! |
| addons.vpn.gluetun.image.pullPolicy | string | `"IfNotPresent"` | Specify the Gluetun image pull policy |
| addons.vpn.gluetun.image.repository | string | `"docker.io/qmcgaw/gluetun"` | Specify the Gluetun image |
| addons.vpn.gluetun.image.tag | string | `"v3.33.0"` | Specify the Gluetun image tag |
| addons.vpn.livenessProbe | object | `{}` | Optionally specify a livenessProbe, e.g. to check if the connection is still being protected by the VPN |
| addons.vpn.networkPolicy.annotations | object | `{}` | Provide additional annotations which may be required. |
| addons.vpn.networkPolicy.egress | string | `nil` | The egress configuration for your network policy, All outbound traffic from the pod will be blocked unless specified here. [[ref]](https://kubernetes.io/docs/concepts/services-networking/network-policies/) [[recipes]](https://github.com/ahmetb/kubernetes-network-policy-recipes) |
| addons.vpn.networkPolicy.enabled | bool | `false` | If set to true, will deploy a network policy that blocks all outbound traffic except traffic specified as allowed |
| addons.vpn.networkPolicy.labels | object | `{}` | Provide additional labels which may be required. |
| addons.vpn.networkPolicy.podSelectorLabels | object | `{}` | Provide additional podSelector labels which may be required. |
| addons.vpn.scripts | object | See values.yaml | Provide custom up/down scripts that can be used by the vpn configuration. |
| addons.vpn.securityContext | object | See values.yaml | Set the VPN container securityContext |
| addons.vpn.type | string | `"gluetun"` | Specify the VPN type. Valid options are `gluetun`. |
| affinity | object | `{}` | Defines affinity constraint rules. [[ref]](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity) |
| args | list | `[]` | Override the args for the default container |
| automountServiceAccountToken | bool | `true` | Specifies whether a service account token should be automatically mounted. |
| command | list | `[]` | Override the command(s) for the default container |
| configMaps | object | See below | Configure configMaps for the chart here. Additional configMaps can be added by adding a dictionary key similar to the 'config' object. |
| configMaps.config.annotations | object | `{}` | Annotations to add to the configMap |
| configMaps.config.data | object | `{}` | configMap data content. Helm template enabled. |
| configMaps.config.enabled | bool | `false` | Enables or disables the configMap |
| configMaps.config.labels | object | `{}` | Labels to add to the configMap |
| controller.annotations | object | `{}` | Set annotations on the deployment/statefulset/daemonset/cronjob |
| controller.cronjob | object | See below | CronJob configuration. Required only when using `controller.type: cronjob`. |
| controller.cronjob.backoffLimit | int | `6` | Limits the number of times a failed job will be retried |
| controller.cronjob.concurrencyPolicy | string | `"Forbid"` | Specifies how to treat concurrent executions of a job that is created by this cron job valid values are Allow, Forbid or Replace |
| controller.cronjob.failedJobsHistory | int | `1` | The number of failed Jobs to keep |
| controller.cronjob.schedule | string | `"*/20 * * * *"` | Sets the CronJob time when to execute your jobs |
| controller.cronjob.startingDeadlineSeconds | int | `30` | The deadline in seconds for starting the job if it misses its scheduled time for any reason |
| controller.cronjob.successfulJobsHistory | int | `1` | The number of succesful Jobs to keep |
| controller.cronjob.ttlSecondsAfterFinished | string | `nil` | If this field is set, ttlSecondsAfterFinished after the Job finishes, it is eligible to be automatically deleted. |
| controller.enabled | bool | `true` | enable the controller. |
| controller.labels | object | `{}` | Set labels on the deployment/statefulset/daemonset/cronjob |
| controller.podManagementPolicy | string | `nil` | Set statefulset podManagementPolicy, valid values are Parallel and OrderedReady (default). |
| controller.replicas | int | `1` | Number of desired pods. When using a HorizontalPodAutoscaler, set this to `null`. |
| controller.restartPolicy | string | `Always`. When `controller.type` is `cronjob` it defaults to `Never`. | Set Container restart policy. |
| controller.revisionHistoryLimit | int | `3` | ReplicaSet revision history limit |
| controller.rollingUpdate.partition | string | `nil` | Set statefulset RollingUpdate partition |
| controller.rollingUpdate.surge | string | `nil` | Set deployment RollingUpdate max surge |
| controller.rollingUpdate.unavailable | string | `nil` | Set deployment RollingUpdate max unavailable |
| controller.strategy | string | `nil` | Set the controller upgrade strategy For Deployments, valid values are Recreate (default) and RollingUpdate. For StatefulSets, valid values are OnDelete and RollingUpdate (default). DaemonSets/CronJobs ignore this. |
| controller.type | string | `"deployment"` | Set the controller type. Valid options are deployment, daemonset, statefulset or cronjob |
| dnsConfig | object | `{}` | Configuring the ndots option may resolve nslookup issues on some Kubernetes setups. |
| dnsPolicy | string | `nil` | Defaults to "ClusterFirst" if hostNetwork is false and "ClusterFirstWithHostNet" if hostNetwork is true. |
| enableServiceLinks | bool | `true` | Enable/disable the generation of environment variables for services. [[ref]](https://kubernetes.io/docs/concepts/services-networking/connect-applications-service/#accessing-the-service) |
| env | string | `nil` | Main environment variables. Template enabled. Syntax options: A) TZ: UTC B) PASSWD: '{{ .Release.Name }}' C) PASSWD:      configMapKeyRef:        name: config-map-name        key: key-name D) PASSWD:      valueFrom:        secretKeyRef:          name: secret-name          key: key-name      ... E) - name: TZ      value: UTC F) - name: TZ      value: '{{ .Release.Name }}' |
| envFrom | list | `[]` | Secrets and/or ConfigMaps that will be loaded as environment variables. [[ref]](https://unofficial-kubernetes.readthedocs.io/en/latest/tasks/configure-pod-container/configmap/#use-case-consume-configmap-in-environment-variables) |
| global.annotations | object | `{}` | Set additional global annotations. Helm templates can be used. |
| global.fullnameOverride | string | `nil` | Set the entire name definition |
| global.labels | object | `{}` | Set additional global labels. Helm templates can be used. |
| global.nameOverride | string | `nil` | Set an override for the prefix of the fullname |
| hostAliases | list | `[]` | Use hostAliases to add custom entries to /etc/hosts - mapping IP addresses to hostnames. [[ref]](https://kubernetes.io/docs/concepts/services-networking/add-entries-to-pod-etc-hosts-with-host-aliases/) |
| hostIPC | bool | `false` | Use the host's ipc namespace |
| hostNetwork | bool | `false` | When using hostNetwork make sure you set dnsPolicy to `ClusterFirstWithHostNet` |
| hostPID | bool | `false` | Use the host's pid namespace |
| hostname | string | `nil` | Allows specifying explicit hostname setting |
| image.pullPolicy | string | `nil` | image pull policy |
| image.repository | string | `nil` | image repository |
| image.tag | string | `nil` | image tag |
| imagePullSecrets | list | `[]` | Set image pull secrets |
| ingress | object | See below | Configure the ingresses for the chart here. Additional ingresses can be added by adding a dictionary key similar to the 'main' ingress. |
| ingress.main.annotations | object | `{}` | Provide additional annotations which may be required. |
| ingress.main.enabled | bool | `false` | Enables or disables the ingress |
| ingress.main.hosts[0].host | string | `"chart-example.local"` | Host address. Helm template can be passed. |
| ingress.main.hosts[0].paths[0].path | string | `"/"` | Path.  Helm template can be passed. |
| ingress.main.hosts[0].paths[0].service.name | string | `nil` | Overrides the service name reference for this path |
| ingress.main.hosts[0].paths[0].service.port | string | `nil` | Overrides the service port reference for this path |
| ingress.main.ingressClassName | string | `nil` | Set the ingressClass that is used for this ingress. |
| ingress.main.labels | object | `{}` | Provide additional labels which may be required. |
| ingress.main.nameOverride | string | `nil` | Override the name suffix that is used for this ingress. |
| ingress.main.primary | bool | `true` | Make this the primary ingress (used in probes, notes, etc...). If there is more than 1 ingress, make sure that only 1 ingress is marked as primary. |
| ingress.main.tls | list | `[]` | Configure TLS for the ingress. Both secretName and hosts can process a Helm template. |
| initContainers | object | `{}` | Specify any initContainers here as dictionary items. Each initContainer should have its own key. The dictionary item key will determine the order. Helm templates can be used. |
| lifecycle | object | `{}` | Configure the lifecycle for the main container |
| nodeSelector | object | `{}` | Node selection constraint [[ref]](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector) |
| persistence | object | See below | Configure persistence for the chart here. Additional items can be added by adding a dictionary key similar to the 'config' key. [[ref]](https://bjw-s.github.io/helm-charts/docs/common-library/common-library-storage) |
| persistence.config | object | See below | Default persistence for configuration files. |
| persistence.config.accessMode | string | `"ReadWriteOnce"` | AccessMode for the persistent volume. Make sure to select an access mode that is supported by your storage provider! [[ref]](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes) |
| persistence.config.enabled | bool | `false` | Enables or disables the persistence item |
| persistence.config.existingClaim | string | `nil` | If you want to reuse an existing claim, the name of the existing PVC can be passed here. |
| persistence.config.mountPath | string | `nil` | Where to mount the volume in the main container. Defaults to `/<name_of_the_volume>`, setting to '-' creates the volume but disables the volumeMount. |
| persistence.config.nameOverride | string | `nil` | Override the name suffix that is used for this volume. |
| persistence.config.readOnly | bool | `false` | Specify if the volume should be mounted read-only. |
| persistence.config.retain | bool | `false` | Set to true to retain the PVC upon `helm uninstall` |
| persistence.config.size | string | `"1Gi"` | The amount of storage that is requested for the persistent volume. |
| persistence.config.storageClass | string | `nil` | Storage Class for the config volume. If set to `-`, dynamic provisioning is disabled. If set to something else, the given storageClass is used. If undefined (the default) or set to null, no storageClassName spec is set, choosing the default provisioner. |
| persistence.config.subPath | string | `nil` | Used in conjunction with `existingClaim`. Specifies a sub-path inside the referenced volume instead of its root |
| persistence.config.type | string | `"pvc"` | Sets the persistence type Valid options are pvc, emptyDir, hostPath, secret, configMap or custom |
| persistence.shared | object | See below | Create an emptyDir volume to share between all containers [[ref]]https://kubernetes.io/docs/concepts/storage/volumes/#emptydir) |
| persistence.shared.medium | string | `nil` | Set the medium to "Memory" to mount a tmpfs (RAM-backed filesystem) instead of the storage medium that backs the node. |
| persistence.shared.sizeLimit | string | `nil` | If the `SizeMemoryBackedVolumes` feature gate is enabled, you can specify a size for memory backed volumes. |
| podAnnotations | object | `{}` | Set annotations on the pod |
| podLabels | object | `{}` | Set labels on the pod |
| podSecurityContext | object | `{}` | Configure the Security Context for the Pod |
| priorityClassName | string | `nil` | Custom priority class for different treatment by the scheduler |
| probes | object | See below | [[ref]](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) |
| probes.liveness | object | See below | Liveness probe configuration |
| probes.liveness.custom | bool | `false` | Set this to `true` if you wish to specify your own livenessProbe |
| probes.liveness.enabled | bool | `true` | Enable the liveness probe |
| probes.liveness.spec | object | See below | The spec field contains the values for the default livenessProbe. If you selected `custom: true`, this field holds the definition of the livenessProbe. |
| probes.liveness.type | string | "TCP" | sets the probe type when not using a custom probe |
| probes.readiness | object | See below | Redainess probe configuration |
| probes.readiness.custom | bool | `false` | Set this to `true` if you wish to specify your own readinessProbe |
| probes.readiness.enabled | bool | `true` | Enable the readiness probe |
| probes.readiness.spec | object | See below | The spec field contains the values for the default readinessProbe. If you selected `custom: true`, this field holds the definition of the readinessProbe. |
| probes.readiness.type | string | "TCP" | sets the probe type when not using a custom probe |
| probes.startup | object | See below | Startup probe configuration |
| probes.startup.custom | bool | `false` | Set this to `true` if you wish to specify your own startupProbe |
| probes.startup.enabled | bool | `true` | Enable the startup probe |
| probes.startup.spec | object | See below | The spec field contains the values for the default startupProbe. If you selected `custom: true`, this field holds the definition of the startupProbe. |
| probes.startup.type | string | "TCP" | sets the probe type when not using a custom probe |
| resources | object | `{}` | Set the resource requests / limits for the main container. |
| route | object | See below | Configure the gateway routes for the chart here. Additional routes can be added by adding a dictionary key similar to the 'main' route. [[ref]](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io%2fv1alpha2) |
| route.main.annotations | object | `{}` | Provide additional annotations which may be required. |
| route.main.enabled | bool | `false` | Enables or disables the route |
| route.main.hostnames | list | `[]` | Host addresses |
| route.main.kind | string | `"HTTPRoute"` | Set the route kind Valid options are GRPCRoute, HTTPRoute, TCPRoute, TLSRoute, UDPRoute |
| route.main.labels | object | `{}` | Provide additional labels which may be required. |
| route.main.nameOverride | string | `nil` | Override the name suffix that is used for this route. |
| route.main.parentRefs | list | `[{"group":"gateway.networking.k8s.io","kind":"Gateway","name":null,"namespace":null,"sectionName":null}]` | Configure the resource the route attaches to. |
| route.main.rules | list | `[{"backendRefs":[{"group":"","kind":"Service","name":null,"namespace":null,"port":null,"weight":1}],"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | Configure rules for routing. Defaults to the primary service. |
| route.main.rules[0].backendRefs | list | `[{"group":"","kind":"Service","name":null,"namespace":null,"port":null,"weight":1}]` | Configure backends where matching requests should be sent. |
| runtimeClassName | string | `nil` | Allow specifying a runtimeClassName other than the default one (ie: nvidia) |
| schedulerName | string | `nil` | Allows specifying a custom scheduler name |
| secrets | object | See below | Use this to populate secrets with the values you specify. Be aware that these values are not encrypted by default, and could therefore visible to anybody with access to the values.yaml file. Additional Secrets can be added by adding a dictionary key similar to the 'secret' object. |
| secrets.secret.annotations | object | `{}` | Annotations to add to the Secret |
| secrets.secret.enabled | bool | `false` | Enables or disables the Secret |
| secrets.secret.labels | object | `{}` | Labels to add to the Secret |
| secrets.secret.stringData | object | `{}` | Secret stringData content. Helm template enabled. |
| securityContext | object | `{}` | Configure the Security Context for the main container |
| service | object | See below | Configure the services for the chart here. Additional services can be added by adding a dictionary key similar to the 'main' service. |
| service.main.annotations | object | `{}` | Provide additional annotations which may be required. |
| service.main.enabled | bool | `true` | Enables or disables the service |
| service.main.externalTrafficPolicy | string | `nil` | [[ref](https://kubernetes.io/docs/tutorials/services/source-ip/)] |
| service.main.ipFamilies | list | `[]` | The ip families that should be used. Options: IPv4, IPv6 |
| service.main.ipFamilyPolicy | string | `nil` | Specify the ip policy. Options: SingleStack, PreferDualStack, RequireDualStack |
| service.main.labels | object | `{}` | Provide additional labels which may be required. |
| service.main.nameOverride | string | `nil` | Override the name suffix that is used for this service |
| service.main.ports | object | See below | Configure the Service port information here. Additional ports can be added by adding a dictionary key similar to the 'http' service. |
| service.main.ports.http.enabled | bool | `true` | Enables or disables the port |
| service.main.ports.http.extraSelectorLabels | object | `{}` | Allow adding additional match labels |
| service.main.ports.http.nodePort | string | `nil` | Specify the nodePort value for the LoadBalancer and NodePort service types. [[ref]](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport) |
| service.main.ports.http.port | string | `nil` | The port number |
| service.main.ports.http.primary | bool | `true` | Make this the primary port (used in probes, notes, etc...) If there is more than 1 service, make sure that only 1 port is marked as primary. |
| service.main.ports.http.protocol | string | `"HTTP"` | Port protocol. Support values are `HTTP`, `HTTPS`, `TCP` and `UDP`. HTTPS and HTTPS spawn a TCP service and get used for internal URL and name generation |
| service.main.ports.http.targetPort | string | `nil` | Specify a service targetPort if you wish to differ the service port from the application port. If `targetPort` is specified, this port number is used in the container definition instead of the `port` value. Therefore named ports are not supported for this field. |
| service.main.primary | bool | `true` | Make this the primary service (used in probes, notes, etc...). If there is more than 1 service, make sure that only 1 service is marked as primary. |
| service.main.type | string | `"ClusterIP"` | Set the service type |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.create | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template |
| serviceMonitor | object | See below | Configure the ServiceMonitors for the chart here. Additional ServiceMonitors can be added by adding a dictionary key similar to the 'main' ServiceMonitors. |
| serviceMonitor.main.annotations | object | `{}` | Provide additional annotations which may be required. |
| serviceMonitor.main.enabled | bool | `false` | Enables or disables the serviceMonitor. |
| serviceMonitor.main.endpoints | list | See values.yaml | Configures the endpoints for the serviceMonitor. |
| serviceMonitor.main.labels | object | `{}` | Provide additional labels which may be required. |
| serviceMonitor.main.nameOverride | string | `nil` | Override the name suffix that is used for this serviceMonitor. |
| serviceMonitor.main.selector | object | `{}` | Configures a custom selector for the serviceMonitor, this takes precedence over specifying a service name. Helm templates can be used. |
| serviceMonitor.main.serviceName | string | `"{{ include \"bjw-s.common.lib.chart.names.fullname\" $ }}"` | Configures the target Service for the serviceMonitor. Helm templates can be used. |
| sidecars | object | `{}` | Specify any sidecar containers here as dictionary items. Each sidecar container should have its own key. The dictionary item key will determine the order. Helm templates can be used. |
| termination.gracePeriodSeconds | string | `nil` | [[ref](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#lifecycle)] |
| termination.messagePath | string | `nil` | [[ref](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#lifecycle-1)] |
| termination.messagePolicy | string | `nil` | [[ref](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#lifecycle-1)] |
| tolerations | list | `[]` | Specify taint tolerations [[ref]](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) |
| topologySpreadConstraints | list | `[]` | Defines topologySpreadConstraint rules. [[ref]](https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/) |
| volumeClaimTemplates | list | `[]` | Used in conjunction with `controller.type: statefulset` to create individual disks for each instance. |

## Support

- See the [Docs](http://bjw-s.github.io/helm-charts/docs/)
- Open an [issue](https://github.com/bjw-s/helm-charts/issues/new/choose)
- Join the k8s-at-home [Discord](https://discord.gg/sTMX7Vh) community

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
