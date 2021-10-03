# Keycloak

[Keycloak](http://www.keycloak.org/) is an open source identity and access management for modern applications and services.

## TL;DR;

```console
$ helm install keycloak codecentric/keycloak
```

## Introduction

This chart bootstraps a [Keycloak](http://www.keycloak.org/) StatefulSet on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.
It provisions a fully featured Keycloak installation.
For more information on Keycloak and its capabilities, see its [documentation](http://www.keycloak.org/documentation.html).

## Prerequisites Details

The chart has an optional dependency on the [PostgreSQL](https://github.com/bitnami/charts/tree/master/bitnami/postgresql) chart.
By default, the PostgreSQL chart requires PV support on underlying infrastructure (may be disabled).

## Installing the Chart

To install the chart with the release name `keycloak`:

```console
$ helm install keycloak codecentric/keycloak
```

## Uninstalling the Chart

To uninstall the `keycloak` deployment:

```console
$ helm uninstall keycloak
```

## Configuration

The following table lists the configurable parameters of the Keycloak chart and their default values.

| Parameter | Description | Default |
|---|---|---|
| `fullnameOverride` | Optionally override the fully qualified name | `""` |
| `nameOverride` | Optionally override the name | `""` |
| `replicas` | The number of replicas to create | `1` |
| `image.repository` | The Keycloak image repository | `docker.io/jboss/keycloak` |
| `image.tag` | Overrides the Keycloak image tag whose default is the chart version | `""` |
| `image.pullPolicy` | The Keycloak image pull policy | `IfNotPresent` |
| `imagePullSecrets` | Image pull secrets for the Pod | `[]` |
| `hostAliases` | Mapping between IPs and hostnames that will be injected as entries in the Pod's hosts files | `[]` |
| `enableServiceLinks` | Indicates whether information about services should be injected into Pod's environment variables, matching the syntax of Docker links | `true` |
| `podManagementPolicy` | Pod management policy. One of `Parallel` or `OrderedReady` | `Parallel` |
| `restartPolicy` | Pod restart policy. One of `Always`, `OnFailure`, or `Never` | `Always` |
| `serviceAccount.create` | Specifies whether a ServiceAccount should be created | `true` |
| `serviceAccount.name` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template | `""` |
| `serviceAccount.annotations` | Additional annotations for the ServiceAccount | `{}` |
| `serviceAccount.labels` | Additional labels for the ServiceAccount | `{}` |
| `serviceAccount.imagePullSecrets` | Image pull secrets that are attached to the ServiceAccount | `[]` |
| `rbac.create` | Specifies whether RBAC resources are to be created | `false`
| `rbac.rules` | Custom RBAC rules, e. g. for KUBE_PING | `[]`
| `podSecurityContext` | SecurityContext for the entire Pod. Every container running in the Pod will inherit this SecurityContext. This might be relevant when other components of the environment inject additional containers into running Pods (service meshes are the most prominent example for this) | `{"fsGroup":1000}` |
| `securityContext` | SecurityContext for the Keycloak container | `{"runAsNonRoot":true,"runAsUser":1000}` |
| `extraInitContainers` | Additional init containers, e. g. for providing custom themes | `[]` |
| `extraContainers` | Additional sidecar containers, e. g. for a database proxy, such as Google's cloudsql-proxy | `[]` |
| `lifecycleHooks` | Lifecycle hooks for the Keycloak container | `{}` |
| `terminationGracePeriodSeconds` | Termination grace period in seconds for Keycloak shutdown. Clusters with a large cache might need to extend this to give Infinispan more time to rebalance | `60` |
| `clusterDomain` | The internal Kubernetes cluster domain | `cluster.local` |
| `command` | Overrides the default entrypoint of the Keycloak container | `[]` |
| `args` | Overrides the default args for the Keycloak container | `[]` |
| `extraEnv` | Additional environment variables for Keycloak | `""` |
| `extraEnvFrom` | Additional environment variables for Keycloak mapped from a Secret or ConfigMap | `""` |
| `priorityClassName` | Pod priority class name | `""` |
| `affinity` | Pod affinity | Hard node and soft zone anti-affinity |
| `topologySpreadConstraints` | Topology spread constraints | Constraints used to spread pods |
| `nodeSelector` | Node labels for Pod assignment | `{}` |
| `tolerations` | Node taints to tolerate | `[]` |
| `podLabels` | Additional Pod labels | `{}` |
| `podAnnotations` | Additional Pod annotations | `{}` |
| `livenessProbe` | Liveness probe configuration | `{"httpGet":{"path":"/auth/","port":"http"},"initialDelaySeconds":0,"timeoutSeconds":5}` |
| `readinessProbe` | Readiness probe configuration | `{"httpGet":{"path":"/auth/realms/master","port":"http"},"initialDelaySeconds":30,"timeoutSeconds":1}` |
| `startupProbe` | Startup probe configuration | `{"httpGet":{"path":"/auth/","port":"http"},"initialDelaySeconds":30,"timeoutSeconds":5, "failureThreshold": 60, "periodSeconds": 5}` |
| `resources` | Pod resource requests and limits | `{}` |
| `startupScripts` | Startup scripts to run before Keycloak starts up | `{"keycloak.cli":"{{- .Files.Get "scripts/keycloak.cli" \| nindent 2 }}"}` |
| `extraVolumes` | Add additional volumes, e. g. for custom themes | `""` |
| `extraVolumeMounts` | Add additional volumes mounts, e. g. for custom themes | `""` |
| `extraPorts` | Add additional ports, e. g. for admin console or exposing JGroups ports | `[]` |
| `podDisruptionBudget` | Pod disruption budget | `{}` |
| `statefulsetAnnotations` | Annotations for the StatefulSet | `{}` |
| `statefulsetLabels` | Additional labels for the StatefulSet | `{}` |
| `secrets` | Configuration for secrets that should be created | `{}` |
| `service.annotations` | Annotations for headless and HTTP Services | `{}` |
| `service.labels` | Additional labels for headless and HTTP Services | `{}` |
| `service.type` | The Service type | `ClusterIP` |
| `service.loadBalancerIP` | Optional IP for the load balancer. Used for services of type LoadBalancer only | `""` |
| `loadBalancerSourceRanges` | Optional List of allowed source ranges (CIDRs). Used for service of type LoadBalancer only | `[]`  |
| `service.externalTrafficPolicy` | Optional external traffic policy. Used for services of type LoadBalancer only | `"Cluster"` |
| `service.httpPort` | The http Service port | `80` |
| `service.httpNodePort` | The HTTP Service node port if type is NodePort | `""` |
| `service.httpsPort` | The HTTPS Service port | `8443` |
| `service.httpsNodePort` | The HTTPS Service node port if type is NodePort | `""` |
| `service.httpManagementPort` | The WildFly management Service port | `8443` |
| `service.httpManagementNodePort` | The WildFly management node port if type is NodePort | `""` |
| `service.extraPorts` | Additional Service ports, e. g. for custom admin console | `[]` |
| `service.sessionAffinity` | sessionAffinity for Service, e. g. "ClientIP" | `""` |
| `service.sessionAffinityConfig` | sessionAffinityConfig for Service | `{}` |
| `ingress.enabled` | If `true`, an Ingress is created | `false` |
| `ingress.rules` | List of Ingress Ingress rule | see below |
| `ingress.rules[0].host` | Host for the Ingress rule | `{{ .Release.Name }}.keycloak.example.com` |
| `ingress.rules[0].paths` | Paths for the Ingress rule | see below |
| `ingress.rules[0].paths[0].path` | Path for the Ingress rule | `/` |
| `ingress.rules[0].paths[0].pathType` | Path Type for the Ingress rule | `Prefix` |
| `ingress.servicePort` | The Service port targeted by the Ingress | `http` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.labels` | Additional Ingress labels | `{}` |
| `ingress.tls` | TLS configuration | see below |
| `ingress.tls[0].hosts` | List of TLS hosts | `[keycloak.example.com]` |
| `ingress.tls[0].secretName` | Name of the TLS secret | `""` |
| `ingress.console.enabled` | If `true`, an Ingress for the console is created | `false` |
| `ingress.console.rules` | List of Ingress Ingress rule for the console | see below |
| `ingress.console.rules[0].host` | Host for the Ingress rule for the console | `{{ .Release.Name }}.keycloak.example.com` |
| `ingress.console.rules[0].paths` | Paths for the Ingress rule for the console | see below |
| `ingress.console.rules[0].paths[0].path` | Path for the Ingress rule for the console | `[/auth/admin]` |
| `ingress.console.rules[0].paths[0].pathType` | Path Type for the Ingress rule for the console | `Prefix` |
| `ingress.console.annotations` | Ingress annotations for the console | `{}` |
| `networkPolicy.enabled` | If true, the ingress network policy is deployed | `false`
| `networkPolicy.extraFrom` | Allows to define allowed external traffic (see Kubernetes doc for network policy `from` format) | `[]`
| `route.enabled` | If `true`, an OpenShift Route is created | `false` |
| `route.path` | Path for the Route | `/` |
| `route.annotations` | Route annotations | `{}` |
| `route.labels` | Additional Route labels | `{}` |
| `route.host` | Host name for the Route | `""` |
| `route.tls.enabled` | If `true`, TLS is enabled for the Route | `true` |
| `route.tls.insecureEdgeTerminationPolicy` | Insecure edge termination policy of the Route. Can be `None`, `Redirect`, or `Allow` | `Redirect` |
| `route.tls.termination` | TLS termination of the route. Can be `edge`, `passthrough`, or `reencrypt` | `edge` |
| `pgchecker.image.repository` | Docker image used to check Postgresql readiness at startup | `docker.io/busybox` |
| `pgchecker.image.tag` | Image tag for the pgchecker image | `1.32` |
| `pgchecker.image.pullPolicy` | Image pull policy for the pgchecker image | `IfNotPresent` |
| `pgchecker.securityContext` | SecurityContext for the pgchecker container | `{"allowPrivilegeEscalation":false,"runAsGroup":1000,"runAsNonRoot":true,"runAsUser":1000}` |
| `pgchecker.resources` | Resource requests and limits for the pgchecker container | `{"limits":{"cpu":"10m","memory":"16Mi"},"requests":{"cpu":"10m","memory":"16Mi"}}` |
| `postgresql.enabled` | If `true`, the Postgresql dependency is enabled | `true` |
| `postgresql.postgresqlUsername` | PostgreSQL User to create | `keycloak` |
| `postgresql.postgresqlPassword` | PostgreSQL Password for the new user | `keycloak` |
| `postgresql.postgresqlDatabase` | PostgreSQL Database to create | `keycloak` |
| `serviceMonitor.enabled` | If `true`, a ServiceMonitor resource for the prometheus-operator is created | `false` |
| `serviceMonitor.namespace` | Optionally sets a target namespace in which to deploy the ServiceMonitor resource | `""` |
| `serviceMonitor.namespaceSelector` | Optionally sets a namespace selector for the ServiceMonitor | `{}` |
| `serviceMonitor.annotations` | Annotations for the ServiceMonitor | `{}` |
| `serviceMonitor.labels` | Additional labels for the ServiceMonitor | `{}` |
| `serviceMonitor.interval` | Interval at which Prometheus scrapes metrics | `10s` |
| `serviceMonitor.scrapeTimeout` | Timeout for scraping | `10s` |
| `serviceMonitor.path` | The path at which metrics are served | `/metrics` |
| `serviceMonitor.port` | The Service port at which metrics are served | `http` |
| `extraServiceMonitor.enabled` | If `true`, an additional ServiceMonitor resource for the prometheus-operator is created. Could be used for additional metrics via [Keycloak Metrics SPI](https://github.com/aerogear/keycloak-metrics-spi) | `false` |
| `extraServiceMonitor.namespace` | Optionally sets a target namespace in which to deploy the additional ServiceMonitor resource | `""` |
| `extraServiceMonitor.namespaceSelector` | Optionally sets a namespace selector for the additional ServiceMonitor | `{}` |
| `extraServiceMonitor.annotations` | Annotations for the additional ServiceMonitor | `{}` |
| `extraServiceMonitor.labels` | Additional labels for the additional ServiceMonitor | `{}` |
| `extraServiceMonitor.interval` | Interval at which Prometheus scrapes metrics | `10s` |
| `extraServiceMonitor.scrapeTimeout` | Timeout for scraping | `10s` |
| `extraServiceMonitor.path` | The path at which metrics are served | `/metrics` |
| `extraServiceMonitor.port` | The Service port at which metrics are served | `http` |
| `prometheusRule.enabled` | If `true`, a PrometheusRule resource for the prometheus-operator is created | `false` |
| `prometheusRule.annotations` | Annotations for the PrometheusRule | `{}` |
| `prometheusRule.labels` | Additional labels for the PrometheusRule | `{}` |
| `prometheusRule.rules` | List of rules for Prometheus | `[]` |
| `autoscaling.enabled` | Enable creation of a HorizontalPodAutoscaler resource | `false` |
| `autoscaling.labels` | Additional labels for the HorizontalPodAutoscaler resource | `{}` |
| `autoscaling.minReplicas` | The minimum number of Pods when autoscaling is enabled | `3` |
| `autoscaling.maxReplicas` | The maximum number of Pods when autoscaling is enabled | `10` |
| `autoscaling.metrics` | The metrics configuration for the HorizontalPodAutoscaler | `[{"resource":{"name":"cpu","target":{"averageUtilization":80,"type":"Utilization"}},"type":"Resource"}]` |
| `autoscaling.behavior` | The scaling policy configuration for the HorizontalPodAutoscaler | `{"scaleDown":{"policies":[{"periodSeconds":300,"type":"Pods","value":1}],"stabilizationWindowSeconds":300}` |
| `test.enabled` | If `true`, test resources are created | `false` |
| `test.image.repository` | The image for the test Pod | `docker.io/unguiculus/docker-python3-phantomjs-selenium` |
| `test.image.tag` | The tag for the test Pod image | `v1` |
| `test.image.pullPolicy` | The image pull policy for the test Pod image | `IfNotPresent` |
| `test.podSecurityContext` | SecurityContext for the entire test Pod | `{"fsGroup":1000}` |
| `test.securityContext` | SecurityContext for the test container | `{"runAsNonRoot":true,"runAsUser":1000}` |


Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example:

```console
$ helm install keycloak codecentric/keycloak -n keycloak --set replicas=1
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while
installing the chart. For example:

```console
$ helm install keycloak codecentric/keycloak -n keycloak --values values.yaml
```

The chart offers great flexibility.
It can be configured to work with the official Keycloak Docker image but any custom image can be used as well.

For the offical Docker image, please check it's configuration at https://github.com/keycloak/keycloak-containers/tree/master/server.

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
`-Djava.net.preferIPv4Stack=true -Djboss.modules.system.pkgs=$JBOSS_MODULES_SYSTEM_PKGS -Djava.awt.headless=true`

You can override these by setting the `JAVA_OPTS` environment variable.
Make sure you configure container support.
This allows you to only configure memory using Kubernetes resources and the JVM will automatically adapt.

```yaml
extraEnv: |
  - name: JAVA_OPTS
    value: >-
      -XX:+UseContainerSupport
      -XX:MaxRAMPercentage=50.0
      -Djava.net.preferIPv4Stack=true
      -Djboss.modules.system.pkgs=$JBOSS_MODULES_SYSTEM_PKGS
      -Djava.awt.headless=true
```

### Database Setup

By default, Bitnami's [PostgreSQL](https://github.com/bitnami/charts/tree/master/bitnami/postgresql) chart is deployed and used as database.
Please refer to this chart for additional PostgreSQL configuration options.

#### Using an External Database

The Keycloak Docker image supports various database types.
Configuration happens in a generic manner.

##### Using a Secret Managed by the Chart

The following examples uses a PostgreSQL database with a secret that is managed by the Helm chart.

```yaml
postgresql:
  # Disable PostgreSQL dependency
  enabled: false

extraEnv: |
  - name: DB_VENDOR
    value: postgres
  - name: DB_ADDR
    value: mypostgres
  - name: DB_PORT
    value: "5432"
  - name: DB_DATABASE
    value: mydb

extraEnvFrom: |
  - secretRef:
      name: '{{ include "keycloak.fullname" . }}-db'

secrets:
  db:
    stringData:
      DB_USER: '{{ .Values.dbUser }}'
      DB_PASSWORD: '{{ .Values.dbPassword }}'
```

`dbUser` and `dbPassword` are custom values you'd then specify on the commandline using `--set-string`.

##### Using an Existing Secret

The following examples uses a PostgreSQL database with a secret.
Username and password are mounted as files.

```yaml
postgresql:
  # Disable PostgreSQL dependency
  enabled: false

extraEnv: |
  - name: DB_VENDOR
    value: postgres
  - name: DB_ADDR
    value: mypostgres
  - name: DB_PORT
    value: "5432"
  - name: DB_DATABASE
    value: mydb
  - name: DB_USER_FILE
    value: /secrets/db-creds/user
  - name: DB_PASSWORD_FILE
    value: /secrets/db-creds/password

extraVolumeMounts: |
  - name: db-creds
    mountPath: /secrets/db-creds
    readOnly: true

extraVolumes: |
  - name: db-creds
    secret:
      secretName: keycloak-db-creds
```

### Creating a Keycloak Admin User

The Keycloak Docker image supports creating an initial admin user.
It must be configured via environment variables:

* `KEYCLOAK_USER` or `KEYCLOAK_USER_FILE`
* `KEYCLOAK_PASSWORD` or `KEYCLOAK_PASSWORD_FILE`

Please refer to the section on database configuration for how to configure a secret for this.

### High Availability and Clustering

For high availability, Keycloak must be run with multiple replicas (`replicas > 1`).
The chart has a helper template (`keycloak.serviceDnsName`) that creates the DNS name based on the headless service.

#### DNS_PING Service Discovery

JGroups discovery via DNS_PING can be configured as follows:

```yaml
extraEnv: |
  - name: JGROUPS_DISCOVERY_PROTOCOL
    value: dns.DNS_PING
  - name: JGROUPS_DISCOVERY_PROPERTIES
    value: 'dns_query={{ include "keycloak.serviceDnsName" . }}'
  - name: CACHE_OWNERS_COUNT
    value: "2"
  - name: CACHE_OWNERS_AUTH_SESSIONS_COUNT
    value: "2"
```

#### KUBE_PING Service Discovery

Recent versions of Keycloak include a new Kubernetes native [KUBE_PING](https://github.com/jgroups-extras/jgroups-kubernetes) service discovery protocol.
This requires a little more configuration than DNS_PING but can easily be achieved with the Helm chart.

As with DNS_PING some environment variables must be configured as follows:

```yaml
extraEnv: |
  - name: JGROUPS_DISCOVERY_PROTOCOL
    value: kubernetes.KUBE_PING
  - name: KUBERNETES_NAMESPACE
    valueFrom:
      fieldRef:
        apiVersion: v1
        fieldPath: metadata.namespace
  - name: CACHE_OWNERS_COUNT
    value: "2"
  - name: CACHE_OWNERS_AUTH_SESSIONS_COUNT
    value: "2"
```

However, the Keycloak Pods must also get RBAC permissions to `get` and `list` Pods in the namespace which can be configured as follows:

```yaml
rbac:
  create: true
  rules:
    - apiGroups:
        - ""
      resources:
        - pods
      verbs:
        - get
        - list
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
  - name: PROXY_ADDRESS_FORWARDING
    value: "true"
```

### Providing a Custom Theme

One option is certainly to provide a custom Keycloak image that includes the theme.
However, if you prefer to stick with the official Keycloak image, you can use an init container as theme provider.

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
    mountPath: /opt/jboss/keycloak/themes/mytheme

extraVolumes: |
  - name: theme
    emptyDir: {}
```

### Setting a Custom Realm

A realm can be added by creating a secret or configmap for the realm json file and then supplying this into the chart.
It can be mounted using `extraVolumeMounts` and then referenced as environment variable `KEYCLOAK_IMPORT`.
First we need to create a Secret from the realm JSON file using `kubectl create secret generic realm-secret --from-file=realm.json` which we need to reference in `values.yaml`:

```yaml
extraVolumes: |
  - name: realm-secret
    secret:
      secretName: realm-secret

extraVolumeMounts: |
  - name: realm-secret
    mountPath: "/realm/"
    readOnly: true

extraEnv: |
  - name: KEYCLOAK_IMPORT
    value: /realm/realm.json
```

Alternatively, the realm file could be added to a custom image.

After startup the web admin console for the realm should be available on the path /auth/admin/\<realm name>/console/.

### Using Google Cloud SQL Proxy

Depending on your environment you may need a local proxy to connect to the database.
This is, e. g., the case for Google Kubernetes Engine when using Google Cloud SQL.
Create the secret for the credentials as documented [here](https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine) and configure the proxy as a sidecar.

Because `extraContainers` is a string that is passed through the `tpl` function, it is possible to create custom values and use them in the string.

```yaml
postgresql:
  # Disable PostgreSQL dependency
  enabled: false

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

extraEnv: |
  - name: DB_VENDOR
    value: postgres
  - name: DB_ADDR
    value: "127.0.0.1"
  - name: DB_PORT
    value: "5432"
  - name: DB_DATABASE
    value: postgres
  - name: DB_USER
    value: myuser
  - name: DB_PASSWORD
    value: mypassword
```

### Changing the Context Path

By default, Keycloak is served under context `/auth`.
This can be changed as follows:

```yaml
contextPath: mycontext

startupScripts:
  # cli script that reconfigures WildFly
  contextPath.cli: |
    embed-server --server-config=standalone-ha.xml --std-out=echo
    batch
    {{- if ne .Values.contextPath "auth" }}
    /subsystem=keycloak-server/:write-attribute(name=web-context,value={{ if eq .Values.contextPath "" }}/{{ else }}{{ .Values.contextPath }}{{ end }})
    {{- if eq .Values.contextPath "" }}
    /subsystem=undertow/server=default-server/host=default-host:write-attribute(name=default-web-module,value=keycloak-server.war)
    {{- end }}
    {{- end }}
    run-batch
    stop-embedded-server

livenessProbe: |
  httpGet:
    path: {{ if ne .Values.contextPath "" }}/{{ .Values.contextPath }}{{ end }}/
    port: http
  initialDelaySeconds: 0
  timeoutSeconds: 5

readinessProbe: |
  httpGet:
    path: {{ if ne .Values.contextPath "" }}/{{ .Values.contextPath }}{{ end }}/realms/master
    port: http
  initialDelaySeconds: 30
  timeoutSeconds: 1

startupProbe: |
  httpGet:
    path: /auth/
    port: http
  initialDelaySeconds: 30
  timeoutSeconds: 1
  failureThreshold: 60
  periodSeconds: 5
```

The above YAML references introduces the custom value `contextPath` which is possible because `startupScripts`, `livenessProbe`, `readinessProbe`, and `startupProbe` are templated using the `tpl` function.
Note that it must not start with a slash.
Alternatively, you may supply it via CLI flag:

```console
--set-string contextPath=mycontext
```

### Prometheus Metrics Support

#### WildFly Metrics

WildFly can expose metrics on the management port.
In order to achieve this, the environment variable `KEYCLOAK_STATISTICS` must be set.

```yaml
extraEnv: |
  - name: KEYCLOAK_STATISTICS
    value: all
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
    prometheus.io/port: "9990"
```

#### Keycloak Metrics SPI

Optionally, it is possible to add [Keycloak Metrics SPI](https://github.com/aerogear/keycloak-metrics-spi) via init container.

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

The chart sets node identifiers to the system property `jboss.node.name` which is in fact the pod name.
Node identifiers must not be longer than 23 characters.
This can be problematic because pod names are quite long.
We would have to truncate the chart's fullname to six characters because pods get a 17-character suffix (e. g. `-697f8b7655-mf5ht`).
Using a StatefulSet allows us to truncate to 20 characters leaving room for up to 99 replicas, which is much better.
Additionally, we get stable values for `jboss.node.name` which can be advantageous for cluster discovery.
The headless service that governs the StatefulSet is used for DNS discovery via DNS_PING.

## Upgrading

### From chart < 15.0.0

* Keycloak is updated to 15.0.2

### From chart < 14.0.0

Ingress path definitions are extended to describe path and pathType. Previously only the path was configured. Please adapt your configuration as shown below:

Old:
```yaml
ingress:
  # ...
  rules:
    - # ...
      # Paths for the host
      paths:
        - /
```
New:
```yaml
ingress:
  # ...
  rules:
    - # ...
      # Paths for the host
      paths:
        - path: /
          pathType: Prefix
```

This allows to configure specific `pathType` configurations, e.g. `pathType: ImplementationSpecific` for [GKE Ingress on Google Cloud Platform](https://cloud.google.com/kubernetes-engine/docs/concepts/ingress#default_backend).

### From chart < 13.0.0

* Keycloak is updated to 14.0.0

Note that this might not be a seamless upgrade, because the clustering with older Keycloak versions might not work
due to incompatible infinispan versions.

### From chart < 12.0.0

* Keycloak is updated to 13.0.1

Note that this might not be a seamless upgrade, because the clustering with older Keycloak versions might not work
due to incompatible infinispan versions.

One way to perform the upgrade is to run:
```
kubectl delete sts <RELEASE_NAME>-keycloak && helm upgrade --install
```
This ensures that all replicas are restarted with the same version.
Note that all sessions are lost in this case, and users might need to login again.

### From chart < 11.0.0

When you are using the postgresql subchart (which is not recommended for production situations), you will need to migrate the statefulset governing the postgresql pod.
The upgrade will cause some immutable fields of the statefulset to be modified, which cannot be done in place.
You will have to manually remove the statefulset before doing the Helm upgrade.
The following procedure takes care of this:

1. Remove the old statefulset (associated PVC will remain in place): `kubectl delete statefulset -n <your ns> <name of your psql statefulset>`
1. Helm Upgrade: `helm upgrade -n <your ns> ... <your release>`

### From chart < 10.0.0

* Keycloak is updated to 12.0.4

The upgrade should be seemless.
No special care has to be taken.

### From chart versions < 9.0.0

The Keycloak chart received a major facelift and, thus, comes with breaking changes.
Opinionated stuff and things that are now baked into Keycloak's Docker image were removed.
Configuration is more generic making it easier to use custom Docker images that are configured differently than the official one.

* Values are no longer nested under `keycloak`.
* Besides setting the node identifier, no CLI changes are performed out of the box
* Environment variables for the Postresql dependency are set automatically if enabled.
  Otherwise, no environment variables are set by default.
* Optionally enables creating RBAC resources with configurable rules (e. g. for KUBE_PING)
* PostgreSQL chart dependency is updated to 9.1.1

### From chart versions < 8.0.0

* Keycloak is updated to 10.0.0
* PostgreSQL chart dependency is updated to 8.9.5

The upgrade should be seemless.
No special care has to be taken.

### From chart versions < 7.0.0

Version 7.0.0 update breaks backwards-compatibility with the existing `keycloak.persistence.existingSecret` scheme.

#### Changes in Configuring Database Credentials from an Existing Secret

Both `DB_USER` and `DB_PASS` are always read from a Kubernetes Secret.
This is a requirement if you are provisioning database credentials dynamically - either via an Operator or some secret-management engine.

The variable referencing the password key name has been renamed from `keycloak.persistence.existingSecretKey` to `keycloak.persistence.existingSecretPasswordKey`

A new, optional variable for referencing the username key name for populating the `DB_USER` env has been added:
`keycloak.persistence.existingSecretUsernameKey`.

If `keycloak.persistence.existingSecret` is left unset, a new Secret will be provisioned populated with the `dbUser` and `dbPassword` Helm variables.

###### Example configuration:
```yaml
keycloak:
  persistence:
    existingSecret: keycloak-provisioned-db-credentials
    existingSecretPasswordKey: PGPASSWORD
    existingSecretUsernameKey: PGUSER
    ...
```
### From chart versions < 6.0.0

#### Changes in Probe Configuration

Now both readiness and liveness probes are configured as strings that are then passed through the `tpl` function.
This allows for greater customizability of the readiness and liveness probes.

The defaults are unchanged, but since 6.0.0 configured as follows:

```yaml
  livenessProbe: |
    httpGet:
      path: {{ if ne .Values.keycloak.basepath "" }}/{{ .Values.keycloak.basepath }}{{ end }}/
      port: http
    initialDelaySeconds: 300
    timeoutSeconds: 5
  readinessProbe: |
    httpGet:
      path: {{ if ne .Values.keycloak.basepath "" }}/{{ .Values.keycloak.basepath }}{{ end }}/realms/master
      port: http
    initialDelaySeconds: 30
    timeoutSeconds: 1
```

startup probe was added in 10.2.0 and is configured as follows:

```yaml
  startupProbe: |
    httpGet:
      path: /auth/
      port: http
    initialDelaySeconds: 30
    timeoutSeconds: 1
    failureThreshold: 60
    periodSeconds: 5
```

#### Changes in Existing Secret Configuration

This can be useful if you create a secret in a parent chart and want to reference that secret.
Applies to `keycloak.existingSecret` and `keycloak.persistence.existingSecret`.

_`values.yaml` of parent chart:_
```yaml
keycloak:
  keycloak:
    existingSecret: '{{ .Release.Name }}-keycloak-secret'
```

#### HTTPS Port Added

The HTTPS port was added to the pod and to the services.
As a result, service ports are now configured differently.


### From chart versions < 5.0.0

Version 5.0.0 is a major update.

* The chart now follows the new Kubernetes label recommendations:
https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
* Several changes to the StatefulSet render an out-of-the-box upgrade impossible because StatefulSets only allow updates to a limited set of fields
* The chart uses the new support for running scripts at startup that has been added to Keycloak's Docker image.
If you use this feature, you will have to adjust your configuration

However, with the following manual steps an automatic upgrade is still possible:

1. Adjust chart configuration as necessary (e. g. startup scripts)
1. Perform a non-cascading deletion of the StatefulSet which keeps the pods running
1. Add the new labels to the pods
1. Run `helm upgrade`

Use a script like the following to add labels and to delete the StatefulSet:

```console
#!/bin/sh

release=<release>
namespace=<release_namespace>

kubectl delete statefulset -n "$namespace" -l app=keycloak -l release="$release" --cascade=false

kubectl label pod -n "$namespace" -l app=keycloak -l release="$release" app.kubernetes.io/name=keycloak
kubectl label pod -n "$namespace" -l app=keycloak -l release="$release" app.kubernetes.io/instance="$release"
```

**NOTE:** Version 5.0.0 also updates the Postgresql dependency which has received a major upgrade as well.
In case you use this dependency, the database must be upgraded first.
Please refer to the Postgresql chart's upgrading section in its README for instructions.
