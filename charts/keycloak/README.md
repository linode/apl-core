# Keycloak-X

[Keycloak-X](http://www.keycloak.org/) is an open source identity and access management for modern applications and services.

Note that this chart is the logical successor of the Wildfly based [codecentric/keycloak](https://github.com/codecentric/helm-charts/tree/master/charts/keycloak) chart.

## TL;DR;

```console
$ cat << EOF > values.yaml
command:
  - "/opt/keycloak/bin/kc.sh"
  - "start"
  - "--http-port=8080"
  - "--hostname-strict=false"
extraEnv: |
  - name: KEYCLOAK_ADMIN
    value: admin
  - name: KEYCLOAK_ADMIN_PASSWORD
    value: admin
  - name: JAVA_OPTS_APPEND
    value: >-
      -Djgroups.dns.query={{ include "keycloak.fullname" . }}-headless
EOF

$ helm install keycloak codecentric/keycloakx --values ./values.yaml
```
Note that the default configuration is not suitable for production since it uses a h2 file database by default.
It is strongly recommended to use a dedicated database with Keycloak.

For more examples see the [examples](./examples) folder.

## Introduction

This chart bootstraps a [Keycloak](http://www.keycloak.org/) StatefulSet on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.
It provisions a fully featured Keycloak installation.
For more information on Keycloak and its capabilities, see its [documentation](http://www.keycloak.org/documentation.html).

## Installing the Chart

To install the chart with the release name `keycloakx`:

```console
$ helm install keycloak codecentric/keycloakx
```

or via GitHub Container Registry:

```console
$ helm install keycloak oci://ghcr.io/codecentric/helm-charts/keycloakx --version <version>
```

## Uninstalling the Chart

To uninstall the `keycloakx` deployment:

```console
$ helm uninstall keycloakx
```

## Configuration

The following table lists the configurable parameters of the Keycloak-X chart and their default values.

| Parameter                                     | Description                                                                                                                                                                                                                                                                       | Default                                                                                                                                                                                 |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fullnameOverride`                            | Optionally override the fully qualified name                                                                                                                                                                                                                                      | `""`                                                                                                                                                                                    |
| `nameOverride`                                | Optionally override the name                                                                                                                                                                                                                                                      | `""`                                                                                                                                                                                    |
| `replicas`                                    | The number of replicas to create                                                                                                                                                                                                                                                  | `1`                                                                                                                                                                                     |
| `image.repository`                            | The Keycloak image repository                                                                                                                                                                                                                                                     | `quay.io/keycloak/keycloak`                                                                                                                                                             |
| `image.tag`                                   | Overrides the Keycloak image tag whose default is the chart version                                                                                                                                                                                                               | `""`                                                                                                                                                                                    |
| `image.digest`                                | Overrides the Keycloak image tag with a digest                                                                                                                                                                                                                                    | `""`                                                                                                                                                                                    |
| `image.pullPolicy`                            | The Keycloak image pull policy                                                                                                                                                                                                                                                    | `IfNotPresent`                                                                                                                                                                          |
| `imagePullSecrets`                            | Image pull secrets for the Pod                                                                                                                                                                                                                                                    | `[]`                                                                                                                                                                                    |
| `hostAliases`                                 | Mapping between IPs and hostnames that will be injected as entries in the Pod's hosts files                                                                                                                                                                                       | `[]`                                                                                                                                                                                    |
| `enableServiceLinks`                          | Indicates whether information about services should be injected into Pod's environment variables, matching the syntax of Docker links                                                                                                                                             | `true`                                                                                                                                                                                  |
| `updateStrategy`                              | StatefulSet update strategy. One of `RollingUpdate` or `OnDelete`                                                                                                                                                                                                                 | `RollingUpdate`                                                                                                                                                                         |
| `podManagementPolicy`                         | Pod management policy. One of `Parallel` or `OrderedReady`                                                                                                                                                                                                                        | `OrderedReady`                                                                                                                                                                          |
| `restartPolicy`                               | Pod restart policy. One of `Always`, `OnFailure`, or `Never`                                                                                                                                                                                                                      | `Always`                                                                                                                                                                                |
| `serviceAccount.create`                       | Specifies whether a ServiceAccount should be created                                                                                                                                                                                                                              | `true`                                                                                                                                                                                  |
| `serviceAccount.allowReadPods`                | Specifies whether the ServiceAccount can get or list pods                                                                                                                                                                                                                         | `false`                                                                                                                                                                                 |
| `serviceAccount.name`                         | The name of the service account to use. If not set and create is true, a name is generated using the fullname template                                                                                                                                                            | `""`                                                                                                                                                                                    |
| `serviceAccount.annotations`                  | Additional annotations for the ServiceAccount                                                                                                                                                                                                                                     | `{}`                                                                                                                                                                                    |
| `serviceAccount.labels`                       | Additional labels for the ServiceAccount                                                                                                                                                                                                                                          | `{}`                                                                                                                                                                                    |
| `serviceAccount.imagePullSecrets`             | Image pull secrets that are attached to the ServiceAccount                                                                                                                                                                                                                        | `[]`                                                                                                                                                                                    |
| `serviceAccount.automountServiceAccountToken` | Automount API credentials for the Service Account                                                                                                                                                                                                                                 | `true`                                                                                                                                                                                  |
| `rbac.create`                                 | Specifies whether RBAC resources are to be created                                                                                                                                                                                                                                | `false`                                                                                                                                                                                 |
| `rbac.rules`                                  | Custom RBAC rules, e. g. for KUBE_PING                                                                                                                                                                                                                                            | `[]`                                                                                                                                                                                    |
| `podSecurityContext`                          | SecurityContext for the entire Pod. Every container running in the Pod will inherit this SecurityContext. This might be relevant when other components of the environment inject additional containers into running Pods (service meshes are the most prominent example for this) | `{"fsGroup":1000}`                                                                                                                                                                      |
| `securityContext`                             | SecurityContext for the Keycloak container                                                                                                                                                                                                                                        | `{"runAsNonRoot":true,"runAsUser":1000}`                                                                                                                                                |
| `extraInitContainers`                         | Additional init containers, e. g. for providing custom themes                                                                                                                                                                                                                     | `[]`                                                                                                                                                                                    |
| `skipInitContainers`                          | Skip all init containers (to avoid issues with service meshes which require sidecar proxies for connectivity)                                                                                                                                                                     | `false`                                                                                                                                                                                 |
| `extraContainers`                             | Additional sidecar containers, e. g. for a database proxy, such as Google's cloudsql-proxy                                                                                                                                                                                        | `[]`                                                                                                                                                                                    |
| `lifecycleHooks`                              | Lifecycle hooks for the Keycloak container                                                                                                                                                                                                                                        | `{}`                                                                                                                                                                                    |
| `terminationGracePeriodSeconds`               | Termination grace period in seconds for Keycloak shutdown. Clusters with a large cache might need to extend this to give Infinispan more time to rebalance                                                                                                                        | `60`                                                                                                                                                                                    |
| `clusterDomain`                               | The internal Kubernetes cluster domain                                                                                                                                                                                                                                            | `cluster.local`                                                                                                                                                                         |
| `command`                                     | Overrides the default entrypoint of the Keycloak container                                                                                                                                                                                                                        | `[]`                                                                                                                                                                                    |
| `args`                                        | Overrides the default args for the Keycloak container                                                                                                                                                                                                                             | `[]`                                                                                                                                                                                    |
| `extraEnv`                                    | Additional environment variables for Keycloak                                                                                                                                                                                                                                     | `""`                                                                                                                                                                                    |
| `extraEnvFrom`                                | Additional environment variables for Keycloak mapped from a Secret or ConfigMap                                                                                                                                                                                                   | `""`                                                                                                                                                                                    |
| `priorityClassName`                           | Pod priority class name                                                                                                                                                                                                                                                           | `""`                                                                                                                                                                                    |
| `affinity`                                    | Pod affinity                                                                                                                                                                                                                                                                      | Hard node and soft zone anti-affinity                                                                                                                                                   |
| `topologySpreadConstraints`                   | Topology spread constraints                                                                                                                                                                                                                                                       | Constraints used to spread pods                                                                                                                                                         |
| `nodeSelector`                                | Node labels for Pod assignment                                                                                                                                                                                                                                                    | `{}`                                                                                                                                                                                    |
| `tolerations`                                 | Node taints to tolerate                                                                                                                                                                                                                                                           | `[]`                                                                                                                                                                                    |
| `podLabels`                                   | Additional Pod labels                                                                                                                                                                                                                                                             | `{}`                                                                                                                                                                                    |
| `podAnnotations`                              | Additional Pod annotations                                                                                                                                                                                                                                                        | `{}`                                                                                                                                                                                    |
| `livenessProbe`                               | Liveness probe configuration                                                                                                                                                                                                                                                      | `{"httpGet":{"path":"{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/health/live","port":"http-internal","scheme":"HTTP"},"initialDelaySeconds":0,"timeoutSeconds":5}`        |
| `readinessProbe`                              | Readiness probe configuration                                                                                                                                                                                                                                                     | `{"httpGet":{"path":"{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/health/ready","port":"http-internal","scheme":"HTTP"},"initialDelaySeconds":10,"timeoutSeconds":1}`      |
| `startupProbe`                                | Startup probe configuration                                                                                                                                                                                                                                                       | `{"httpGet":{"path":"{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/health","port":"http-internal","scheme":"HTTP"},"initialDelaySeconds":15,"timeoutSeconds":1,"failureThreshold":60,"periodSeconds":5}` |
| `resources`                                   | Pod resource requests and limits                                                                                                                                                                                                                                                  | `{}`                                                                                                                                                                                    |
| `extraVolumes`                                | Add additional volumes, e. g. for custom themes                                                                                                                                                                                                                                   | `""`                                                                                                                                                                                    |
| `volumeClaimTemplates`                        | Add volume claim templates to the StatefulSet, e. g. for dynamic provisioning                                                                                                                                                                                                     | `""`                                                                                                                                                                                    |
| `extraVolumeMounts`                           | Add additional volumes mounts, e. g. for custom themes                                                                                                                                                                                                                            | `""`                                                                                                                                                                                    |
| `extraPorts`                                  | Add additional ports, e. g. for admin console or exposing JGroups ports                                                                                                                                                                                                           | `[]`                                                                                                                                                                                    |
| `podDisruptionBudget`                         | Pod disruption budget                                                                                                                                                                                                                                                             | `{}`                                                                                                                                                                                    |
| `statefulsetAnnotations`                      | Annotations for the StatefulSet                                                                                                                                                                                                                                                   | `{}`                                                                                                                                                                                    |
| `statefulsetLabels`                           | Additional labels for the StatefulSet                                                                                                                                                                                                                                             | `{}`                                                                                                                                                                                    |
| `secrets`                                     | Configuration for secrets that should be created                                                                                                                                                                                                                                  | `{}`                                                                                                                                                                                    |
| `service.annotations`                         | Annotations for HTTP service                                                                                                                                                                                                                                                      | `{}`                                                                                                                                                                                    |
| `service.labels`                              | Additional labels for headless and HTTP Services                                                                                                                                                                                                                                  | `{}`                                                                                                                                                                                    |
| `service.type`                                | The Service type                                                                                                                                                                                                                                                                  | `ClusterIP`                                                                                                                                                                             |
| `service.loadBalancerIP`                      | Optional IP for the load balancer. Used for services of type LoadBalancer only                                                                                                                                                                                                    | `""`                                                                                                                                                                                    |
| `loadBalancerSourceRanges`                    | Optional List of allowed source ranges (CIDRs). Used for service of type LoadBalancer only                                                                                                                                                                                        | `[]`                                                                                                                                                                                    |
| `service.externalTrafficPolicy`               | Optional external traffic policy. Used for services of type LoadBalancer only                                                                                                                                                                                                     | `"Cluster"`                                                                                                                                                                             |
| `service.httpPort`                            | The http Service port                                                                                                                                                                                                                                                             | `80`                                                                                                                                                                                    |
| `service.httpNodePort`                        | The HTTP Service node port if type is NodePort                                                                                                                                                                                                                                    | `""`                                                                                                                                                                                    |
| `service.httpsPort`                           | The HTTPS Service port                                                                                                                                                                                                                                                            | `8443`                                                                                                                                                                                  |
| `service.httpsNodePort`                       | The HTTPS Service node port if type is NodePort                                                                                                                                                                                                                                   | `""`                                                                                                                                                                                    |
| `service.extraPorts`                          | Additional Service ports, e. g. for custom admin console                                                                                                                                                                                                                          | `[]`                                                                                                                                                                                    |
| `service.sessionAffinity`                     | sessionAffinity for Service, e. g. "ClientIP"                                                                                                                                                                                                                                     | `""`                                                                                                                                                                                    |
| `service.sessionAffinityConfig`               | sessionAffinityConfig for Service                                                                                                                                                                                                                                                 | `{}`                                                                                                                                                                                    |
| `serviceHeadless.annotations`                 | Annotations for headless service                                                                                                                                                                                                                                                  | `{}`                                                                                                                                                                                    |
| `serviceHeadless.extraPorts`                  | Add additional ports to the headless service, e. g. for admin console or exposing JGroups ports                                                                                                                                                                                   | `[]`                                                                                                                                                                                    |
| `ingress.enabled`                             | If `true`, an Ingress is created                                                                                                                                                                                                                                                  | `false`                                                                                                                                                                                 |
| `ingress.rules`                               | List of Ingress Ingress rule                                                                                                                                                                                                                                                      | see below                                                                                                                                                                               |
| `ingress.rules[0].host`                       | Host for the Ingress rule                                                                                                                                                                                                                                                         | `{{ .Release.Name }}.keycloak.example.com`                                                                                                                                              |
| `ingress.rules[0].paths`                      | Paths for the Ingress rule                                                                                                                                                                                                                                                        | see below                                                                                                                                                                               |
| `ingress.rules[0].paths[0].path`              | Path for the Ingress rule                                                                                                                                                                                                                                                         | `/`                                                                                                                                                                                     |
| `ingress.rules[0].paths[0].pathType`          | Path Type for the Ingress rule                                                                                                                                                                                                                                                    | `Prefix`                                                                                                                                                                                |
| `ingress.servicePort`                         | The Service port targeted by the Ingress                                                                                                                                                                                                                                          | `http`                                                                                                                                                                                  |
| `ingress.annotations`                         | Ingress annotations                                                                                                                                                                                                                                                               | `{}`                                                                                                                                                                                    |
| `ingress.ingressClassName`                    | The name of the Ingress Class associated with the ingress                                                                                                                                                                                                                         | `""`                                                                                                                                                                                    |
| `ingress.labels`                              | Additional Ingress labels                                                                                                                                                                                                                                                         | `{}`                                                                                                                                                                                    |
| `ingress.tls`                                 | TLS configuration                                                                                                                                                                                                                                                                 | see below                                                                                                                                                                               |
| `ingress.tls[0].hosts`                        | List of TLS hosts                                                                                                                                                                                                                                                                 | `[keycloak.example.com]`                                                                                                                                                                |
| `ingress.tls[0].secretName`                   | Name of the TLS secret                                                                                                                                                                                                                                                            | `""`                                                                                                                                                                                    |
| `ingress.console.enabled`                     | If `true`, an Ingress for the console is created                                                                                                                                                                                                                                  | `false`                                                                                                                                                                                 |
| `ingress.console.rules`                       | List of Ingress Ingress rule for the console                                                                                                                                                                                                                                      | see below                                                                                                                                                                               |
| `ingress.console.rules[0].host`               | Host for the Ingress rule for the console                                                                                                                                                                                                                                         | `{{ .Release.Name }}.keycloak.example.com`                                                                                                                                              |
| `ingress.console.rules[0].paths`              | Paths for the Ingress rule for the console                                                                                                                                                                                                                                        | see below                                                                                                                                                                               |
| `ingress.console.rules[0].paths[0].path`      | Path for the Ingress rule for the console                                                                                                                                                                                                                                         | `[{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/admin]`                                                                                                                       |
| `ingress.console.rules[0].paths[0].pathType`  | Path Type for the Ingress rule for the console                                                                                                                                                                                                                                    | `Prefix`                                                                                                                                                                                |
| `ingress.console.annotations`                 | Ingress annotations for the console                                                                                                                                                                                                                                               | `{}`                                                                                                                                                                                    |
| `ingress.console.ingressClassName`            | The name of the Ingress Class associated with the console ingress                                                                                                                                                                                                                 | `""`                                                                                                                                                                                    |
| `ingress.console.tls`                         | TLS configuration                                                                                                                                                                                                                                                                 | see below                                                                                                                                                                               |
| `ingress.console.tls[0].hosts`                | List of TLS hosts                                                                                                                                                                                                                                                                 | `[keycloak.example.com]`                                                                                                                                                                |
| `ingress.console.tls[0].secretName`           | Name of the TLS secret                                                                                                                                                                                                                                                            | `""`                                                                                                                                                                                    |
| `networkPolicy.enabled`                       | If true, the ingress network policy is deployed                                                                                                                                                                                                                                   | `false`                                                                                                                                                                                 |
| `networkPolicy.extraFrom`                     | Allows to define allowed external ingress traffic (see Kubernetes doc for network policy `from` format)                                                                                                                                                                           | `[]`                                                                                                                                                                                    |
| `networkPolicy.egress`                        | Allows to define allowed egress from Keycloak pods (see Kubernetes doc for network policy `egress` format)                                                                                                                                                                        | `[]`                                                                                                                                                                                    |
| `route.enabled`                               | If `true`, an OpenShift Route is created                                                                                                                                                                                                                                          | `false`                                                                                                                                                                                 |
| `route.path`                                  | Path for the Route                                                                                                                                                                                                                                                                | `/`                                                                                                                                                                                     |
| `route.annotations`                           | Route annotations                                                                                                                                                                                                                                                                 | `{}`                                                                                                                                                                                    |
| `route.labels`                                | Additional Route labels                                                                                                                                                                                                                                                           | `{}`                                                                                                                                                                                    |
| `route.host`                                  | Host name for the Route                                                                                                                                                                                                                                                           | `""`                                                                                                                                                                                    |
| `route.tls.enabled`                           | If `true`, TLS is enabled for the Route                                                                                                                                                                                                                                           | `true`                                                                                                                                                                                  |
| `route.tls.insecureEdgeTerminationPolicy`     | Insecure edge termination policy of the Route. Can be `None`, `Redirect`, or `Allow`                                                                                                                                                                                              | `Redirect`                                                                                                                                                                              |
| `route.tls.termination`                       | TLS termination of the route. Can be `edge`, `passthrough`, or `reencrypt`                                                                                                                                                                                                        | `edge`                                                                                                                                                                                  |
| `dbchecker.enabled`                           | Enable database readiness check                                                                                                                                                                                                                                                   | `false`                                                                                                                                                                                 |
| `dbchecker.image.repository`                  | Docker image used to check database readiness at startup                                                                                                                                                                                                                          | `docker.io/busybox`                                                                                                                                                                     |
| `dbchecker.image.tag`                         | Image tag for the dbchecker image                                                                                                                                                                                                                                                 | `1.32`                                                                                                                                                                                  |
| `dbchecker.image.pullPolicy`                  | Image pull policy for the dbchecker image                                                                                                                                                                                                                                         | `IfNotPresent`                                                                                                                                                                          |
| `dbchecker.securityContext`                   | SecurityContext for the dbchecker container                                                                                                                                                                                                                                       | `{"allowPrivilegeEscalation":false,"runAsGroup":1000,"runAsNonRoot":true,"runAsUser":1000}`                                                                                             |
| `dbchecker.resources`                         | Resource requests and limits for the dbchecker container                                                                                                                                                                                                                          | `{"limits":{"cpu":"20m","memory":"32Mi"},"requests":{"cpu":"20m","memory":"32Mi"}}`                                                                                                     |
| `database.vendor`                             | Database vendor                                                                                                                                                                                                                                                                   | unset                                                                                                                                                                                   |
| `database.hostname`                           | Database Hostname                                                                                                                                                                                                                                                                 | unset                                                                                                                                                                                   |
| `database.port`                               | Database Port                                                                                                                                                                                                                                                                     | unset                                                                                                                                                                                   |
| `database.username`                           | Database User                                                                                                                                                                                                                                                                     | unset                                                                                                                                                                                   |
| `database.password`                           | Database Password                                                                                                                                                                                                                                                                 | unset                                                                                                                                                                                   |
| `database.database`                           | Database                                                                                                                                                                                                                                                                          | unset                                                                                                                                                                                   |
| `database.existingSecret`                     | Existing Secret containing database password (expects key `password`)                                                                                                                                                                                                             | `""`                                                                                                                                                                                    |
| `database.existingSecretKey`                  | Key in existing Secret containing database password                                                                                                                                                                                                                               | `""`             
| `cache.stack`                                 | Cache / Cluster Discovery, use `custom` to disable automatic configuration.                                                                                                                                                                                                       | `default`                                                                                                                                                                               |
| `proxy.enabled`                               | If `true`, the `KC_PROXY` env variable will be set to the configured mode                                                                                                                                                                                                         | `true`                                                                                                                                                                                  |
| `proxy.mode`                                  | The configured proxy mode                                                                                                                                                                                                                                                         | `forwarded`                                                                                                                                                                             |
| `proxy.http.enabled`                          | If `true`, HTTP forwarding is enabled                                                                                                                                                                                                                                             | `true`                                                                                                                                                                                  |
| `http.relativePath`                           | The relative http path (context-path)                                                                                                                                                                                                                                             | `/auth`                                                                                                                                                                                 |
| `http.internalPort`                           | The port of the internal management interface                                                                                                                                                                                                                                     | `http-internal`                                                                                                                                                                         |
| `http.internalScheme`                         | The scheme of the internal management interface                                                                                                                                                                                                                                   | `HTTP`                                                                                                                                                                                  |
| `metrics.enabled`                             | If `true` then the metrics endpoint is exposed                                                                                                                                                                                                                                    | `true`                                                                                                                                                                                  |
| `health.enabled`                              | If `true` then the health endpoint is exposed. If the `readinessProbe` is is needed `metrics.enable` must be `true`.                                                                                                                                                              | `true`                                                                                                                                                                                  |
| `serviceMonitor.enabled`                      | If `true`, a ServiceMonitor resource for the prometheus-operator is created                                                                                                                                                                                                       | `false`                                                                                                                                                                                 |
| `serviceMonitor.namespace`                    | Optionally sets a target namespace in which to deploy the ServiceMonitor resource                                                                                                                                                                                                 | `""`                                                                                                                                                                                    |
| `serviceMonitor.namespaceSelector`            | Optionally sets a namespace selector for the ServiceMonitor                                                                                                                                                                                                                       | `{}`                                                                                                                                                                                    |
| `serviceMonitor.annotations`                  | Annotations for the ServiceMonitor                                                                                                                                                                                                                                                | `{}`                                                                                                                                                                                    |
| `serviceMonitor.labels`                       | Additional labels for the ServiceMonitor                                                                                                                                                                                                                                          | `{}`                                                                                                                                                                                    |
| `serviceMonitor.interval`                     | Interval at which Prometheus scrapes metrics                                                                                                                                                                                                                                      | `10s`                                                                                                                                                                                   |
| `serviceMonitor.scrapeTimeout`                | Timeout for scraping                                                                                                                                                                                                                                                              | `10s`                                                                                                                                                                                   |
| `serviceMonitor.relabelings`                  | Relabelings for the  Servicemonitor                                                                                                                                                                                                                                               | `[]`                                                                                                                                                                                    |
| `serviceMonitor.metricRelabelings`            | metricRelabelings for the  Servicemonitor                                                                                                                                                                                                                                         | `[]`                                                                                                                                                                                    |
| `serviceMonitor.path`                         | The path at which metrics are served                                                                                                                                                                                                                                              | `{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/metrics`                                                                                                                       |
| `serviceMonitor.port`                         | The Service port at which metrics are served                                                                                                                                                                                                                                      | `http-internal`                                                                                                                                                                         |
| `serviceMonitor.tlsConfig`                    | TLS configuration for the ServiceMonitor, set CA certificates or `insecureSkipVerify` if Keycloak uses https                                                                                                                                                                      | `{}`                                                                                                                                                                                    |
| `extraServiceMonitor.enabled`                 | If `true`, an additional ServiceMonitor resource for the prometheus-operator is created. Could be used for additional metrics via [Keycloak Metrics SPI](https://github.com/aerogear/keycloak-metrics-spi)                                                                        | `false`                                                                                                                                                                                 |
| `extraServiceMonitor.namespace`               | Optionally sets a target namespace in which to deploy the additional ServiceMonitor resource                                                                                                                                                                                      | `""`                                                                                                                                                                                    |
| `extraServiceMonitor.namespaceSelector`       | Optionally sets a namespace selector for the additional ServiceMonitor                                                                                                                                                                                                            | `{}`                                                                                                                                                                                    |
| `extraServiceMonitor.annotations`             | Annotations for the additional ServiceMonitor                                                                                                                                                                                                                                     | `{}`                                                                                                                                                                                    |
| `extraServiceMonitor.labels`                  | Additional labels for the additional ServiceMonitor                                                                                                                                                                                                                               | `{}`                                                                                                                                                                                    |
| `extraServiceMonitor.interval`                | Interval at which Prometheus scrapes metrics                                                                                                                                                                                                                                      | `10s`                                                                                                                                                                                   |
| `extraServiceMonitor.scrapeTimeout`           | Timeout for scraping                                                                                                                                                                                                                                                              | `10s`                                                                                                                                                                                   |
| `extraServiceMonitor.relabelings`             | Relabelings for the additional ServiceMonitor                                                                                                                                                                                                                                     | `[]`                                                                                                                                                                                    |
| `extraServiceMonitor.metricRelabelings`       | metricRelabelings for the additional ServiceMonitor                                                                                                                                                                                                                               | `[]`                                                                                                                                                                                    |
| `extraServiceMonitor.path`                    | The path at which metrics are served                                                                                                                                                                                                                                              | `{{ tpl .Values.http.relativePath $ \| trimSuffix "/" }}/metrics`                                                                                                                       |
| `extraServiceMonitor.port`                    | The Service port at which metrics are served                                                                                                                                                                                                                                      | `http-internal`                                                                                                                                                                         |
| `prometheusRule.enabled`                      | If `true`, a PrometheusRule resource for the prometheus-operator is created                                                                                                                                                                                                       | `false`                                                                                                                                                                                 |
| `prometheusRule.namespace`                    | Optionally sets a target namespace in which to deploy the PrometheusRule resource                                                                                                                                                                                                 | `""`                                                                                                                                                                                    |
| `prometheusRule.annotations`                  | Annotations for the PrometheusRule                                                                                                                                                                                                                                                | `{}`                                                                                                                                                                                    |
| `prometheusRule.labels`                       | Additional labels for the PrometheusRule                                                                                                                                                                                                                                          | `{}`                                                                                                                                                                                    |
| `prometheusRule.rules`                        | List of rules for Prometheus                                                                                                                                                                                                                                                      | `[]`                                                                                                                                                                                    |
| `autoscaling.enabled`                         | Enable creation of a HorizontalPodAutoscaler resource                                                                                                                                                                                                                             | `false`                                                                                                                                                                                 |
| `autoscaling.labels`                          | Additional labels for the HorizontalPodAutoscaler resource                                                                                                                                                                                                                        | `{}`                                                                                                                                                                                    |
| `autoscaling.minReplicas`                     | The minimum number of Pods when autoscaling is enabled                                                                                                                                                                                                                            | `3`                                                                                                                                                                                     |
| `autoscaling.maxReplicas`                     | The maximum number of Pods when autoscaling is enabled                                                                                                                                                                                                                            | `10`                                                                                                                                                                                    |
| `autoscaling.metrics`                         | The metrics configuration for the HorizontalPodAutoscaler                                                                                                                                                                                                                         | `[{"resource":{"name":"cpu","target":{"averageUtilization":80,"type":"Utilization"}},"type":"Resource"}]`                                                                               |
| `autoscaling.behavior`                        | The scaling policy configuration for the HorizontalPodAutoscaler                                                                                                                                                                                                                  | `{"scaleDown":{"policies":[{"periodSeconds":300,"type":"Pods","value":1}],"stabilizationWindowSeconds":300}`                                                                            |
| `test.enabled`                                | If `true`, test resources are created                                                                                                                                                                                                                                             | `false`                                                                                                                                                                                 |
| `test.image.repository`                       | The image for the test Pod                                                                                                                                                                                                                                                        | `docker.io/seleniarm/standalone-chromium`                                                                                                                                               |
| `test.image.tag`                              | The tag for the test Pod image                                                                                                                                                                                                                                                    | `117.0`                                                                                                                                                                                 |
| `test.image.pullPolicy`                       | The image pull policy for the test Pod image                                                                                                                                                                                                                                      | `IfNotPresent`                                                                                                                                                                          |
| `test.podSecurityContext`                     | SecurityContext for the entire test Pod                                                                                                                                                                                                                                           | `{"fsGroup":1000}`                                                                                                                                                                      |
| `test.securityContext`                        | SecurityContext for the test container                                                                                                                                                                                                                                            | `{"runAsNonRoot":true,"runAsUser":1000}`                                                                                                                                                |
| `test.deletionPolicy`                         | `helm.sh/hook-delete-policy` for the test Pod                                                                                                                                                                                                                                     | `before-hook-creation`                                                                                                                                                                  | | `before-hook-creation`                                                                                                                                                                  |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example:

```console
$ helm install keycloak codecentric/keycloakx -n keycloak --set replicas=1
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while
installing the chart. For example:

```console
$ helm install keycloak codecentric/keycloakx -n keycloak --values values.yaml
```

The chart offers great flexibility.
It can be configured to work with the official Keycloak-X Docker image but any custom image can be used as well.

For the official Docker image, please check it's configuration at https://github.com/keycloak/keycloak/tree/main/quarkus/container.

### Usage of the `tpl` Function

The `tpl` function allows us to pass string values from `values.yaml` through the templating engine.
It is used for the following values:

* `extraInitContainers`
* `extraContainers`
* `extraEnv`
* `extraEnvFrom`
* `affinity`
* `extraVolumeMounts`
* `extraVolumes`
* `livenessProbe`
* `readinessProbe`
* `startupProbe`
* `topologySpreadConstraints`

Additionally, custom labels and annotations can be set on various resources the values of which being passed through `tpl` as well.

It is important that these values be configured as strings.
Otherwise, installation will fail.
See example for Google Cloud Proxy or default affinity configuration in `values.yaml`.

### JVM Settings

Keycloak sets the following system properties by default:
`-Xms64m -Xmx512m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m`

You can override these by setting the `JAVA_OPTS` environment variable.
Make sure you configure container support.
This allows you to only configure memory using Kubernetes resources and the JVM will automatically adapt.

```yaml
extraEnv: |
  - name: JAVA_OPTS
    value: >-
      -XX:MaxRAMPercentage=50.0
```

Alternatively one can append custom JVM options by setting the `JAVA_OPTS_APPEND` environment variable.

The parameter `-Djava.net.preferIPv4Stack=true` is [optional](https://github.com/keycloak/keycloak/commit/ee205c8fbc1846f679bd604fa8d25310c117c87e) for [Keycloak >= v22](https://www.keycloak.org/server/configuration-production#_configure_keycloak_server_with_ipv4_or_ipv6).

The parameter `-XX:+UseContainerSupport` is no longer required for [Keycloak >= v21 based on JDK v17](https://github.com/keycloak/keycloak/blob/release/21.0/quarkus/container/Dockerfile#L20).

The parameter `-Djava.awt.headless=true` is no longer required for Quarkus based Keycloak as it is set by [default](https://quarkus.io/guides/building-native-image).

#### Using an External Database

The Keycloak Docker image supports various database types.
Configuration happens in a generic manner.

##### Using a Secret Managed by the Chart

The following examples uses a PostgreSQL database with a secret that is managed by the Helm chart.

```yaml
dbchecker:
  enabled: true

database:
  vendor: postgres
  hostname: mypostgres
  port: 5432
  username: '{{ .Values.dbUser }}'
  password: '{{ .Values.dbPassword }}'
  database: mydb
```

`dbUser` and `dbPassword` are custom values you'd then specify on the commandline using `--set-string`.

##### Using an Existing Secret

The following examples uses a PostgreSQL database with an existing secret.

```yaml
dbchecker:
  enabled: true

database:
  vendor: postgres
  hostname: mypostgres
  port: 5432
  database: mydb
  username: db-user
  existingSecret: byo-db-creds # Password is retrieved via .password
```

### Creating a Keycloak Admin User

The Keycloak-X Docker image supports creating an initial admin user.
It must be configured via environment variables:

* `KEYCLOAK_ADMIN`
* `KEYCLOAK_ADMIN_PASSWORD`

This can be done like so in the `values.yaml`, where the `KEYCLOAK_ADMIN` is an insecure example with the value in plaintext.
The `KEYCLOAK_ADMIN_PASSWORD` is referenced from already existing secret but for testing it can be set with `value` too.
```yaml
extraEnv: |
  - name: KEYCLOAK_ADMIN
    value: admin
  - name: KEYCLOAK_ADMIN_PASSWORD
    valueFrom:
      secretKeyRef:
        name: keycloak-admin-password
        key: password
```

### High Availability and Clustering

For high availability, Keycloak must be run with multiple replicas (`replicas > 1`).
The chart has a helper template (`keycloak.serviceDnsName`) that creates the DNS name based on the headless service.

### Default Cache Stack

The default cache stack is now using `jdbc-ping` which leverages a table called `jgroups_ping` in the keycloak database to store the cache and significantly reduces network complexity.  Keycloak has set this [transport stack](https://www.keycloak.org/server/caching#_transport_stacks) as the default starting in 26.1.0 and it is backwards compatible with all 26.X releases.

It is recommended to use the new default value as it works in kubernetes and across multiple cloud providers alike.  Currently all other options have been marked as deprecated.  However, if the original value of `kubernetes` is required in a given environment, it can still be set by using a custom stack:

```yaml
cache:
  stack: custom
```

Addtionally, the following environment variables would need to be added for it to function properly:

```yaml
extraEnv: |
  - name: KC_CACHE
    value: "ispn"
  - name: KC_CACHE_STACK
    value: "kubernetes"
  - name: JAVA_OPTS_APPEND
    value: >-
      -Djgroups.dns.query={{ include "keycloak.fullname" . }}-headless
```

#### Custom Service Discovery

If a custom JGroups discovery is needed, then you can configure:

```yaml
cache:
  stack: custom
```

You can then reference your custom infinispan configuration file, e.g. `cache-custom.xml` via the `KC_CACHE_CONFIG_FILE` environment variable.
Note that the `cache-custom.xml` must be available via `/opt/keycloak/conf/cache-custom.xml`.

```yaml
extraEnv: |
  - name: KC_CACHE
    value: "ispn"
  - name: KC_CACHE_CONFIG_FILE
    value: cache-custom.xml
```

#### Autoscaling

Due to the caches in Keycloak only replicating to a few nodes (two in the example configuration above) and the limited controls around autoscaling built into Kubernetes, it has historically been problematic to autoscale Keycloak.
However, in Kubernetes 1.18 [additional controls were introduced](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-configurable-scaling-behavior) which make it possible to scale down in a more controlled manner.

The example autoscaling configuration in the values file scales from three up to a maximum of ten Pods using CPU utilization as the metric. Scaling up is done as quickly as required but scaling down is done at a maximum rate of one Pod per five minutes.

Autoscaling can be enabled as follows:

```yaml
autoscaling:
  enabled: true
```

KUBE_PING service discovery seems to be the most reliable mechanism to use when enabling autoscaling, due to being faster than DNS_PING at detecting changes in the cluster.

### Running Keycloak Behind a Reverse Proxy

When running Keycloak behind a reverse proxy, which is the case when using an ingress controller,
proxy address forwarding must be enabled as follows:

```yaml
extraEnv: |
  - name: KC_PROXY
    value: "passthrough"
```

### Providing a Custom Theme

One option is certainly to provide a custom Keycloak-X image that includes the theme.
However, if you prefer to stick with the official Keycloak-X image, you can use an init container as theme provider.

Create your own theme and package it up into a Docker image.

```docker
FROM busybox
COPY mytheme /mytheme
```

In combination with an `emptyDir` that is shared with the Keycloak container, configure an init container that runs your theme image and copies the theme over to the right place where Keycloak will pick it up automatically.

```yaml
extraInitContainers: |
  - name: theme-provider
    image: myuser/mytheme:1
    imagePullPolicy: IfNotPresent
    command:
      - sh
    args:
      - -c
      - |
        echo "Copying theme..."
        cp -R /mytheme/* /theme
    volumeMounts:
      - name: theme
        mountPath: /theme

extraVolumeMounts: |
  - name: theme
    mountPath: /opt/keycloak/themes/mytheme

extraVolumes: |
  - name: theme
    emptyDir: {}
```

### Using Google Cloud SQL Proxy

Depending on your environment you may need a local proxy to connect to the database.
This is, e. g., the case for Google Kubernetes Engine when using Google Cloud SQL.
Create the secret for the credentials as documented [here](https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine) and configure the proxy as a sidecar.

Because `extraContainers` is a string that is passed through the `tpl` function, it is possible to create custom values and use them in the string.

```yaml
database:
  vendor: postgres
  hostname: '127.0.0.1'
  port: 5432
  database: postgres
  username: myuser
  password: mypassword

# Custom values for Google Cloud SQL
cloudsql:
  project: my-project
  region: europe-west1
  instance: my-instance

extraContainers: |
  - name: cloudsql-proxy
    image: gcr.io/cloudsql-docker/gce-proxy:1.17
    command:
      - /cloud_sql_proxy
    args:
      - -instances={{ .Values.cloudsql.project }}:{{ .Values.cloudsql.region }}:{{ .Values.cloudsql.instance }}=tcp:5432
      - -credential_file=/secrets/cloudsql/credentials.json
    volumeMounts:
      - name: cloudsql-creds
        mountPath: /secrets/cloudsql
        readOnly: true

extraVolumes: |
  - name: cloudsql-creds
    secret:
      secretName: cloudsql-instance-credentials
```

### Changing the Context Path

By default, Keycloak-X is served under context `/auth`.
Trailing slash is removed from path. This can be changed to another context path like `/` as follows:

```yaml
http:
  relativePath: '/'
```

Alternatively, you may supply it via CLI flag:

```console
--set-string http.relativePath=/
```

### Prometheus Metrics Support

#### Keycloak Metrics

Keycloak-X can expose metrics via `/auth/metrics`.

Metrics are enabled by default via:
```yaml
metrics:
  enabled: true
```

Add a ServiceMonitor if using prometheus-operator:

```yaml
serviceMonitor:
  # If `true`, a ServiceMonitor resource for the prometheus-operator is created
  enabled: true
```

Checkout `values.yaml` for customizing the ServiceMonitor and for adding custom Prometheus rules.

Add annotations if you don't use prometheus-operator:

```yaml
service:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
```

#### Keycloak Metrics SPI

Optionally, it is possible to add [Keycloak Metrics SPI](https://github.com/aerogear/keycloak-metrics-spi) via init container.
Note that the `keycloak-metrics-spi.jar` needs to be added to the `/opt/keycloak/providers` directory.

A separate `ServiceMonitor` can be enabled to scrape metrics from the SPI:

```yaml
extraServiceMonitor:
  # If `true`, an additional ServiceMonitor resource for the prometheus-operator is created
  enabled: true
```

Checkout `values.yaml` for customizing this ServiceMonitor.

Note that the metrics endpoint is exposed on the HTTP port.
You may want to restrict access to it in your ingress controller configuration.
For ingress-nginx, this could be done as follows:

```yaml
annotations:
  nginx.ingress.kubernetes.io/server-snippet: |
    location ~* /auth/realms/[^/]+/metrics {
        return 403;
    }
```

## Why StatefulSet?

The headless service that governs the StatefulSet is used for DNS discovery via DNS_PING.

## Bad Gateway and Proxy Buffer Size in Nginx

A common issue with Keycloak and nginx is that the proxy buffer may be too small for what Keycloak is trying to send. This will result in a Bad Gateway (502) error. There are [many](https://github.com/kubernetes/ingress-nginx/issues/4637) [issues](https://stackoverflow.com/questions/56126864/why-do-i-get-502-when-trying-to-authenticate) around the internet about this. The solution is to increase the buffer size of nginx. This can be done by creating an annotation in the ingress specification:

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/proxy-buffer-size: "128k"
```

## Upgrading

Notes for upgrading from previous Keycloak chart versions.

### From chart < 18.0.0

* Keycloak is updated to 18.0.0
* Added new `health.enabled` option.

Keycloak 18.0.0 allows to enable the health endpoint independently of the metrics endpoint via the `health-enabled` setting.
We reflect that via the new config option `health.enabled`.

Please read the additional notes about [Migrating to 18.0.0](https://www.keycloak.org/docs/latest/upgrading/index.html#migrating-to-18-0-0) in the Keycloak documentation.
