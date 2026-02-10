# Grafana Helm Chart

* Installs the web dashboarding system [Grafana](http://grafana.org/)

## Get Repo Info

```console
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release grafana-community/grafana
```

## Uninstalling the Chart

To uninstall/delete the my-release deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading an existing Release to a new major version

A major chart version change (like v1.2.3 -> v2.0.0) indicates that there is an
incompatible breaking change needing manual actions.

### To 4.0.0 (And 3.12.1)

This version requires Helm >= 2.12.0.

### To 5.0.0

You have to add --force to your helm upgrade command as the labels of the chart have changed.

### To 6.0.0

This version requires Helm >= 3.1.0.

### To 7.0.0

For consistency with other Helm charts, the `global.image.registry` parameter was renamed
to `global.imageRegistry`. If you were not previously setting `global.image.registry`, no action
is required on upgrade. If you were previously setting `global.image.registry`, you will
need to instead set `global.imageRegistry`.

### To 10.0.0

Static alerting resources now support Helm templating. This means that alerting resources loaded from external files (`alerting.*.files`) are now processed by the Helm template engine.

If you already use template expressions intended for Alertmanager (for example, `{{ $labels.instance }}`), these must now be escaped to avoid unintended Helm or Go template evaluation. To escape them, wrap the braces with an extra layer like this:

`{{ "{{" }} $labels.instance {{ "}}" }}`

This ensures the expressions are preserved for Alertmanager instead of being rendered by Helm.

### To 11.0.0

The minimum required Kubernetes version is now 1.25. All references to deprecated APIs have been removed.

## Configuration

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| "grafana.ini".analytics.check_for_updates | bool | `true` |  |
| "grafana.ini".log.mode | string | `"console"` |  |
| "grafana.ini".paths.data | string | `"/var/lib/grafana/"` |  |
| "grafana.ini".paths.logs | string | `"/var/log/grafana"` |  |
| "grafana.ini".paths.plugins | string | `"/var/lib/grafana/plugins"` |  |
| "grafana.ini".paths.provisioning | string | `"/etc/grafana/provisioning"` |  |
| "grafana.ini".server.domain | string | `"{{ if (and .Values.ingress.enabled .Values.ingress.hosts) }}{{ tpl (.Values.ingress.hosts | first) . }}{{ else if (and .Values.route.main.enabled .Values.route.main.hostnames) }}{{ tpl (.Values.route.main.hostnames | first) . }}{{ else }}''{{ end }}"` |  |
| "grafana.ini".unified_storage.index_path | string | `"/var/lib/grafana-search/bleve"` |  |
| admin.existingSecret | string | `""` |  |
| admin.passwordKey | string | `"admin-password"` |  |
| admin.userKey | string | `"admin-user"` |  |
| adminUser | string | `"admin"` |  |
| affinity | object | `{}` |  |
| alerting | object | `{}` |  |
| assertNoLeakedSecrets | bool | `true` |  |
| automountServiceAccountToken | bool | `true` |  |
| autoscaling.behavior | object | `{}` |  |
| autoscaling.enabled | bool | `false` |  |
| autoscaling.maxReplicas | int | `5` |  |
| autoscaling.minReplicas | int | `1` |  |
| autoscaling.targetCPU | string | `"60"` |  |
| autoscaling.targetMemory | string | `""` |  |
| containerSecurityContext.allowPrivilegeEscalation | bool | `false` |  |
| containerSecurityContext.capabilities.drop[0] | string | `"ALL"` |  |
| containerSecurityContext.privileged | bool | `false` |  |
| containerSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| createConfigmap | bool | `true` |  |
| dashboardProviders | object | `{}` |  |
| dashboards | object | `{}` |  |
| dashboardsConfigMaps | object | `{}` |  |
| datasources | object | `{}` |  |
| defaultCurlOptions | string | `"-skf"` |  |
| deploymentStrategy.type | string | `"RollingUpdate"` |  |
| dnsConfig | object | `{}` |  |
| dnsPolicy | string | `nil` |  |
| downloadDashboards.env | object | `{}` |  |
| downloadDashboards.envFromSecret | string | `""` |  |
| downloadDashboards.envValueFrom | object | `{}` |  |
| downloadDashboards.resources | object | `{}` |  |
| downloadDashboards.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| downloadDashboards.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| downloadDashboards.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| downloadDashboardsImage.pullPolicy | string | `"IfNotPresent"` |  |
| downloadDashboardsImage.registry | string | `"docker.io"` | The Docker registry |
| downloadDashboardsImage.repository | string | `"curlimages/curl"` |  |
| downloadDashboardsImage.sha | string | `""` |  |
| downloadDashboardsImage.tag | string | `"8.18.0"` |  |
| enableKubeBackwardCompatibility | bool | `false` |  |
| enableServiceLinks | bool | `true` |  |
| env | object | `{}` |  |
| envFromConfigMaps | list | `[]` |  |
| envFromSecret | string | `""` |  |
| envFromSecrets | list | `[]` |  |
| envRenderSecret | object | `{}` |  |
| envValueFrom | object | `{}` |  |
| extraConfigmapMounts | list | `[]` |  |
| extraContainerVolumes | list | `[]` |  |
| extraContainers | string | `""` |  |
| extraEmptyDirMounts | list | `[]` |  |
| extraExposePorts | list | `[]` |  |
| extraInitContainers | list | `[]` |  |
| extraLabels | object | `{}` |  |
| extraObjects | list | `[]` |  |
| extraSecretMounts | list | `[]` |  |
| extraVolumeMounts | list | `[]` |  |
| extraVolumes | list | `[]` |  |
| global.imagePullSecrets | list | `[]` |  |
| global.imageRegistry | string | `nil` | Overrides the Docker registry globally for all images |
| gossipPortName | string | `"gossip"` |  |
| headlessService | bool | `false` |  |
| hostAliases | list | `[]` |  |
| hostUsers | string | `nil` |  |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.pullSecrets | list | `[]` |  |
| image.registry | string | `"docker.io"` | The Docker registry |
| image.repository | string | `"grafana/grafana"` | Docker image repository |
| image.sha | string | `""` |  |
| image.tag | string | `""` |  |
| imageRenderer.affinity | object | `{}` |  |
| imageRenderer.automountServiceAccountToken | bool | `false` |  |
| imageRenderer.autoscaling.behavior | object | `{}` |  |
| imageRenderer.autoscaling.enabled | bool | `false` |  |
| imageRenderer.autoscaling.maxReplicas | int | `5` |  |
| imageRenderer.autoscaling.minReplicas | int | `1` |  |
| imageRenderer.autoscaling.targetCPU | string | `"60"` |  |
| imageRenderer.autoscaling.targetMemory | string | `""` |  |
| imageRenderer.containerSecurityContext.allowPrivilegeEscalation | bool | `false` |  |
| imageRenderer.containerSecurityContext.capabilities.drop[0] | string | `"ALL"` |  |
| imageRenderer.containerSecurityContext.readOnlyRootFilesystem | bool | `true` |  |
| imageRenderer.containerSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| imageRenderer.deploymentStrategy | object | `{}` |  |
| imageRenderer.enabled | bool | `false` |  |
| imageRenderer.env.HTTP_HOST | string | `"0.0.0.0"` |  |
| imageRenderer.env.XDG_CACHE_HOME | string | `"/tmp/.chromium"` |  |
| imageRenderer.env.XDG_CONFIG_HOME | string | `"/tmp/.chromium"` |  |
| imageRenderer.envValueFrom | object | `{}` |  |
| imageRenderer.extraConfigmapMounts | list | `[]` |  |
| imageRenderer.extraSecretMounts | list | `[]` |  |
| imageRenderer.extraVolumeMounts | list | `[]` |  |
| imageRenderer.extraVolumes | list | `[]` |  |
| imageRenderer.grafanaProtocol | string | `"http"` |  |
| imageRenderer.grafanaSubPath | string | `""` |  |
| imageRenderer.hostAliases | list | `[]` |  |
| imageRenderer.hostUsers | string | `nil` |  |
| imageRenderer.image.pullPolicy | string | `"Always"` |  |
| imageRenderer.image.pullSecrets | list | `[]` |  |
| imageRenderer.image.registry | string | `"docker.io"` | The Docker registry |
| imageRenderer.image.repository | string | `"grafana/grafana-image-renderer"` |  |
| imageRenderer.image.sha | string | `""` |  |
| imageRenderer.image.tag | string | `"latest"` |  |
| imageRenderer.networkPolicy.extraIngressSelectors | list | `[]` |  |
| imageRenderer.networkPolicy.limitEgress | bool | `false` |  |
| imageRenderer.networkPolicy.limitIngress | bool | `true` |  |
| imageRenderer.nodeSelector | object | `{}` |  |
| imageRenderer.podAnnotations | object | `{}` |  |
| imageRenderer.podPortName | string | `"http"` |  |
| imageRenderer.priorityClassName | string | `""` |  |
| imageRenderer.renderingCallbackURL | string | `""` |  |
| imageRenderer.replicas | int | `1` |  |
| imageRenderer.resources | object | `{}` |  |
| imageRenderer.revisionHistoryLimit | int | `10` |  |
| imageRenderer.securityContext | object | `{}` |  |
| imageRenderer.serverURL | string | `""` |  |
| imageRenderer.service.appProtocol | string | `""` |  |
| imageRenderer.service.enabled | bool | `true` |  |
| imageRenderer.service.port | int | `8081` |  |
| imageRenderer.service.portName | string | `"http"` |  |
| imageRenderer.service.targetPort | int | `8081` |  |
| imageRenderer.serviceAccountName | string | `""` |  |
| imageRenderer.serviceMonitor.enabled | bool | `false` |  |
| imageRenderer.serviceMonitor.interval | string | `"1m"` |  |
| imageRenderer.serviceMonitor.labels | object | `{}` |  |
| imageRenderer.serviceMonitor.path | string | `"/metrics"` |  |
| imageRenderer.serviceMonitor.relabelings | list | `[]` |  |
| imageRenderer.serviceMonitor.scheme | string | `"http"` |  |
| imageRenderer.serviceMonitor.scrapeTimeout | string | `"30s"` |  |
| imageRenderer.serviceMonitor.targetLabels | list | `[]` |  |
| imageRenderer.serviceMonitor.tlsConfig | object | `{}` |  |
| imageRenderer.tolerations | list | `[]` |  |
| ingress.annotations | object | `{}` |  |
| ingress.enabled | bool | `false` |  |
| ingress.extraPaths | list | `[]` |  |
| ingress.hosts[0] | string | `"chart-example.local"` |  |
| ingress.labels | object | `{}` |  |
| ingress.path | string | `"/"` |  |
| ingress.pathType | string | `"Prefix"` |  |
| ingress.tls | list | `[]` |  |
| initChownData.enabled | bool | `true` |  |
| initChownData.image.pullPolicy | string | `"IfNotPresent"` |  |
| initChownData.image.registry | string | `"docker.io"` | The Docker registry |
| initChownData.image.repository | string | `"library/busybox"` |  |
| initChownData.image.sha | string | `""` |  |
| initChownData.image.tag | string | `"1.37.0"` |  |
| initChownData.resources | object | `{}` |  |
| initChownData.securityContext.capabilities.add[0] | string | `"CHOWN"` |  |
| initChownData.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| initChownData.securityContext.readOnlyRootFilesystem | bool | `false` |  |
| initChownData.securityContext.runAsNonRoot | bool | `false` |  |
| initChownData.securityContext.runAsUser | int | `0` |  |
| initChownData.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| ldap.config | string | `""` |  |
| ldap.enabled | bool | `false` |  |
| ldap.existingSecret | string | `""` |  |
| lifecycleHooks | object | `{}` |  |
| livenessProbe.failureThreshold | int | `10` |  |
| livenessProbe.httpGet.path | string | `"/api/health"` |  |
| livenessProbe.httpGet.port | string | `"grafana"` |  |
| livenessProbe.initialDelaySeconds | int | `60` |  |
| livenessProbe.timeoutSeconds | int | `30` |  |
| namespaceOverride | string | `""` |  |
| networkPolicy.allowExternal | bool | `true` |  |
| networkPolicy.egress.blockDNSResolution | bool | `false` |  |
| networkPolicy.egress.enabled | bool | `false` |  |
| networkPolicy.egress.ports | list | `[]` |  |
| networkPolicy.egress.to | list | `[]` |  |
| networkPolicy.enabled | bool | `false` |  |
| networkPolicy.explicitNamespacesSelector | object | `{}` |  |
| networkPolicy.ingress | bool | `true` |  |
| nodeSelector | object | `{}` |  |
| notifiers | object | `{}` |  |
| persistence.accessModes[0] | string | `"ReadWriteOnce"` |  |
| persistence.disableWarning | bool | `false` |  |
| persistence.enabled | bool | `false` |  |
| persistence.extraPvcLabels | object | `{}` |  |
| persistence.finalizers[0] | string | `"kubernetes.io/pvc-protection"` |  |
| persistence.inMemory.enabled | bool | `false` |  |
| persistence.lookupVolumeName | bool | `true` |  |
| persistence.size | string | `"10Gi"` |  |
| persistence.type | string | `"pvc"` |  |
| persistence.volumeName | string | `""` |  |
| plugins | list | `[]` |  |
| podDisruptionBudget | object | `{}` |  |
| podPortName | string | `"grafana"` |  |
| rbac.create | bool | `true` |  |
| rbac.extraClusterRoleRules | list | `[]` |  |
| rbac.extraRoleRules | list | `[]` |  |
| rbac.namespaced | bool | `false` |  |
| rbac.pspEnabled | bool | `false` |  |
| rbac.pspUseAppArmor | bool | `false` |  |
| readinessProbe.httpGet.path | string | `"/api/health"` |  |
| readinessProbe.httpGet.port | string | `"grafana"` |  |
| replicas | int | `1` |  |
| resources | object | `{}` |  |
| revisionHistoryLimit | int | `10` |  |
| route | object | `{"main":{"additionalRules":[],"annotations":{},"apiVersion":"gateway.networking.k8s.io/v1","enabled":false,"filters":[],"hostnames":[],"httpsRedirect":false,"kind":"HTTPRoute","labels":{},"matches":[{"path":{"type":"PathPrefix","value":"/"}}],"parentRefs":[]}}` | BETA: Configure the gateway routes for the chart here. More routes can be added by adding a dictionary key like the 'main' route. Be aware that this is an early beta of this feature, kube-prometheus-stack does not guarantee this works and is subject to change. Being BETA this can/will change in the future without notice, do not use unless you want to take that risk [[ref]](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io%2fv1alpha2) |
| route.main.apiVersion | string | `"gateway.networking.k8s.io/v1"` | Set the route apiVersion, e.g. gateway.networking.k8s.io/v1 or gateway.networking.k8s.io/v1alpha2 |
| route.main.enabled | bool | `false` | Enables or disables the route |
| route.main.kind | string | `"HTTPRoute"` | Set the route kind Valid options are GRPCRoute, HTTPRoute, TCPRoute, TLSRoute, UDPRoute |
| securityContext.fsGroup | int | `472` |  |
| securityContext.runAsGroup | int | `472` |  |
| securityContext.runAsNonRoot | bool | `true` |  |
| securityContext.runAsUser | int | `472` |  |
| service.annotations | object | `{}` |  |
| service.appProtocol | string | `""` |  |
| service.enabled | bool | `true` |  |
| service.ipFamilies | list | `[]` |  |
| service.ipFamilyPolicy | string | `""` |  |
| service.labels | object | `{}` |  |
| service.loadBalancerClass | string | `""` |  |
| service.loadBalancerIP | string | `""` |  |
| service.loadBalancerSourceRanges | list | `[]` |  |
| service.port | int | `80` |  |
| service.portName | string | `"service"` |  |
| service.sessionAffinity | string | `""` |  |
| service.targetPort | int | `3000` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.automountServiceAccountToken | bool | `false` |  |
| serviceAccount.create | bool | `true` |  |
| serviceAccount.labels | object | `{}` |  |
| serviceAccount.name | string | `nil` |  |
| serviceAccount.nameTest | string | `nil` |  |
| serviceMonitor.basicAuth | object | `{}` |  |
| serviceMonitor.enabled | bool | `false` |  |
| serviceMonitor.interval | string | `"30s"` |  |
| serviceMonitor.labels | object | `{}` |  |
| serviceMonitor.metricRelabelings | list | `[]` |  |
| serviceMonitor.path | string | `"/metrics"` |  |
| serviceMonitor.relabelings | list | `[]` |  |
| serviceMonitor.scheme | string | `"http"` |  |
| serviceMonitor.scrapeTimeout | string | `"30s"` |  |
| serviceMonitor.targetLabels | list | `[]` |  |
| serviceMonitor.tlsConfig | object | `{}` |  |
| shareProcessNamespace | bool | `false` |  |
| sidecar.alerts.enabled | bool | `false` |  |
| sidecar.alerts.env | object | `{}` |  |
| sidecar.alerts.envValueFrom | object | `{}` |  |
| sidecar.alerts.extraMounts | list | `[]` |  |
| sidecar.alerts.initAlerts | bool | `false` |  |
| sidecar.alerts.label | string | `"grafana_alert"` |  |
| sidecar.alerts.labelValue | string | `""` |  |
| sidecar.alerts.reloadURL | string | `"http://localhost:3000/api/admin/provisioning/alerting/reload"` |  |
| sidecar.alerts.resource | string | `"both"` |  |
| sidecar.alerts.resourceName | string | `""` |  |
| sidecar.alerts.script | string | `nil` |  |
| sidecar.alerts.searchNamespace | string | `nil` |  |
| sidecar.alerts.sizeLimit | string | `""` |  |
| sidecar.alerts.skipReload | bool | `false` |  |
| sidecar.alerts.watchMethod | string | `"WATCH"` |  |
| sidecar.dashboards.SCProvider | bool | `true` |  |
| sidecar.dashboards.defaultFolderName | string | `nil` |  |
| sidecar.dashboards.enabled | bool | `false` |  |
| sidecar.dashboards.env | object | `{}` |  |
| sidecar.dashboards.envValueFrom | object | `{}` |  |
| sidecar.dashboards.extraMounts | list | `[]` |  |
| sidecar.dashboards.folder | string | `"/tmp/dashboards"` |  |
| sidecar.dashboards.folderAnnotation | string | `nil` |  |
| sidecar.dashboards.initDashboards | bool | `false` |  |
| sidecar.dashboards.label | string | `"grafana_dashboard"` |  |
| sidecar.dashboards.labelValue | string | `""` |  |
| sidecar.dashboards.provider.allowUiUpdates | bool | `false` |  |
| sidecar.dashboards.provider.disableDelete | bool | `false` |  |
| sidecar.dashboards.provider.folder | string | `""` |  |
| sidecar.dashboards.provider.folderUid | string | `""` |  |
| sidecar.dashboards.provider.foldersFromFilesStructure | bool | `false` |  |
| sidecar.dashboards.provider.name | string | `"sidecarProvider"` |  |
| sidecar.dashboards.provider.orgid | int | `1` |  |
| sidecar.dashboards.provider.type | string | `"file"` |  |
| sidecar.dashboards.reloadURL | string | `"http://localhost:3000/api/admin/provisioning/dashboards/reload"` |  |
| sidecar.dashboards.resource | string | `"both"` |  |
| sidecar.dashboards.resourceName | string | `""` |  |
| sidecar.dashboards.script | string | `nil` |  |
| sidecar.dashboards.searchNamespace | string | `nil` |  |
| sidecar.dashboards.sizeLimit | string | `""` |  |
| sidecar.dashboards.skipReload | bool | `false` |  |
| sidecar.dashboards.watchMethod | string | `"WATCH"` |  |
| sidecar.datasources.enabled | bool | `false` |  |
| sidecar.datasources.env | object | `{}` |  |
| sidecar.datasources.envValueFrom | object | `{}` |  |
| sidecar.datasources.extraMounts | list | `[]` |  |
| sidecar.datasources.initDatasources | bool | `false` |  |
| sidecar.datasources.label | string | `"grafana_datasource"` |  |
| sidecar.datasources.labelValue | string | `""` |  |
| sidecar.datasources.reloadURL | string | `"http://localhost:3000/api/admin/provisioning/datasources/reload"` |  |
| sidecar.datasources.resource | string | `"both"` |  |
| sidecar.datasources.resourceName | string | `""` |  |
| sidecar.datasources.script | string | `nil` |  |
| sidecar.datasources.searchNamespace | string | `nil` |  |
| sidecar.datasources.sizeLimit | string | `""` |  |
| sidecar.datasources.skipReload | bool | `false` |  |
| sidecar.datasources.watchMethod | string | `"WATCH"` |  |
| sidecar.enableUniqueFilenames | bool | `false` |  |
| sidecar.image.registry | string | `"quay.io"` | The Docker registry |
| sidecar.image.repository | string | `"kiwigrid/k8s-sidecar"` |  |
| sidecar.image.sha | string | `""` |  |
| sidecar.image.tag | string | `"2.5.0"` |  |
| sidecar.imagePullPolicy | string | `"IfNotPresent"` |  |
| sidecar.livenessProbe | object | `{}` |  |
| sidecar.notifiers.enabled | bool | `false` |  |
| sidecar.notifiers.env | object | `{}` |  |
| sidecar.notifiers.extraMounts | list | `[]` |  |
| sidecar.notifiers.initNotifiers | bool | `false` |  |
| sidecar.notifiers.label | string | `"grafana_notifier"` |  |
| sidecar.notifiers.labelValue | string | `""` |  |
| sidecar.notifiers.reloadURL | string | `"http://localhost:3000/api/admin/provisioning/notifications/reload"` |  |
| sidecar.notifiers.resource | string | `"both"` |  |
| sidecar.notifiers.resourceName | string | `""` |  |
| sidecar.notifiers.script | string | `nil` |  |
| sidecar.notifiers.searchNamespace | string | `nil` |  |
| sidecar.notifiers.sizeLimit | string | `""` |  |
| sidecar.notifiers.skipReload | bool | `false` |  |
| sidecar.notifiers.watchMethod | string | `"WATCH"` |  |
| sidecar.plugins.enabled | bool | `false` |  |
| sidecar.plugins.env | object | `{}` |  |
| sidecar.plugins.extraMounts | list | `[]` |  |
| sidecar.plugins.initPlugins | bool | `false` |  |
| sidecar.plugins.label | string | `"grafana_plugin"` |  |
| sidecar.plugins.labelValue | string | `""` |  |
| sidecar.plugins.reloadURL | string | `"http://localhost:3000/api/admin/provisioning/plugins/reload"` |  |
| sidecar.plugins.resource | string | `"both"` |  |
| sidecar.plugins.resourceName | string | `""` |  |
| sidecar.plugins.script | string | `nil` |  |
| sidecar.plugins.searchNamespace | string | `nil` |  |
| sidecar.plugins.sizeLimit | string | `""` |  |
| sidecar.plugins.skipReload | bool | `false` |  |
| sidecar.plugins.watchMethod | string | `"WATCH"` |  |
| sidecar.readinessProbe | object | `{}` |  |
| sidecar.resources | object | `{}` |  |
| sidecar.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| sidecar.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| sidecar.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| smtp.existingSecret | string | `""` |  |
| smtp.passwordKey | string | `"password"` |  |
| smtp.userKey | string | `"user"` |  |
| testFramework.containerSecurityContext | object | `{}` |  |
| testFramework.enabled | bool | `true` |  |
| testFramework.image.registry | string | `"docker.io"` | The Docker registry |
| testFramework.image.repository | string | `"bats/bats"` |  |
| testFramework.image.tag | string | `"1.13.0"` |  |
| testFramework.imagePullPolicy | string | `"IfNotPresent"` |  |
| testFramework.resources | object | `{}` |  |
| testFramework.securityContext | object | `{}` |  |
| tolerations | list | `[]` |  |
| topologySpreadConstraints | list | `[]` |  |
| useStatefulSet | bool | `false` |  |

### Example ingress with path

With grafana 6.3 and above

```yaml
grafana.ini:
  server:
    domain: monitoring.example.com
    root_url: "%(protocol)s://%(domain)s/grafana"
    serve_from_sub_path: true
ingress:
  enabled: true
  hosts:
    - "monitoring.example.com"
  path: "/grafana"
```

### Example of extraVolumeMounts and extraVolumes

Configure additional volumes with `extraVolumes` and volume mounts with `extraVolumeMounts`.

Example for `extraVolumeMounts` and corresponding `extraVolumes`:

```yaml
extraVolumeMounts:
  - name: plugins
    mountPath: /var/lib/grafana/plugins
    subPath: configs/grafana/plugins
    readOnly: false
  - name: dashboards
    mountPath: /var/lib/grafana/dashboards
    hostPath: /usr/shared/grafana/dashboards
    readOnly: false

extraVolumes:
  - name: plugins
    existingClaim: existing-grafana-claim
  - name: dashboards
    hostPath: /usr/shared/grafana/dashboards
```

Volumes default to `emptyDir`. Set to `persistentVolumeClaim`,
`hostPath`, `csi`, or `configMap` for other types. For a
`persistentVolumeClaim`, specify an existing claim name with
`existingClaim`.

## Import dashboards

There are a few methods to import dashboards to Grafana. Below are some examples and explanations as to how to use each method:

```yaml
dashboards:
  default:
    some-dashboard:
      json: |
        {
          "annotations":

          ...
          # Complete json file here
          ...

          "title": "Some Dashboard",
          "uid": "abcd1234",
          "version": 1
        }
    custom-dashboard:
      # This is a path to a file inside the dashboards directory inside the chart directory
      file: dashboards/custom-dashboard.json
    prometheus-stats:
      # Ref: https://grafana.com/dashboards/2
      gnetId: 2
      revision: 2
      datasource: Prometheus
    loki-dashboard-quick-search:
      gnetId: 12019
      revision: 2
      datasource:
      - name: DS_PROMETHEUS
        value: Prometheus
      - name: DS_LOKI
        value: Loki
    local-dashboard:
      url: https://github.com/cloudnative-pg/grafana-dashboards/blob/main/charts/cluster/grafana-dashboard.json
      # redirects to:
      # https://raw.githubusercontent.com/cloudnative-pg/grafana-dashboards/refs/heads/main/charts/cluster/grafana-dashboard.json

      # default: -skf
      # -s  - silent mode
      # -k  - allow insecure (eg: non-TLS) connections
      # -f  - fail fast
      # -L  - follow HTTP redirects
      curlOptions: -Lf
```

## BASE64 dashboards

Dashboards could be stored on a server that does not return JSON directly and instead of it returns a Base64 encoded file (e.g. Gerrit)
A new parameter has been added to the url use case so if you specify a b64content value equals to true after the url entry a Base64 decoding is applied before save the file to disk.
If this entry is not set or is equals to false not decoding is applied to the file before saving it to disk.

### Gerrit use case

Gerrit API for download files has the following schema: <https://yourgerritserver/a/{project-name}/branches/{branch-id}/files/{file-id}/content> where {project-name} and
{file-id} usually has '/' in their values and so they MUST be replaced by %2F so if project-name is user/repo, branch-id is master and file-id is equals to dir1/dir2/dashboard
the url value is <https://yourgerritserver/a/user%2Frepo/branches/master/files/dir1%2Fdir2%2Fdashboard/content>

## Sidecar for dashboards

If the parameter `sidecar.dashboards.enabled` is set, a sidecar container is deployed in the grafana
pod. This container watches all configmaps (or secrets) in the cluster and filters out the ones with
a label as defined in `sidecar.dashboards.label`. The files defined in those configmaps are written
to a folder and accessed by grafana. Changes to the configmaps are monitored and the imported
dashboards are deleted/updated.

A recommendation is to use one configmap per dashboard, as a reduction of multiple dashboards inside
one configmap is currently not properly mirrored in grafana.

Example dashboard config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-grafana-dashboard
  labels:
    grafana_dashboard: "1"
data:
  k8s-dashboard.json: |-
  [...]
```

## Sidecar for datasources

If the parameter `sidecar.datasources.enabled` is set, an init container is deployed in the grafana
pod. This container lists all secrets (or configmaps, though not recommended) in the cluster and
filters out the ones with a label as defined in `sidecar.datasources.label`. The files defined in
those secrets are written to a folder and accessed by grafana on startup. Using these yaml files,
the data sources in grafana can be imported.

Should you aim for reloading datasources in Grafana each time the config is changed, set `sidecar.datasources.skipReload: false` and adjust `sidecar.datasources.reloadURL` to `http://<svc-name>.<namespace>.svc.cluster.local/api/admin/provisioning/datasources/reload`.

Secrets are recommended over configmaps for this usecase because datasources usually contain private
data like usernames and passwords. Secrets are the more appropriate cluster resource to manage those.

Example values to add a postgres datasource as a kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-datasources
  labels:
    grafana_datasource: 'true' # default value for: sidecar.datasources.label
stringData:
  pg-db.yaml: |-
    apiVersion: 1
    datasources:
      - name: My pg db datasource
        type: postgres
        url: my-postgresql-db:5432
        user: db-readonly-user
        secureJsonData:
          password: 'SUperSEcretPa$$word'
        jsonData:
          database: my_datase
          sslmode: 'disable' # disable/require/verify-ca/verify-full
          maxOpenConns: 0 # Grafana v5.4+
          maxIdleConns: 2 # Grafana v5.4+
          connMaxLifetime: 14400 # Grafana v5.4+
          postgresVersion: 1000 # 903=9.3, 904=9.4, 905=9.5, 906=9.6, 1000=10
          timescaledb: false
        # <bool> allow users to edit datasources from the UI.
        editable: false
```

Example values to add a datasource adapted from [Grafana](http://docs.grafana.org/administration/provisioning/#example-datasource-config-file):

```yaml
datasources:
 datasources.yaml:
   apiVersion: 1
   datasources:
      # <string, required> name of the datasource. Required
    - name: Graphite
      # <string, required> datasource type. Required
      type: graphite
      # <string, required> access mode. proxy or direct (Server or Browser in the UI). Required
      access: proxy
      # <int> org id. will default to orgId 1 if not specified
      orgId: 1
      # <string> url
      url: http://localhost:8080
      # <string> database password, if used
      password:
      # <string> database user, if used
      user:
      # <string> database name, if used
      database:
      # <bool> enable/disable basic auth
      basicAuth:
      # <string> basic auth username
      basicAuthUser:
      # <string> basic auth password
      basicAuthPassword:
      # <bool> enable/disable with credentials headers
      withCredentials:
      # <bool> mark as default datasource. Max one per org
      isDefault:
      # <map> fields that will be converted to json and stored in json_data
      jsonData:
         graphiteVersion: "1.1"
         tlsAuth: true
         tlsAuthWithCACert: true
      # <string> json object of data that will be encrypted.
      secureJsonData:
        tlsCACert: "..."
        tlsClientCert: "..."
        tlsClientKey: "..."
      version: 1
      # <bool> allow users to edit datasources from the UI.
      editable: false
```

## Sidecar for notifiers

If the parameter `sidecar.notifiers.enabled` is set, an init container is deployed in the grafana
pod. This container lists all secrets (or configmaps, though not recommended) in the cluster and
filters out the ones with a label as defined in `sidecar.notifiers.label`. The files defined in
those secrets are written to a folder and accessed by grafana on startup. Using these yaml files,
the notification channels in grafana can be imported. The secrets must be created before
`helm install` so that the notifiers init container can list the secrets.

Secrets are recommended over configmaps for this usecase because alert notification channels usually contain
private data like SMTP usernames and passwords. Secrets are the more appropriate cluster resource to manage those.

Example datasource config adapted from [Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/#alert-notification-channels):

```yaml
notifiers:
  - name: notification-channel-1
    type: slack
    uid: notifier1
    # either
    org_id: 2
    # or
    org_name: Main Org.
    is_default: true
    send_reminder: true
    frequency: 1h
    disable_resolve_message: false
    # See `Supported Settings` section for settings supporter for each
    # alert notification type.
    settings:
      recipient: 'XXX'
      token: 'xoxb'
      uploadImage: true
      url: https://slack.com

delete_notifiers:
  - name: notification-channel-1
    uid: notifier1
    org_id: 2
  - name: notification-channel-2
    # default org_id: 1
```

## Sidecar for alerting resources

If the parameter `sidecar.alerts.enabled` is set, a sidecar container is deployed in the grafana
pod. This container watches all configmaps (or secrets) in the cluster (namespace defined by `sidecar.alerts.searchNamespace`) and filters out the ones with
a label as defined in `sidecar.alerts.label` (default is `grafana_alert`). The files defined in those configmaps are written
to a folder and accessed by grafana. Changes to the configmaps are monitored and the imported alerting resources are updated, however, deletions are a little more complicated (see below).

This sidecar can be used to provision alert rules, contact points, notification policies, notification templates and mute timings as shown in [Grafana Documentation](https://grafana.com/docs/grafana/next/alerting/set-up/provision-alerting-resources/file-provisioning/).

To fetch the alert config which will be provisioned, use the alert provisioning API ([Grafana Documentation](https://grafana.com/docs/grafana/next/developers/http_api/alerting_provisioning/)).
You can use either JSON or YAML format.

Example config for an alert rule:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-grafana-alert
  labels:
    grafana_alert: "1"
data:
  k8s-alert.yml: |-
    apiVersion: 1
    groups:
        - orgId: 1
          name: k8s-alert
          [...]
```

To delete provisioned alert rules is a two step process, you need to delete the configmap which defined the alert rule
and then create a configuration which deletes the alert rule.

Example deletion configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: delete-sample-grafana-alert
  namespace: monitoring
  labels:
    grafana_alert: "1"
data:
  delete-k8s-alert.yml: |-
    apiVersion: 1
    deleteRules:
      - orgId: 1
        uid: 16624780-6564-45dc-825c-8bded4ad92d3
```

## Statically provision alerting resources

If you don't need to change alerting resources (alert rules, contact points, notification policies and notification templates) regularly you could use the `alerting` config option instead of the sidecar option above.
This will grab the alerting config and apply it statically at build time for the helm file.

There are two methods to statically provision alerting configuration in Grafana. Below are some examples and explanations as to how to use each method:

```yaml
alerting:
  team1-alert-rules.yaml:
    file: alerting/team1/rules.yaml
  team2-alert-rules.yaml:
    file: alerting/team2/rules.yaml
  team3-alert-rules.yaml:
    file: alerting/team3/rules.yaml
  notification-policies.yaml:
    file: alerting/shared/notification-policies.yaml
  notification-templates.yaml:
    file: alerting/shared/notification-templates.yaml
  contactpoints.yaml:
    apiVersion: 1
    contactPoints:
      - orgId: 1
        name: Slack channel
        receivers:
          - uid: default-receiver
            type: slack
            settings:
              # Webhook URL to be filled in
              url: ""
              # We need to escape double curly braces for the tpl function.
              text: '{{ `{{ template "default.message" . }}` }}'
              title: '{{ `{{ template "default.title" . }}` }}'
```

The two possibilities for static alerting resource provisioning are:

* Inlining the file contents as shown for contact points in the above example.
* Importing a file using a relative path starting from the chart root directory as shown for the alert rules in the above example.

### Important notes on file provisioning

* The format of the files is defined in the [Grafana documentation](https://grafana.com/docs/grafana/next/alerting/set-up/provision-alerting-resources/file-provisioning/) on file provisioning.
* The chart supports importing YAML and JSON files.
* The filename must be unique, otherwise one volume mount will overwrite the other.
* Alerting configurations support Helm templating. Double curly braces that arise from the Grafana configuration format and are not intended as templates for the chart must be escaped.
* The number of total files under `alerting:` is not limited. Each file will end up as a volume mount in the corresponding provisioning folder of the deployed Grafana instance.
* The file size for each import is limited by what the function `.Files.Get` can handle, which suffices for most cases.

## How to serve Grafana with a path prefix (/grafana)

In order to serve Grafana with a prefix (e.g., <http://example.com/grafana>), add the following to your values.yaml.

```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    nginx.ingress.kubernetes.io/use-regex: "true"

  path: /grafana/?(.*)
  hosts:
    - k8s.example.dev

grafana.ini:
  server:
    root_url: http://localhost:3000/grafana # this host can be localhost
```

## How to securely reference secrets in grafana.ini

This example uses Grafana [file providers](https://grafana.com/docs/grafana/latest/administration/configuration/#file-provider) for secret values and the `extraSecretMounts` configuration flag (Additional grafana server secret mounts) to mount the secrets.

In grafana.ini:

```yaml
grafana.ini:
  [auth.generic_oauth]
  enabled = true
  client_id = $__file{/etc/secrets/auth_generic_oauth/client_id}
  client_secret = $__file{/etc/secrets/auth_generic_oauth/client_secret}
```

Existing secret, or created along with helm:

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-generic-oauth-secret
type: Opaque
stringData:
  client_id: <value>
  client_secret: <value>
```

Include in the `extraSecretMounts` configuration flag:

```yaml
extraSecretMounts:
  - name: auth-generic-oauth-secret-mount
    secretName: auth-generic-oauth-secret
    defaultMode: 0440
    mountPath: /etc/secrets/auth_generic_oauth
    readOnly: true
```

### extraSecretMounts using a Container Storage Interface (CSI) provider

This example uses a CSI driver e.g. retrieving secrets using [Azure Key Vault Provider](https://github.com/Azure/secrets-store-csi-driver-provider-azure)

```yaml
extraSecretMounts:
  - name: secrets-store-inline
    mountPath: /run/secrets
    readOnly: true
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "my-provider"
      nodePublishSecretRef:
        name: akv-creds
```

## Image Renderer Plug-In

This chart supports enabling [remote image rendering](https://github.com/grafana/grafana-image-renderer/blob/master/README.md#run-in-docker)

```yaml
imageRenderer:
  enabled: true
```

### Image Renderer NetworkPolicy

By default the image-renderer pods will have a network policy which only allows ingress traffic from the created grafana instance

### High Availability for unified alerting

If you want to run Grafana in a high availability cluster you need to enable
the headless service by setting `headlessService: true` in your `values.yaml`
file.

As next step you have to setup the `grafana.ini` in your `values.yaml` in a way
that it will make use of the headless service to obtain all the IPs of the
cluster. For example, use ``{{ .Release.Name }}`` to refer to the Helm release name in your values.

```yaml
grafana.ini:
  ...
  unified_alerting:
    enabled: true
    ha_peers: {{ .Release.Name }}-headless:9094
    ha_listen_address: ${POD_IP}:9094
    ha_advertise_address: ${POD_IP}:9094
    rule_version_record_limit: "5"

  alerting:
    enabled: false
```

### Installing plugins
For installing plugins please see the [official documentation](https://grafana.com/docs/grafana/latest/administration/plugin-management/#install-plugins-using-the-grafana-helm-chart).
