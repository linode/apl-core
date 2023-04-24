# Gitea Helm Chart

[Gitea](https://gitea.io/en-us/) is a community managed lightweight code hosting
solution written in Go. It is published under the MIT license.

## Introduction

This helm chart has taken some inspiration from [jfelten's helm
chart](https://github.com/jfelten/gitea-helm-chart). But takes a completely
different approach in providing a database and cache with dependencies.
Additionally, this chart provides LDAP and admin user configuration with values,
as well as being deployed as a statefulset to retain stored repositories.

## Dependencies

Gitea can be run with an external database and cache. This chart provides those
dependencies, which can be enabled, or disabled via
configuration.

Dependencies:

- PostgreSQL ([configuration](#postgresql))
- Memcached ([configuration](#memcached))
- MySQL ([configuration](#mysql))
- MariaDB ([configuration](#mariadb))

## Installing

```sh
helm repo add gitea-charts https://dl.gitea.io/charts/
helm repo update
helm install gitea gitea-charts/gitea
```

When upgrading, please refer to the [Upgrading](#upgrading) section at the bottom
of this document for major and breaking changes.

## Prerequisites

- Kubernetes 1.12+
- Helm 3.0+
- PV provisioner for persistent data support

## Configure Commit Signing

When using the rootless image the gpg key folder was is not persistent by
default. If you consider using signed commits for internal Gitea activities
(e.g. initial commit), you'd need to provide a signing key. Prior to
[PR186](https://gitea.com/gitea/helm-chart/pulls/186), imported keys had to be
re-imported once the container got replaced by another.

The mentioned PR introduced a new configuration object `signing` allowing you to
configure prerequisites for commit signing. By default this section is disabled
to maintain backwards compatibility.

```yaml
signing:
  enabled: false
  gpgHome: /data/git/.gnupg
```

## Examples

### Gitea Configuration

Gitea offers lots of configuration options. This is fully described in the
[Gitea Cheat Sheet](https://docs.gitea.io/en-us/config-cheat-sheet/).

```yaml
gitea:
  config:
    APP_NAME: "Gitea: With a cup of tea."
    repository:
      ROOT: "~/gitea-repositories"
    repository.pull-request:
      WORK_IN_PROGRESS_PREFIXES: "WIP:,[WIP]:"
```

### Default Configuration

This chart will set a few defaults in the Gitea configuration based on the
service and ingress settings. All defaults can be overwritten in `gitea.config`.

INSTALL_LOCK is always set to true, since we want to configure Gitea with this
helm chart and everything is taken care of.

_All default settings are made directly in the generated app.ini, not in the Values._

#### Database defaults

If a builtIn database is enabled the database configuration is set
automatically. For example, PostgreSQL builtIn will appear in the app.ini as:

```ini
[database]
DB_TYPE = postgres
HOST = RELEASE-NAME-postgresql.default.svc.cluster.local:5432
NAME = gitea
PASSWD = gitea
USER = gitea
```

#### Memcached defaults

Memcached is handled the exact same way as database builtIn. Once Memcached
builtIn is enabled, this chart will generate the following part in the `app.ini`:

```ini
[cache]
ADAPTER = memcache
ENABLED = true
HOST = RELEASE-NAME-memcached.default.svc.cluster.local:11211
```

#### Server defaults

The server defaults are a bit more complex. If ingress is `enabled`, the
`ROOT_URL`, `DOMAIN` and `SSH_DOMAIN` will be set accordingly. `HTTP_PORT`
always defaults to `3000` as well as `SSH_PORT` to `22`.

```ini
[server]
APP_DATA_PATH = /data
DOMAIN = git.example.com
HTTP_PORT = 3000
PROTOCOL = http
ROOT_URL = http://git.example.com
SSH_DOMAIN = git.example.com
SSH_LISTEN_PORT = 22
SSH_PORT = 22
ENABLE_PPROF = false
```

#### Metrics defaults

The Prometheus `/metrics` endpoint is disabled by default.

```ini
[metrics]
ENABLED = false
```

### Additional _app.ini_ settings

> **The [generic](https://docs.gitea.io/en-us/config-cheat-sheet/#overall-default)
section cannot be defined that way.**

Some settings inside _app.ini_ (like passwords or whole authentication configurations)
must be considered sensitive and therefore should not be passed via plain text
inside the _values.yaml_ file. In times of _GitOps_ the values.yaml could be stored
in a Git repository where sensitive data should never be accessible.

The Helm Chart supports this approach and let the user define custom sources like
Kubernetes Secrets to be loaded as environment variables during _app.ini_ creation
or update.

```yaml
gitea:
  additionalConfigSources:
    - secret:
        secretName: gitea-app-ini-oauth
    - configMap:
        name: gitea-app-ini-plaintext
```

This would mount the two additional volumes (`oauth` and `some-additionals`)
from different sources to the init containerwhere the _app.ini_ gets updated.
All files mounted that way will be read and converted to environment variables
and then added to the _app.ini_ using [environment-to-ini](https://github.com/go-gitea/gitea/tree/main/contrib/environment-to-ini).

The key of such additional source represents the section inside the _app.ini_.
The value for each key can be multiline ini-like definitions.

In example, the referenced `gitea-app-ini-plaintext` could look like this.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitea-app-ini-plaintext
data:
  session: |
    PROVIDER=memory
    SAME_SITE=strict
  cron.archive_cleanup: |
    ENABLED=true
```

Or when using a Kubernetes secret, having the same data structure:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-security-related-configuration
type: Opaque
stringData:
  security: |
    PASSWORD_COMPLEXITY=off
  session: |
    SAME_SITE=strict
```

#### User defined environment variables in app.ini

Users are able to define their own environment variables,
which are loaded into the containers. We also support to
directly interact with the generated _app.ini_.

To inject self defined variables into the _app.ini_ a
certain format needs to be honored. This is
described in detail on the [env-to-ini](https://github.com/go-gitea/gitea/tree/main/contrib/environment-to-ini)
page.

Note that the Prefix on this helm chart is `ENV_TO_INI`.

For example a database setting needs to have the following
format:

```yaml
gitea:
  additionalConfigFromEnvs:
    - name: ENV_TO_INI__DATABASE__HOST
      value: my.own.host
    - name: ENV_TO_INI__DATABASE__PASSWD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
```

Priority (highest to lowest) for defining app.ini variables:

1. Environment variables prefixed with `ENV_TO_INI`
2. Additional config sources
3. Values defined in `gitea.config`

### External Database

An external Database can be used instead of builtIn PostgreSQL or MySQL.

```yaml
gitea:
  config:
    database:
      DB_TYPE: mysql
      HOST: 127.0.0.1:3306
      NAME: gitea
      USER: root
      PASSWD: gitea
      SCHEMA: gitea

postgresql:
  enabled: false
```

### Ports and external url

By default port `3000` is used for web traffic and `22` for ssh. Those can be changed:

```yaml
service:
  http:
    port: 3000
  ssh:
    port: 22
```

This helm chart automatically configures the clone urls to use the correct
ports. You can change these ports by hand using the `gitea.config` dict. However
you should know what you're doing.

### ClusterIP

By default the clusterIP will be set to None, which is the default for headless
services. However if you want to omit the clusterIP field in the service, use
the following values:

```yaml
service:
  http:
    type: ClusterIP
    port: 3000
    clusterIP:
  ssh:
    type: ClusterIP
    port: 22
    clusterIP:
```

### SSH and Ingress

If you're using ingress and want to use SSH, keep in mind, that ingress is not
able to forward SSH Ports. You will need a LoadBalancer like `metallb` and a
setting in your ssh service annotations.

```yaml
service:
  ssh:
    annotations:
      metallb.universe.tf/allow-shared-ip: test
```

### SSH on crio based kubernetes cluster

If you use crio as container runtime it is not possible to read from a remote
repository. You should get an error message like this:

```bash
$ git clone git@k8s-demo.internal:admin/test.git
Cloning into 'test'...
Connection reset by 192.168.179.217 port 22
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.
```

To solve this problem add the capability `SYS_CHROOT` to the `securityContext`.
More about this issue [here](https://gitea.com/gitea/helm-chart/issues/161).

### Cache

This helm chart can use a built in cache. The default is Memcached from bitnami.

```yaml
memcached:
  enabled: true
```

If the built in cache should not be used simply configure the cache in
`gitea.config`.

```yaml
gitea:
  config:
    cache:
      ENABLED: true
      ADAPTER: memory
      INTERVAL: 60
      HOST: 127.0.0.1:9090
```

### Persistence

Gitea will be deployed as a statefulset. By simply enabling the persistence and
setting the storage class according to your cluster everything else will be
taken care of. The following example will create a PVC as a part of the
statefulset. This PVC will not be deleted even if you uninstall the chart.

Please note, that an empty storageClass in the persistence will result in
kubernetes using your default storage class.

If you want to use your own storageClass define it as followed:

```yaml
persistence:
  enabled: true
  storageClass: myOwnStorageClass
```

When using PostgreSQL as dependency, this will also be deployed as a statefulset
by default.

If you want to manage your own PVC you can simply pass the PVC name to the chart.

```yaml
  persistence:
    enabled: true
    existingClaim: MyAwesomeGiteaClaim
```

In case that peristence has been disabled it will simply use an empty dir volume.

PostgreSQL handles the persistence in the exact same way.
You can interact with the postgres settings as displayed in the following example:

```yaml
  postgresql:
    persistence:
      enabled: true
      existingClaim: MyAwesomeGiteaPostgresClaim
```

MySQL also handles persistence the same, even though it is not deployed as a statefulset.
You can interact with the postgres settings as displayed in the following example:

```yaml
  mysql:
    persistence:
      enabled: true
      existingClaim: MyAwesomeGiteaMysqlClaim
```

### Admin User

This chart enables you to create a default admin user. It is also possible to
update the password for this user by upgrading or redeloying the chart. It is
not possible to delete an admin user after it has been created. This has to be
done in the ui. You cannot use `admin` as username.

```yaml
  gitea:
    admin:
      username: "MyAwesomeGiteaAdmin"
      password: "AReallyAwesomeGiteaPassword"
      email: "gi@tea.com"
```

You can also use an existing Secret to configure the admin user:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-admin-secret
type: Opaque
stringData:
  username: MyAwesomeGiteaAdmin
  password: AReallyAwesomeGiteaPassword
```

```yaml
gitea:
    admin:
      existingSecret: gitea-admin-secret
```

### LDAP Settings

Like the admin user the LDAP settings can be updated.
All LDAP values from <https://docs.gitea.io/en-us/command-line/#admin> are available.

Multiple LDAP sources can be configured with additional LDAP list items.

```yaml
  gitea:
    ldap:
      - name: MyAwesomeGiteaLdap
        securityProtocol: unencrypted
        host: "127.0.0.1"
        port: "389"
        userSearchBase: ou=Users,dc=example,dc=com
        userFilter: sAMAccountName=%s
        adminFilter: CN=Admin,CN=Group,DC=example,DC=com
        emailAttribute: mail
        bindDn: CN=ldap read,OU=Spezial,DC=example,DC=com
        bindPassword: JustAnotherBindPw
        usernameAttribute: CN
        publicSSHKeyAttribute: publicSSHKey
```

You can also use an existing secret to set the bindDn and bindPassword:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-ldap-secret
type: Opaque
stringData:
  bindDn: CN=ldap read,OU=Spezial,DC=example,DC=com
  bindPassword: JustAnotherBindPw
```

```yaml
gitea:
    ldap:
      - existingSecret: gitea-ldap-secret
        ...
```

⚠️ Some options are just flags and therefore don't have any values. If they
are defined in `gitea.ldap` configuration, they will be passed to the Gitea CLI
without any value. Affected options:

- notActive
- skipTlsVerify
- allowDeactivateAll
- synchronizeUsers
- attributesInBind

### OAuth2 Settings

Like the admin user, OAuth2 settings can be updated and disabled but not
deleted. Deleting OAuth2 settings has to be done in the ui. All OAuth2 values,
which are documented [here](https://docs.gitea.io/en-us/command-line/#admin), are
available.

Multiple OAuth2 sources can be configured with additional OAuth list items.

```yaml
gitea:
  oauth:
    - name: 'MyAwesomeGiteaOAuth'
      provider: 'openidConnect'
      key: 'hello'
      secret: 'world'
      autoDiscoverUrl: 'https://gitea.example.com/.well-known/openid-configuration'
      #useCustomUrls:
      #customAuthUrl:
      #customTokenUrl:
      #customProfileUrl:
      #customEmailUrl:
```

You can also use an existing secret to set the `key` and `secret`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-oauth-secret
type: Opaque
stringData:
  key: hello
  secret: world
```

```yaml
gitea:
  oauth:
    - name: 'MyAwesomeGiteaOAuth'
      existingSecret: gitea-oauth-secret
        ...
```

### Metrics and profiling

A Prometheus `/metrics` endpoint on the `HTTP_PORT` and `pprof` profiling
endpoints on port 6060 can be enabled under `gitea`. Beware that the metrics
endpoint is exposed via the ingress, manage access using ingress annotations for
example.

To deploy the `ServiceMonitor`, you first need to ensure that you have deployed
`prometheus-operator` and its
[CRDs](https://github.com/prometheus-operator/prometheus-operator#customresourcedefinitions).

```yaml
gitea:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

  config:
    server:
      ENABLE_PPROF: true
```

### Pod Annotations

Annotations can be added to the Gitea pod.

```yaml
gitea:
  podAnnotations: {}
```

## Parameters

### Global

| Name                      | Description                                                               | Value           |
| ------------------------- | ------------------------------------------------------------------------- | --------------- |
| `global.imageRegistry`    | global image registry override                                            | `""`            |
| `global.imagePullSecrets` | global image pull secrets override; can be extended by `imagePullSecrets` | `[]`            |
| `global.storageClass`     | global storage class override                                             | `""`            |
| `replicaCount`            | number of replicas for the statefulset                                    | `1`             |
| `clusterDomain`           | cluster domain                                                            | `cluster.local` |

### Image

| Name               | Description                                                                                                                             | Value         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `image.registry`   | image registry, e.g. gcr.io,docker.io                                                                                                   | `""`          |
| `image.repository` | Image to start for this pod                                                                                                             | `gitea/gitea` |
| `image.tag`        | Visit: [Image tag](https://hub.docker.com/r/gitea/gitea/tags?page=1&ordering=last_updated). Defaults to `appVersion` within Chart.yaml. | `""`          |
| `image.pullPolicy` | Image pull policy                                                                                                                       | `Always`      |
| `image.rootless`   | Wether or not to pull the rootless version of Gitea, only works on Gitea 1.14.x or higher                                               | `false`       |
| `imagePullSecrets` | Secret to use for pulling the image                                                                                                     | `[]`          |

### Security

| Name                         | Description                                                     | Value  |
| ---------------------------- | --------------------------------------------------------------- | ------ |
| `podSecurityContext.fsGroup` | Set the shared file system group for all containers in the pod. | `1000` |
| `containerSecurityContext`   | Security context                                                | `{}`   |
| `securityContext`            | Run init and Gitea containers as a specific securityContext     | `{}`   |

### Service

| Name                                    | Description                                                                                                                                                                                          | Value       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `service.http.type`                     | Kubernetes service type for web traffic                                                                                                                                                              | `ClusterIP` |
| `service.http.port`                     | Port number for web traffic                                                                                                                                                                          | `3000`      |
| `service.http.clusterIP`                | ClusterIP setting for http autosetup for statefulset is None                                                                                                                                         | `None`      |
| `service.http.loadBalancerIP`           | LoadBalancer IP setting                                                                                                                                                                              | `nil`       |
| `service.http.nodePort`                 | NodePort for http service                                                                                                                                                                            | `nil`       |
| `service.http.externalTrafficPolicy`    | If `service.http.type` is `NodePort` or `LoadBalancer`, set this to `Local` to enable source IP preservation                                                                                         | `nil`       |
| `service.http.externalIPs`              | External IPs for service                                                                                                                                                                             | `nil`       |
| `service.http.ipFamilyPolicy`           | HTTP service dual-stack policy                                                                                                                                                                       | `nil`       |
| `service.http.ipFamilies`               | HTTP service dual-stack familiy selection,for dual-stack parameters see official kubernetes [dual-stack concept documentation](https://kubernetes.io/docs/concepts/services-networking/dual-stack/). | `nil`       |
| `service.http.loadBalancerSourceRanges` | Source range filter for http loadbalancer                                                                                                                                                            | `[]`        |
| `service.http.annotations`              | HTTP service annotations                                                                                                                                                                             | `{}`        |
| `service.ssh.type`                      | Kubernetes service type for ssh traffic                                                                                                                                                              | `ClusterIP` |
| `service.ssh.port`                      | Port number for ssh traffic                                                                                                                                                                          | `22`        |
| `service.ssh.clusterIP`                 | ClusterIP setting for ssh autosetup for statefulset is None                                                                                                                                          | `None`      |
| `service.ssh.loadBalancerIP`            | LoadBalancer IP setting                                                                                                                                                                              | `nil`       |
| `service.ssh.nodePort`                  | NodePort for ssh service                                                                                                                                                                             | `nil`       |
| `service.ssh.externalTrafficPolicy`     | If `service.ssh.type` is `NodePort` or `LoadBalancer`, set this to `Local` to enable source IP preservation                                                                                          | `nil`       |
| `service.ssh.externalIPs`               | External IPs for service                                                                                                                                                                             | `nil`       |
| `service.ssh.ipFamilyPolicy`            | SSH service dual-stack policy                                                                                                                                                                        | `nil`       |
| `service.ssh.ipFamilies`                | SSH service dual-stack familiy selection,for dual-stack parameters see official kubernetes [dual-stack concept documentation](https://kubernetes.io/docs/concepts/services-networking/dual-stack/).  | `nil`       |
| `service.ssh.hostPort`                  | HostPort for ssh service                                                                                                                                                                             | `nil`       |
| `service.ssh.loadBalancerSourceRanges`  | Source range filter for ssh loadbalancer                                                                                                                                                             | `[]`        |
| `service.ssh.annotations`               | SSH service annotations                                                                                                                                                                              | `{}`        |

### Ingress

| Name                                 | Description                                                                 | Value             |
| ------------------------------------ | --------------------------------------------------------------------------- | ----------------- |
| `ingress.enabled`                    | Enable ingress                                                              | `false`           |
| `ingress.className`                  | Ingress class name                                                          | `nil`             |
| `ingress.annotations`                | Ingress annotations                                                         | `{}`              |
| `ingress.hosts[0].host`              | Default Ingress host                                                        | `git.example.com` |
| `ingress.hosts[0].paths[0].path`     | Default Ingress path                                                        | `/`               |
| `ingress.hosts[0].paths[0].pathType` | Ingress path type                                                           | `Prefix`          |
| `ingress.tls`                        | Ingress tls settings                                                        | `[]`              |
| `ingress.apiVersion`                 | Specify APIVersion of ingress object. Mostly would only be used for argocd. |                   |

### StatefulSet

| Name                                        | Description                                            | Value |
| ------------------------------------------- | ------------------------------------------------------ | ----- |
| `resources`                                 | Kubernetes resources                                   | `{}`  |
| `schedulerName`                             | Use an alternate scheduler, e.g. "stork"               | `""`  |
| `nodeSelector`                              | NodeSelector for the statefulset                       | `{}`  |
| `tolerations`                               | Tolerations for the statefulset                        | `[]`  |
| `affinity`                                  | Affinity for the statefulset                           | `{}`  |
| `dnsConfig`                                 | dnsConfig for the statefulset                          | `{}`  |
| `statefulset.env`                           | Additional environment variables to pass to containers | `[]`  |
| `statefulset.terminationGracePeriodSeconds` | How long to wait until forcefully kill the pod         | `60`  |
| `statefulset.labels`                        | Labels for the statefulset                             | `{}`  |
| `statefulset.annotations`                   | Annotations for the Gitea StatefulSet to be created    | `{}`  |

### Persistence

| Name                         | Description                                                                                           | Value               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| `persistence.enabled`        | Enable persistent storage                                                                             | `true`              |
| `persistence.existingClaim`  | Use an existing claim to store repository information                                                 | `nil`               |
| `persistence.size`           | Size for persistence to store repo information                                                        | `10Gi`              |
| `persistence.accessModes`    | AccessMode for persistence                                                                            | `["ReadWriteOnce"]` |
| `persistence.labels`         | Labels for the persistence volume claim to be created                                                 | `{}`                |
| `persistence.annotations`    | Annotations for the persistence volume claim to be created                                            | `{}`                |
| `persistence.storageClass`   | Name of the storage class to use                                                                      | `nil`               |
| `persistence.subPath`        | Subdirectory of the volume to mount at                                                                | `nil`               |
| `extraVolumes`               | Additional volumes to mount to the Gitea statefulset                                                  | `[]`                |
| `extraContainerVolumeMounts` | Mounts that are only mapped into the Gitea runtime/main container, to e.g. override custom templates. | `[]`                |
| `extraInitVolumeMounts`      | Mounts that are only mapped into the init-containers. Can be used for additional preconfiguration.    | `[]`                |
| `extraVolumeMounts`          | **DEPRECATED** Additional volume mounts for init containers and the Gitea main container              | `[]`                |

### Init

| Name            | Description                                                           | Value |
| --------------- | --------------------------------------------------------------------- | ----- |
| `initPreScript` | Bash shell script copied verbatim to the start of the init-container. | `""`  |

### Signing

| Name              | Description                  | Value              |
| ----------------- | ---------------------------- | ------------------ |
| `signing.enabled` | Enable commit/action signing | `false`            |
| `signing.gpgHome` | GPG home directory           | `/data/git/.gnupg` |

### Gitea

| Name                                   | Description                                                                                                   | Value                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| `gitea.admin.username`                 | Username for the Gitea admin user                                                                             | `gitea_admin`        |
| `gitea.admin.existingSecret`           | Use an existing secret to store admin user credentials                                                        | `nil`                |
| `gitea.admin.password`                 | Password for the Gitea admin user                                                                             | `r8sA8CPHD9!bt6d`    |
| `gitea.admin.email`                    | Email for the Gitea admin user                                                                                | `gitea@local.domain` |
| `gitea.metrics.enabled`                | Enable Gitea metrics                                                                                          | `false`              |
| `gitea.metrics.serviceMonitor.enabled` | Enable Gitea metrics service monitor                                                                          | `false`              |
| `gitea.ldap`                           | LDAP configuration                                                                                            | `[]`                 |
| `gitea.oauth`                          | OAuth configuration                                                                                           | `[]`                 |
| `gitea.config`                         | Configuration for the Gitea server,ref: [config-cheat-sheet](https://docs.gitea.io/en-us/config-cheat-sheet/) | `{}`                 |
| `gitea.additionalConfigSources`        | Additional configuration from secret or configmap                                                             | `[]`                 |
| `gitea.additionalConfigFromEnvs`       | Additional configuration sources from environment variables                                                   | `[]`                 |
| `gitea.podAnnotations`                 | Annotations for the Gitea pod                                                                                 | `{}`                 |

### LivenessProbe

| Name                                      | Description                                      | Value  |
| ----------------------------------------- | ------------------------------------------------ | ------ |
| `gitea.livenessProbe.enabled`             | Enable liveness probe                            | `true` |
| `gitea.livenessProbe.tcpSocket.port`      | Port to probe for liveness                       | `http` |
| `gitea.livenessProbe.initialDelaySeconds` | Initial delay before liveness probe is initiated | `200`  |
| `gitea.livenessProbe.timeoutSeconds`      | Timeout for liveness probe                       | `1`    |
| `gitea.livenessProbe.periodSeconds`       | Period for liveness probe                        | `10`   |
| `gitea.livenessProbe.successThreshold`    | Success threshold for liveness probe             | `1`    |
| `gitea.livenessProbe.failureThreshold`    | Failure threshold for liveness probe             | `10`   |

### ReadinessProbe

| Name                                       | Description                                       | Value  |
| ------------------------------------------ | ------------------------------------------------- | ------ |
| `gitea.readinessProbe.enabled`             | Enable readiness probe                            | `true` |
| `gitea.readinessProbe.tcpSocket.port`      | Port to probe for readiness                       | `http` |
| `gitea.readinessProbe.initialDelaySeconds` | Initial delay before readiness probe is initiated | `5`    |
| `gitea.readinessProbe.timeoutSeconds`      | Timeout for readiness probe                       | `1`    |
| `gitea.readinessProbe.periodSeconds`       | Period for readiness probe                        | `10`   |
| `gitea.readinessProbe.successThreshold`    | Success threshold for readiness probe             | `1`    |
| `gitea.readinessProbe.failureThreshold`    | Failure threshold for readiness probe             | `3`    |

### StartupProbe

| Name                                     | Description                                     | Value   |
| ---------------------------------------- | ----------------------------------------------- | ------- |
| `gitea.startupProbe.enabled`             | Enable startup probe                            | `false` |
| `gitea.startupProbe.tcpSocket.port`      | Port to probe for startup                       | `http`  |
| `gitea.startupProbe.initialDelaySeconds` | Initial delay before startup probe is initiated | `60`    |
| `gitea.startupProbe.timeoutSeconds`      | Timeout for startup probe                       | `1`     |
| `gitea.startupProbe.periodSeconds`       | Period for startup probe                        | `10`    |
| `gitea.startupProbe.successThreshold`    | Success threshold for startup probe             | `1`     |
| `gitea.startupProbe.failureThreshold`    | Failure threshold for startup probe             | `10`    |

### Memcached

| Name                     | Description                                                                                                                                                                                           | Value   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `memcached.enabled`      | Memcached is loaded as a dependency from [Bitnami](https://github.com/bitnami/charts/tree/master/bitnami/memcached) if enabled in the values. Complete Configuration can be taken from their website. | `true`  |
| `memcached.service.port` | Port for Memcached                                                                                                                                                                                    | `11211` |

### PostgreSQL

| Name                                              | Description                                              | Value   |
| ------------------------------------------------- | -------------------------------------------------------- | ------- |
| `postgresql.enabled`                              | Enable PostgreSQL                                        | `true`  |
| `postgresql.global.postgresql.postgresqlDatabase` | PostgreSQL database (overrides postgresqlDatabase)       | `gitea` |
| `postgresql.global.postgresql.postgresqlUsername` | PostgreSQL username (overrides postgresqlUsername)       | `gitea` |
| `postgresql.global.postgresql.postgresqlPassword` | PostgreSQL admin password (overrides postgresqlPassword) | `gitea` |
| `postgresql.global.postgresql.servicePort`        | PostgreSQL port (overrides service.port)                 | `5432`  |
| `postgresql.persistence.size`                     | PVC Storage Request for PostgreSQL volume                | `10Gi`  |

### MySQL

| Name                     | Description                                                        | Value   |
| ------------------------ | ------------------------------------------------------------------ | ------- |
| `mysql.enabled`          | Enable MySQL                                                       | `false` |
| `mysql.root.password`    | Password for the root user. Ignored if existing secret is provided | `gitea` |
| `mysql.db.user`          | Username of new user to create.                                    | `gitea` |
| `mysql.db.password`      | Password for the new user.Ignored if existing secret is provided   | `gitea` |
| `mysql.db.name`          | Name for new database to create.                                   | `gitea` |
| `mysql.service.port`     | Port to connect to MySQL service                                   | `3306`  |
| `mysql.persistence.size` | PVC Storage Request for MySQL volume                               | `10Gi`  |

### MariaDB

| Name                               | Description                                                       | Value   |
| ---------------------------------- | ----------------------------------------------------------------- | ------- |
| `mariadb.enabled`                  | Enable MariaDB                                                    | `false` |
| `mariadb.auth.database`            | Name of the database to create.                                   | `gitea` |
| `mariadb.auth.username`            | Username of the new user to create.                               | `gitea` |
| `mariadb.auth.password`            | Password for the new user. Ignored if existing secret is provided | `gitea` |
| `mariadb.auth.rootPassword`        | Password for the root user.                                       | `gitea` |
| `mariadb.primary.service.port`     | Port to connect to MariaDB service                                | `3306`  |
| `mariadb.primary.persistence.size` | Persistence size for MariaDB                                      | `10Gi`  |

### Advanced

| Name               | Description                                          | Value  |
| ------------------ | ---------------------------------------------------- | ------ |
| `checkDeprecation` | Set it to false to skip this basic validation check. | `true` |

## Contributing

Expected workflow is: Fork -> Patch -> Push -> Pull Request

See [CONTRIBUTORS GUIDE](CONTRIBUTING.md) for details.

## Upgrading

This section lists major and breaking changes of each Helm Chart version.
Please read them carefully to upgrade successfully.

### To 6.0.0

#### Different volume mounts for init-containers and runtime container

**The `extraVolumeMounts` is deprecated** in favor of `extraInitVolumeMounts` and
`extraContainerVolumeMounts`. You can now have different mounts for the initialization
phase and Gitea runtime. The deprecated `extraVolumeMounts` will still be available
for the time being and is mounted into every container. If you want to switch to
the new settings and want to mount specific volumes into all containers, you have
to configure their mount points within both new settings.

**Combining values from the deprecated setting with values from the new settings
is not possible.**

#### New `enabled` flag for `startupProbe`

Prior to this version the `startupProbe` was just a commented sample within the
`values.yaml`. With the migration to an auto-generated [Parameters](#parameters)
section, a new parameter `gitea.startupProbe.enabled` has been introduced set to
`false` by default.

If you are using the `startupProbe` you need to add that new
parameter and set it to `true`. Otherwise, your defined probe won't be considered
after the upgrade.

### To 5.0.0

> 💥 The Helm Chart now requires Gitea versions of at least 1.11.0.

#### Enable Dependencies

The values to enable the dependencies,
such as PostgreSQL, Memcached, MySQL and MariaDB
have been moved from `gitea.database.builtIn.` to the dependency values.

You can now enable the dependencies as followed:

```yaml
memcached:
  enabled: true

postgresql:
  enabled: true

mysql:
  enabled: false

mariadb:
  enabled: false
```

#### App.ini generation

The app.ini generation has changed and now utilizes the environment-to-ini
script provided by newer Gitea versions. This change ensures, that the app.ini
is now persistent.

##### Secret Key generation

Gitea secret keys (SECRET_KEY, INTERNAL_TOKEN, JWT_SECRET) are now generated
automatically in certain situations:

- New install: By default the secrets are created automatically. If you provide
  secrets via `gitea.config` they will be used instead of automatic generation.
- Existing installs: The secrets won't be deployed, neither via
  configuration nor via auto generation. We explicitly prevent to set new secrets.

> 💡 It would be possible to set new secret keys manually by entering
the running container and rewriting the app.ini by hand. However, this it is
not advisable to do so for existing installations. Certain settings like
_LDAP_ would not be readable anymore.

#### Probes

`gitea.customLivenessProbe`, `gitea.customReadinessProbe` and `gitea.customStartupProbe`
have been removed.

They are replaced by the settings `gitea.livenessProbe`, `gitea.readinessProbe`
and `gitea.startupProbe` which are now fully configurable and used _as-is_ for
a Chart deployment.
If you have customized their values instead of using the `custom` prefixed settings,
please ensure that you remove the `enabled` property from each of them.

In case you want to disable one of these probes, let's say the `livenessProbe`, add
the following to your values. The `podAnnotation` is just there to have a bit more
context.

```diff
gitea:
+ livenessProbe:
  podAnnotations: {}
```

#### Multiple OAuth and LDAP authentication sources

With `5.0.0` of this Chart it is now possible to configure Gitea with multiple
OAuth and LDAP sources. As a result, you need to update an existing OAuth/LDAP configuration
in your customized `values.yaml` by replacing the object with settings to a list
of settings objects. See [OAuth2 Settings](#oauth2-settings) and
[LDAP Settings](#ldap-settings) section for details.

### To 4.0.0

#### Ingress changes

To provide a more flexible Ingress configuration we now support not only host
settings but also provide configuration for the path and pathType. So this
change changes the hosts from a simple string list, to a list containing a more
complex object for more configuration.

```diff
ingress:
  enabled: false
  annotations: {}
    # kubernetes.io/ingress.class: nginx
    # kubernetes.io/tls-acme: "true"
-  hosts:
-    - git.example.com
+  hosts:
+    - host: git.example.com
+      paths:
+        - path: /
+          pathType: Prefix
  tls: []
  #  - secretName: chart-example-tls
  #    hosts:
  #      - git.example.com
```

If you want everything as it was before, you can simply add the following code
to all your host entries.

```yaml
paths:
  - path: /
    pathType: Prefix
```

#### Dropped kebab-case support

In 3.x.x it was possible to provide an ldap configuration via kebab-case, this
support has now been dropped and only camel case is supported. See [LDAP
section](#ldap-settings) for more information.

#### Dependency update

The chart comes with multiple databases and Memcached as dependency, the latest
release updated the dependencies.

- Memcached: `4.2.20` -> `5.9.0`
- PostgreSQL: `9.7.2` -> `10.3.17`
- MariaDB: `8.0.0` -> `9.3.6`

If you're using the builtin databases you will most likely redeploy the chart in
order to update the database correctly.

#### Execution of initPreScript

Generally spoken, this might not be a breaking change, but it is worth to be
mentioned.

Prior to `4.0.0` only one init container was used to both setup directories and
configure Gitea. As of now the actual Gitea configuration is separated from the
other pre-execution. This also includes the execution of _initPreScript_. If you
have such script, please be aware of this. Dynamically prepare the Gitea setup
during execution by e.g. adding environment variables to the execution context
won't work anymore.

### Misc

#### Gitea Version 1.14.X repository ROOT

Previously the ROOT folder for the Gitea repositories was located at
`/data/git/gitea-repositories`. In version `1.14` has the path been changed to
`/data/gitea-repositories`.

This chart will set the `gitea.config.repository.ROOT` value default to
`/data/git/gitea-repositories`.
