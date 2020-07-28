# Keycloak

[Keycloak](http://www.keycloak.org/) is an open source identity and access management for modern applications and services.

## TL;DR;

```console
$ helm install codecentric/keycloak
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
$ helm install --name keycloak codecentric/keycloak
```

## Uninstalling the Chart

To uninstall/delete the `keycloak` deployment:

```console
$ helm delete keycloak
```

## Configuration

The following table lists the configurable parameters of the Keycloak chart and their default values.

Parameter | Description | Default
--- | --- | ---
`init.image.repository` | Init image repository | `docker.io/busybox`
`init.image.tag` | Init image tag | `1.31`
`init.image.pullPolicy` | Init image pull policy | `IfNotPresent`
`init.resources` | Pod resource requests and limits for the init container | `{}`
`clusterDomain` | The internal Kubernetes cluster domain | `cluster.local`
`keycloak.replicas` | The number of Keycloak replicas | `1`
`keycloak.image.repository` | The Keycloak image repository | `docker.io/jboss/keycloak`
`keycloak.image.tag` | The Keycloak image tag | `""` (default empty so `.Chart.AppVersion` is used)
`keycloak.image.pullPolicy` | The Keycloak image pull policy | `IfNotPresent`
`keycloak.image.pullSecrets` | Image pull secrets | `[]`
`keycloak.basepath` | Path keycloak is hosted at | `auth`
`keycloak.username` | Username for the initial Keycloak admin user | `keycloak`
`keycloak.password` | Password for the initial Keycloak admin user (if `keycloak.existingSecret=""`). If not set, a random 10 characters password is created | `""`
`keycloak.existingSecret` | Specifies an existing secret to be used for the admin password | `""`
`keycloak.existingSecretKey` |  The key in `keycloak.existingSecret` that stores the admin password | `password`
`keycloak.jgroups.discoveryProtocol` | The protocol for JGroups discovery | `dns.DNS_PING`
`keycloak.jgroups.discoveryProperties` | Properties for JGroups discovery. Passed through the `tpl` function | `"dns_query={{ template "keycloak.fullname" . }}-headless.{{ .Release.Namespace }}.svc.{{ .Values.clusterDomain }}"`
`keycloak.jgroups.exposePort` | Specifies whether to expose the JGroups port in container and service | `true`
`keycloak.javaToolOptions` | Java tool options | `"-XX:+UseContainerSupport -XX:MaxRAMPercentage=50.0"`
`keycloak.extraInitContainers` | Additional init containers, e. g. for providing themes, etc. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.extraContainers` | Additional sidecar containers, e. g. for a database proxy, such as Google's cloudsql-proxy. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.extraEnv` | Allows the specification of additional environment variables for Keycloak. Passed through the `tpl` function and thus to be configured a string. | `""`
`keycloak.extraVolumeMounts` | Add additional volumes mounts, e. g. for custom themes. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.extraVolumes` | Add additional volumes, e. g. for custom themes. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.extraPorts` | Add additional ports, e. g. for custom admin console port. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.podDisruptionBudget` | Pod disruption budget | `{}`
`keycloak.priorityClassName` | Pod priority classname | `{}`
`keycloak.resources` | Pod resource requests and limits | `{}`
`keycloak.affinity` | Pod affinity. Passed through the `tpl` function and thus to be configured a string | `Hard node and soft zone anti-affinity`
`keycloak.nodeSelector` | Node labels for pod assignment | `{}`
`keycloak.tolerations` | Node taints to tolerate | `[]`
`keycloak.podLabels` | Extra labels to add to pod | `{}`
`keycloak.podAnnotations` | Extra annotations to add to pod. Values are passed through the `tpl` function | `{}`
`keycloak.statefulsetAnnotations` | Extra annotations to add to statefulset. Values are passed through the `tpl` function | `{}`
`keycloak.hostAliases` | Mapping between IP and hostnames that will be injected as entries in the pod's hosts files | `[]`
`keycloak.enableServiceLinks` | Indicates whether information about services should be injected into pod's environment variables, matching the syntax of Docker links | `false`
`keycloak.proxyAddressForwarding` | Enables proxy address forwarding if your instance is running behind a reverse proxy | `true`
`keycloak.podManagementPolicy` | Pod management policy. One of `Parallel` or `OrderedReady` | `Parallel`
`keycloak.restartPolicy` | Pod restart policy. One of `Always`, `OnFailure`, or `Never` | `Always`
`keycloak.serviceAccount.create` | If `true`, a new service account is created | `false`
`keycloak.serviceAccount.name` | Name of service account to use. If `serviceAccount.create=true`, a new service account is created with this name. | `"default" OR (if serviceAccount.create=true) keycloak.fullname`
`keycloak.securityContext` | Security context for the entire pod. Every container running in the pod will inherit this security context. This might be relevant when other components of the environment inject additional containers into running pods (service meshs are the most prominent example for this) | `{fsGroup: 1000}`
`keycloak.containerSecurityContext` | Security context for containers running in the pod. Will not be inherited by additionally injected containers | `{runAsUser: 1000, runAsNonRoot: true}`
`keycloak.startupScripts` | Custom startup scripts to run before Keycloak starts up | `[]`
`keycloak.lifecycleHooks` | Container lifecycle hooks. Passed through the `tpl` function and thus to be configured a string | ``
`keycloak.terminationGracePeriodSeconds` | Termination grace period in seconds for Keycloak shutdown. Clusters with a large cache might need to extend this to give Infinispan more time to rebalance | `60`
`keycloak.extraArgs` | Additional arguments to the start command | ``
`keycloak.livenessProbe` | Liveness probe configuration. Passed through the `tpl` function and thus to be configured as string | See `values.yaml`
`keycloak.readinessProbe` | Readiness probe configuration. Passed through the `tpl` function and thus to be configured as string | See `values.yaml`
`keycloak.cli.enabled` | Set to `false` if no CLI changes should be performed by the chart | `true`
`keycloak.cli.nodeIdentifier` | WildFly CLI script for setting the node identifier | See `values.yaml`
`keycloak.cli.logging` | WildFly CLI script for logging configuration | See `values.yaml`
`keycloak.cli.ha` | Settings for HA setups | See `values.yaml`
`keycloak.cli.custom` | Additional custom WildFly CLI script | `""`
`keycloak.service.annotations` | Annotations for the Keycloak service. Values are passed through the `tpl` function | `{}`
`keycloak.service.labels` | Additional labels for the Keycloak service | `{}`
`keycloak.service.type` | The service type | `ClusterIP`
`keycloak.service.httpPort` | The http service port | `80`
`keycloak.service.httpsPort` | The https service port | `8443`
`keycloak.service.httpNodePort` | The http node port used if the service is of type `NodePort` | `""`
`keycloak.service.httpsNodePort` | The https node port used if the service is of type `NodePort` | `""`
`keycloak.service.extraPorts` | Add additional ports, e. g. for custom admin console port. Passed through the `tpl` function and thus to be configured a string | `""`
`keycloak.ingress.enabled` | if `true`, an ingress is created | `false`
`keycloak.ingress.annotations` | annotations for the ingress | `{}`
`keycloak.ingress.labels` | Additional labels for the Keycloak ingress | `{}`
`keycloak.ingress.path` | Path for the ingress | `/`
`keycloak.ingress.servicePort` | The port of the service referenced by the ingress | `http`
`keycloak.ingress.hosts` | a list of ingress hosts | `[keycloak.example.com]`
`keycloak.ingress.tls` | a list of [IngressTLS](https://v1-9.docs.kubernetes.io/docs/reference/generated/kubernetes-api/v1.9/#ingresstls-v1beta1-extensions) items | `[]`
`keycloak.route.enabled` | If `true`, an OpenShift route is created | `false`
`keycloak.route.annotations` | Annotations for the route | `{}`
`keycloak.route.labels` | Additional labels for the Keycloak route | `{}`
`keycloak.route.path` | Path for the route | `/`
`keycloak.route.host` | The host name of the route. If left empty, a name will be generated by OpenShift | `""`
`keycloak.route.tls.enabled` | If `true`, TLS is enabled for the route | `true`
`keycloak.route.tls.insecureEdgeTerminationPolicy` | Insecure edge termination policy of the route. Can be `None`, `Redirect` or `Allow` | `Redirect`
`keycloak.route.tls.termination` | TLS termination of the route. Can be `edge`, `passthrough` or `reencrypt` | `edge`
`keycloak.persistence.deployPostgres` | If true, the PostgreSQL chart is installed | `false`
`keycloak.persistence.existingSecret` | Name of an existing secret to be used for the database password (if `keycloak.persistence.deployPostgres=false`). Otherwise a new secret is created | `""`
`keycloak.persistence.existingSecretPasswordKey` | The key for the database password in the existing secret (if `keycloak.persistence.deployPostgres=false` and `keycloak.persistence.existingSecret != ""`) | `""`
`keycloak.persistence.existingSecretUsernameKey` | The key for the database username in the existing secret (if `keycloak.persistence.deployPostgres=false` and `keycloak.persistence.existingSecret != ""`). Will default to the value of `.keycloak.persistence.dbUser` if left unset. | `""`
`keycloak.persistence.dbVendor` | One of `h2`, `postgres`, `mysql`, or `mariadb` (if `deployPostgres=false`) | `h2`
`keycloak.persistence.dbName` | The name of the database to connect to (if `deployPostgres=false`) | `keycloak`
`keycloak.persistence.dbHost` | The database host name (if `deployPostgres=false`) | `mykeycloak`
`keycloak.persistence.dbPort` | The database host port (if `deployPostgres=false`) | `5432`
`keycloak.persistence.dbUser` |The database user (if `deployPostgres=false`) | `keycloak`
`keycloak.persistence.dbPassword` |The database password (if `deployPostgres=false`) | `""`
`postgresql.postgresqlUser` | The PostgreSQL user (if `keycloak.persistence.deployPostgres=true`) | `keycloak`
`postgresql.postgresqlPassword` | The PostgreSQL password (if `keycloak.persistence.deployPostgres=true`) | `""`
`postgresql.postgresqlDatabase` | The PostgreSQL database (if `keycloak.persistence.deployPostgres=true`) | `keycloak`
`postgresql.persistence.enabled` | If `true`, a PersistentVolumeClaim is created for PostgreSQL (if `keycloak.persistence.deployPostgres=true`) | `false`
`test.enabled` | If `true`, test pods get scheduled | `true`
`test.image.repository` | Test image repository | `docker.io/unguiculus/docker-python3-phantomjs-selenium`
`test.image.tag` | Test image tag | `v1`
`test.image.pullPolicy` | Test image pull policy | `IfNotPresent`
`test.securityContext` | Security context for the test pod. Every container running in the pod will inherit this security context. This might be relevant when other components of the environment inject additional containers into the running pod (service meshs are the most prominent example for this) | `{fsGroup: 1000}`
`test.containerSecurityContext` | Security context for containers running in the test pod. Will not be inherited by additionally injected containers | `{runAsUser: 1000, runAsNonRoot: true}`
`prometheus.operator.enabled` | Enable the Prometheus Operator features of the chart | `false`
`prometheus.operator.serviceMonitor.namespace` | Namespace in which to deploy Prometheus Operator ServiceMonitor | `{{ .Release.Namespace }}`
`prometheus.operator.serviceMonitor.selector` | Labels to add to the Prometheus Operator ServiceMonitor depending on your Operator configuration | `release: prometheus`
`prometheus.operator.serviceMonitor.interval` | How often Prometheus should poll the metrics endpoint | `10s`
`prometheus.operator.serviceMonitor.scrapeTimeout` | How long the Prometheus metrics endpoint timeout should be | `10s`
`prometheus.operator.serviceMonitor.path` | The path of the Prometheus metrics endpoint on Keycloak | `/auth/realms/master/metrics`
`prometheus.operator.prometheusRules.enabled` | Whether to create Prometheus Operator PrometheusRules object | `false`
`prometheus.operator.prometheusRules.selector` | Labels to add to the Prometheus Operator PrometheusRules object depending on your Operator configuration | `{app: prometheus-operator", release: prometheus}`
`prometheus.operator.prometheusRules.rules` | The Prometheus Operator rules to configure | `{}`

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`.

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
$ helm install --name keycloak -f values.yaml codecentric/keycloak
```

### Usage of the `tpl` Function

The `tpl` function allows us to pass string values from `values.yaml` through the templating engine.
It is used for the following values:

* `keycloak.extraInitContainers`
* `keycloak.extraContainers`
* `keycloak.extraEnv`
* `keycloak.affinity`
* `keycloak.extraVolumeMounts`
* `keycloak.extraVolumes`
* `keycloak.livenessProbe`
* `keycloak.readinessProbe`

It is important that these values be configured as strings.
Otherwise, installation will fail. See example for Google Cloud Proxy or default affinity configuration in `values.yaml`.

### Database Setup

By default, Keycloak uses an embedded H2 database.
This is only suitable for testing purposes.
All data is lost when Keycloak is shut down.
Optionally, the [PostgreSQL](https://github.com/kubernetes/charts/tree/master/stable/postgresql) chart is deployed and used as database.
Please refer to this chart for additional PostgreSQL configuration options.

#### Using an External Database

The Keycloak Docker image supports PostgreSQL, MySQL, MariaDB, and H2.
The password for the database user is read from a Kubernetes secret.
It is possible to specify an existing secret that is not managed with this chart.
The key in the secret the password is read from may be specified as well (defaults to `password`).

```yaml
keycloak:
  persistence:

    # Disable deployment of the PostgreSQL chart
    deployPostgres: false

    # The database vendor. Can be either "postgres", "mysql", "mariadb", or "h2"
    dbVendor: postgres

    ## The following values only apply if "deployPostgres" is set to "false"

    # Optionally specify an existing secret
    existingSecret: "my-database-password-secret"
    existingSecretPasswordKey: "password-key-in-my-database-secret"
    existingSecretUsernameKey: "username-key-in-my-database-secret"

    dbName: keycloak
    dbHost: mykeycloak
    dbPort: 5432 # 5432 is PostgreSQL's default port. For MySQL it would be 3306
    dbUser: keycloak

    # Only used if no existing secret is specified. In this case a new secret is created
    dbPassword: keycloak
```

See also:
* https://github.com/jboss-dockerfiles/keycloak/blob/master/server/tools/cli/databases/postgres/change-database.cli
* https://github.com/jboss-dockerfiles/keycloak/blob/master/server/tools/cli/databases/mysql/change-database.cli

### Configuring Additional Environment Variables

```yaml
keycloak:
  extraEnv: |
    - name: KEYCLOAK_LOGLEVEL
      value: DEBUG
    - name: WILDFLY_LOGLEVEL
      value: DEBUG
    - name: CACHE_OWNERS
      value: "3"
    - name: DB_QUERY_TIMEOUT
      value: "60"
    - name: DB_VALIDATE_ON_MATCH
      value: true
    - name: DB_USE_CAST_FAIL
      value: false
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
keycloak:
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
It could be mounted using `extraVolumeMounts` and then specified in `extraArgs` using `-Dkeycloak.import`.
First we could create a Secret from a json file using `kubectl create secret generic realm-secret --from-file=realm.json` which we need to reference in `values.yaml`:

```yaml
keycloak:
  extraVolumes: |
    - name: realm-secret
      secret:
        secretName: realm-secret

  extraVolumeMounts: |
    - name: realm-secret
      mountPath: "/realm/"
      readOnly: true

  extraArgs: -Dkeycloak.import=/realm/realm.json
```

Alternatively, the file could be added to a custom image (set in `keycloak.image`) and then referenced by `-Dkeycloak.import`.

After startup the web admin console for the realm should be available on the path /auth/admin/\<realm name>/console/.

### Using Google Cloud SQL Proxy

Depending on your environment you may need a local proxy to connect to the database.
This is, e. g., the case for Google Kubernetes Engine when using Google Cloud SQL.
Create the secret for the credentials as documented [here](https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine) and configure the proxy as a sidecar.

Because `keycloak.extraContainers` is a string that is passed through the `tpl` function, it is possible to create custom values and use them in the string.

```yaml

# Custom values for Google Cloud SQL
cloudsql:
  project: my-project
  region: europe-west1
  instance: my-instance

keycloak:
  extraContainers: |
    - name: cloudsql-proxy
      image: gcr.io/cloudsql-docker/gce-proxy:1.11
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

  persistence:
    deployPostgres: false
    dbVendor: postgres
    dbName: postgres
    dbHost: 127.0.0.1
    dbPort: 5432
    dbUser: myuser
    dbPassword: mypassword
```

### WildFly Configuration

WildFly can be configured via its [command line interface (CLI)](https://docs.jboss.org/author/display/WFLY/Command+Line+Interface).
This chart uses the official Keycloak Docker image and customizes the installation running CLI scripts at server startup.

#### Customizing CLI Scripts

In order to make further customization easier, the CLI commands are separated by their concerns into smaller scripts.
Everything is in `values.yaml` and can be overridden.
Additional CLI commands may be added via `keycloak.cli.custom`, which is empty by default.

#### Disabling CLI Changes

The CLI changes the chart makes may not be desirable in all cases, especially when a custom Keycloak image is used that already incorporates a complete configuration that doesn't need any adjustments.
In this case, the CLI scripts the chart runs by default can either be disabled en bloc or on and individual basis.

##### Disabling all CLI Changes en Bloc

```yaml
keycloak:
  cli:
    enabled: false
```

##### Disabling an Individual Script

```yaml
keycloak:
  cli:
    logging: ""
```

### High Availability and Clustering

For high availability, Keycloak should be run with multiple replicas (`keycloak.replicas > 1`).
WildFly uses Infinispan for caching.
These caches can be replicated across all instances forming a cluster.
If `keycloak.replicas > 1`, JGroups' DNS_PING is configured for cluster discovery and Keycloak is started with `--server-config standalone-ha.xml`.

### Prometheus Operator Support

It is possible to monitor Keycloak with Prometheus through the use of plugins such as [keycloak-metrics-spi](https://github.com/aerogear/keycloak-metrics-spi). The plugin can be added with configuration like this:
```
  extraInitContainers: |
    - name: extensions
      image: busybox
      imagePullPolicy: IfNotPresent
      command:
        - sh
      args:
        - -c
        - |
          echo "Copying extensions..."
          wget -O /deployments/keycloak-metrics-spi.jar https://github.com/aerogear/keycloak-metrics-spi/releases/download/1.0.1/keycloak-metrics-spi-1.0.1.jar
      volumeMounts:
        - name: deployments
          mountPath: /deployments

  extraVolumeMounts: |
    - name: deployments
      mountPath: /opt/jboss/keycloak/standalone/deployments

  extraVolumes: |
    - name: deployments
      emptyDir: {}
```

You can then either configure Prometheus to scrape the `/auth/realms/master/metrics` path on the normal HTTP port of JBoss, or if you use the [Prometheus Operator](https://github.com/helm/charts/tree/master/stable/prometheus-operator) you can enable `prometheus.operator.enabled` in `values.yaml` and use the example configuration.
If you are using Prometheus Operator for configuring Prometheus Rules, the chart also supports this; see `prometheus.operator.prometheusRules` in `values.yaml` for more details.

## Why StatefulSet?

The chart sets node identifiers to the system property `jboss.node.name` which is in fact the pod name.
Node identifiers must not be longer than 23 characters.
This can be problematic because pod names are quite long.
We would have to truncate the chart's fullname to six characters because pods get a 17-character suffix (e. g. `-697f8b7655-mf5ht`).
Using a StatefulSet allows us to truncate to 20 characters leaving room for up to 99 replicas, which is much better.
Additionally, we get stable values for `jboss.node.name` which can be advantageous for cluster discovery.
The headless service that governs the StatefulSet is used for DNS discovery.

## Upgrading

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
