# Gitea Helm Chart

[Gitea](https://gitea.io/en-us/) is a community managed lightweight code hosting solution written in Go. It is published under the MIT license.

## Introduction

This helm chart has taken some inspiration from <https://github.com/jfelten/gitea-helm-chart>
But takes a completely different approach in providing a database and cache with dependencies.
Additionally, this chart provides LDAP and admin user configuration with values, as well as being deployed as a statefulset to retain stored repositories.

## Dependencies

Gitea can be run with an external database and cache. This chart provides those dependencies, which can be
enabled, or disabled via [configuration](#configuration).

Dependencies:

* Postgresql
* Memcached
* Mysql

## Installing

```sh
  helm repo add gitea-charts https://dl.gitea.io/charts/
  helm repo update
  helm install gitea gitea-charts/gitea
```

## Prerequisites

* Kubernetes 1.12+
* Helm 3.0+
* PV provisioner for persistent data support

## Chart upgrade from 3.x.x to 4.0.0

:warning: The most recent 4.0.0 update brings some breaking changes. Please note the following changes in the Chart to upgrade successfully. :warning:

### Ingress changes

To provide a more flexible Ingress configuration we now support not only host settings but also provide configuration for the path and pathType. So this change changes the hosts from a simple string list, to a list containing a more complex object for more configuration.


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

If you want everything as it was before, you can simply add the following code to all your host entries.

```yaml
paths:
  - path: /
    pathType: Prefix
```

### Dropped kebab-case support

In 3.x.x it was possible to provide an ldap configuration via kebab-case, this support has now been dropped and only camel case is supported.
See [LDAP section](#ldap-settings) for more information.

### Dependency update

The chart comes with multiple databases and memcached as dependency, the latest release updated the dependencies.

- memcached: 4.2.20 -> 5.9.0
- postgresql: 9.7.2 -> 10.3.17
- mariadb: 8.0.0 -> 9.3.6

If you're using the builtin databases you will most likely redeploy the chart in order to update the database correctly.

### Execution of initPreScript

Generally spoken, this might not be a breaking change, but it is worth to be mentioned.

Prior to 4.0.0 only one init container was used to both setup directories and configure Gitea. As of now the actual Gitea configuration is separated from the other pre-execution. This also includes the execution of _initPreScript_. If you have such script, please be aware of this. Dynamically prepare the Gitea setup during execution by e.g. adding environment variables to the execution context won't work anymore.

## Gitea Version 1.14.X repository ROOT

Previously the ROOT folder for the gitea repositories was located at /data/git/gitea-repositories
1.14 changed this to /data/gitea-repositories.

This chart will set the gitea.config.repository.ROOT value default to /data/git/gitea-repositories

## Configure Commit Signing

When using the rootless image the gpg key folder was is not persistent by default. If you consider using signed commits for internal Gitea activities (e.g. initial commit), you'd need to provide a signing key. Prior to [PR 186](https://gitea.com/gitea/helm-chart/pulls/186), imported keys had to be re-imported once the container got replaced by another.

The mentioned PR introduced a new configuration object `signing` allowing you to configure prerequisites for commit signing. By default this section is disabled to maintain backwards compatibility.

```yaml
  signing:
    enabled: false
    gpgHome: /data/git/.gnupg
```

## Examples

### Gitea Configuration

Gitea offers lots of configuration options. This is fully described in the [Gitea Cheat Sheet](https://docs.gitea.io/en-us/config-cheat-sheet/).

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

This chart will set a few defaults in the gitea configuration based on the service and ingress settings. All defaults can be overwritten in gitea.config.

INSTALL_LOCK is always set to true, since we want to configure gitea with this helm chart and everything is taken care of.

*All default settings are made directly in the generated app.ini, not in the Values.*

#### Database defaults

If a builtIn database is enabled the database configuration is set automatically. For example, postgresql builtIn will appear in the app.ini as:

```ini
[database]
DB_TYPE = postgres
HOST = RELEASE-NAME-postgresql.default.svc.cluster.local:5432
NAME = gitea
PASSWD = gitea
USER = gitea
```

#### Memcached defaults

Memcached is handled the exact same way as database builtIn. Once memcached builtIn is enabled, this chart will generate the following part in the app.ini:

```ini
[cache]
ADAPTER = memcache
ENABLED = true
HOST = RELEASE-NAME-memcached.default.svc.cluster.local:11211
```

#### Server defaults

The server defaults are a bit more complex.
If ingress is enabled, the ROOT_URL, DOMAIN and SSH_DOMAIN will be set accordingly. HTTP_PORT always defaults to 3000 as well as SSH_PORT to 22.

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

### External Database

An external Database can be used instead of builtIn postgresql or mysql.

```yaml
  gitea:
    database:
      builtIn:
        postgresql:
          enabled: false

    config:
      database:
        DB_TYPE: mysql
        HOST: 127.0.0.1:3306
        NAME: gitea
        USER: root
        PASSWD: gitea
        SCHEMA: gitea
```

### Ports and external url

By default port 3000 is used for web traffic and 22 for ssh. Those can be changed:

```yaml
  service:
    http:
      port: 3000
    ssh:
      port: 22
```

This helm chart automatically configures the clone urls to use the correct ports. You can change these ports by hand using the `gitea.config` dict. However you should know what you're doing.

### ClusterIP

By default the clusterIP will be set to None, which is the default for headless services. However if you want to omit the clusterIP field in the service, use the following values:

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

If you're using ingress and wan't to use SSH, keep in mind, that ingress is not able to forward SSH Ports.
You will need a LoadBalancer like metallb and a setting in your ssh service annotations.

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

This helm chart can use a built in cache. The default is memcached from bitnami.

```yaml
  gitea:
    cache:
      builtIn:
        enabled: true
```

If the built in cache should not be used simply configure the cache in gitea.config

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

Gitea will be deployed as a statefulset. By simply enabling the persistence and setting the storage class according to your cluster
everything else will be taken care of. The following example will create a PVC as a part of the statefulset. This PVC will not be deleted even if you uninstall the chart.

Please note, that an empty storageClass in the persistence will result in kubernetes using your default storage class.

If you want to use your own storageClass define it as followed:

```yaml
persistence:
  enabled: true
  storageClass: myOwnStorageClass
```

When using Postgresql as dependency, this will also be deployed as a statefulset by default.

If you want to manage your own PVC you can simply pass the PVC name to the chart.

```yaml
  persistence:
    enabled: true
    existingClaim: MyAwesomeGiteaClaim
```

In case that peristence has been disabled it will simply use an empty dir volume.

Postgresql handles the persistence in the exact same way.
You can interact with the postgres settings as displayed in the following example:

```yaml
  postgresql:
    persistence:
      enabled: true
      existingClaim: MyAwesomeGiteaPostgresClaim
```

Mysql also handles persistence the same, even though it is not deployed as a statefulset.
You can interact with the postgres settings as displayed in the following example:

```yaml
  mysql:
    persistence:
      enabled: true
      existingClaim: MyAwesomeGiteaMysqlClaim
```

### Admin User

This chart enables you to create a default admin user. It is also possible to update the password for this user by upgrading or redeloying the chart.
It is not possible to delete an admin user after it has been created. This has to be done in the ui.
You cannot use `admin` as username.

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

Like the admin user the LDAP settings can be updated, but also disabled or deleted.
All LDAP values from <https://docs.gitea.io/en-us/command-line/#admin> are available.

```yaml
  gitea:
    ldap:
      enabled: true
      name: 'MyAwesomeGiteaLdap'
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
      sshPublicKeyAttribute: sshPublicKey
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
      existingSecret: gitea-ldap-secret
```

:warning: Some options are just flags and therefore don't any values. If they are defined in `gitea.ldap` configuration, they will be passed to the gitea cli without any value. Affected options:

- notActive
- skipTlsVerify
- allowDeactivateAll
- synchronizeUsers
- attributesInBind

### OAuth2 Settings

Like the admin user, OAuth2 settings can be updated and disabled but not deleted. Deleting OAuth2 settings has to be done in the ui.
All OAuth2 values from <https://docs.gitea.io/en-us/command-line/#admin> are available.

```yaml
  gitea:
    oauth:
      enabled: true
      name: 'MyAwesomeGiteaOAuth'
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

### Metrics and profiling

A Prometheus `/metrics` endpoint on the `HTTP_PORT` and `pprof` profiling endpoints on port 6060 can be enabled under `gitea`. Beware that the metrics endpoint is exposed via the ingress, manage access using ingress annotations for example.

To deploy the `ServiceMonitor`, you first need to ensure that you have deployed `prometheus-operator` and its CRDs: https://github.com/prometheus-operator/prometheus-operator#customresourcedefinitions.

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

## Configuration

### Others

| Parameter                                 | Description                                            | Default     |
|-------------------------------------------|--------------------------------------------------------|-------------|
| statefulset.terminationGracePeriodSeconds | How long to wait until forcefully kill the pod         | 60          |
| statefulset.env                           | Additional environment variables to pass to containers | []          |
| extraVolumes                              | Additional volumes to mount to the Gitea statefulset   | {}          |
| extraVolumeMounts                         | Additional volume mounts for the Gitea containers      | {}          |
| initPreScript                             | Bash script copied verbatim to start of init container |             |
| securityContext                           | Run as a specific securityContext                      | {}          |
| schedulerName                             | Use an alternate scheduler, e.g. "stork"               |             |

### Image

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|image.repository| Image to start for this pod | gitea/gitea |
|image.tag| [Image tag](https://hub.docker.com/r/gitea/gitea/tags?page=1&ordering=last_updated) | 1.15.3 |
|image.pullPolicy| Image pull policy | Always |
|image.rootless | Wether or not to pull the rootless version of gitea, only works on gitea 1.14.x or higher | false |

### Persistence

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|persistence.enabled| Enable persistence for Gitea |true|
|persistence.existingClaim| Use an existing claim to store repository information | |
|persistence.size| Size for persistence to store repo information | 10Gi |
|persistence.accessModes|AccessMode for persistence||
|persistence.storageClass|Storage class for repository persistence||
|persistence.labels|Labels for the persistence volume claim to be created|{}|
|persistence.annotations|Annotations for the persistence volume claim to be created|{}|

### Ingress

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|ingress.enabled| enable ingress | false|
|ingress.annotations| add ingress annotations | |
|ingress.hosts[0].host | add hosts for ingress | git.example.com |
|ingress.hosts[0].paths[0].path | add path for each ingress host | / |
|ingress.hosts[0].paths[0].pathType | add ingress path type | Prefix |
|ingress.tls| add ingress tls settings|[]|
|ingress.className| add ingress class name. Only used in k8s 1.19+ | |

### Service

#### Web

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|service.http.type| Kubernetes service type for web traffic | ClusterIP |
|service.http.port| Port for web traffic | 3000 |
|service.http.clusterIP| ClusterIP setting for http autosetup for statefulset is None | None |
|service.http.loadBalancerIP| LoadBalancer Ip setting | |
|service.http.nodePort| NodePort for http service | |
|service.http.externalTrafficPolicy| If `service.http.type` is `NodePort` or `LoadBalancer`, set this to `Local` to enable source IP preservation | |
|service.http.externalIPs| http service external IP addresses | |
|service.http.loadBalancerSourceRanges| Source range filter for http loadbalancer | [] |
|service.http.annotations| http service annotations | |

#### SSH

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|service.ssh.type| Kubernetes service type for ssh traffic | ClusterIP |
|service.ssh.port| Port for ssh traffic | 22 |
|service.ssh.loadBalancerIP| LoadBalancer Ip setting | |
|service.ssh.nodePort| NodePort for ssh service | |
|service.ssh.externalTrafficPolicy| If `service.ssh.type` is `NodePort` or `LoadBalancer`, set this to `Local` to enable source IP preservation | |
|service.ssh.externalIPs| ssh service external IP addresses | |
|service.ssh.loadBalancerSourceRanges| Source range filter for ssh loadbalancer | [] |
|service.ssh.annotations| ssh service annotations | |

### Gitea Configuration

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|gitea.config | Everything in `app.ini` can be configured with this dict. See [Examples](#examples) for more details | {} |

### Gitea Probes

Configure Liveness, Readiness and Startup [Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|gitea.livenessProbe.enabled | Enable liveness probe | true |
|gitea.livenessProbe.initialDelaySeconds | Delay before probe start| 200 |
|gitea.livenessProbe.timeoutSeconds | probe timeout | 1 |
|gitea.livenessProbe.periodSeconds | period between probes | 10 |
|gitea.livenessProbe.successThreshold | Minimum consecutive success probes | 1 |
|gitea.livenessProbe.failureThreshold | Minimum consecutive error probes | 10 |
|gitea.readinessProbe.enabled | Enable readiness probe | true |
|gitea.readinessProbe.initialDelaySeconds | Delay before probe start| 5 |
|gitea.readinessProbe.timeoutSeconds | probe timeout | 1 |
|gitea.readinessProbe.periodSeconds | period between probes | 10 |
|gitea.readinessProbe.successThreshold | Minimum consecutive success probes | 1 |
|gitea.readinessProbe.failureThreshold | Minimum consecutive error probes | 3 |
|gitea.startupProbe.enabled | Enable startup probe | false |
|gitea.startupProbe.initialDelaySeconds | Delay before probe start| 60 |
|gitea.startupProbe.timeoutSeconds | probe timeout | 1 |
|gitea.startupProbe.periodSeconds | period between probes | 10 |
|gitea.startupProbe.successThreshold | Minimum consecutive success probes | 1 |
|gitea.startupProbe.failureThreshold | Minimum consecutive error probes | 10 |
|gitea.customLivenessProbe | Custom liveness probe (needs `gitea.livenessProbe.enabled: false`) |  |
|gitea.customReadinessProbe | Custom readiness probe (needs `gitea.readinessProbe.enabled: false`) |  |
|gitea.customStartupProbe | Custom startup probe (needs `gitea.startupProbe.enabled: false`) |  |

### Memcached BuiltIn

Memcached is loaded as a dependency from [Bitnami](https://github.com/bitnami/charts/tree/master/bitnami/memcached) if enabled in the values. Complete Configuration can be taken from their website.

The following parameters are the defaults set by this chart

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|memcached.service.port|Memcached Port| 11211|

### Mysql BuiltIn

Mysql is loaded as a dependency from stable. Configuration can be found on this [website](https://github.com/helm/charts/tree/master/stable/mysql).

The following parameters are the defaults set by this chart

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|mysql.root.password|Password for the root user. Ignored if existing secret is provided|gitea|
|mysql.db.user|Username of new user to create.|gitea|
|mysql.db.password|Password for the new user. Ignored if existing secret is provided|gitea|
|mysql.db.name|Name for new database to create.|gitea|
|mysql.service.port|Port to connect to mysql service|3306|
|mysql.persistence.size|Persistence size for mysql |10Gi|

### Postgresql BuiltIn

Postgresql is loaded as a dependency from Bitnami. The chart configuration can be found in this [Bitnami](https://github.com/bitnami/charts/tree/master/bitnami/postgresql) repository.

The following parameters are the defaults set by this chart

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|postgresql.global.postgresql.postgresqlDatabase| PostgreSQL database (overrides postgresqlDatabase)|gitea|
|postgresql.global.postgresql.postgresqlUsername| PostgreSQL username (overrides postgresqlUsername)|gitea|
|postgresql.global.postgresql.postgresqlPassword| PostgreSQL admin password (overrides postgresqlPassword)|gitea|
|postgresql.global.postgresql.servicePort|PostgreSQL port (overrides service.port)|5432|
|postgresql.persistence.size| PVC Storage Request for PostgreSQL volume |10Gi|

### MariaDB BuiltIn

MariaDB is loaded as a dependency from bitnami. Configuration can be found in this [Bitnami](https://github.com/bitnami/charts/tree/master/bitnami/mariadb) repository.

The following parameters are the defaults set by this chart

| Parameter           | Description                       | Default                      |
|---------------------|-----------------------------------|------------------------------|
|mariadb.auth.username|Username of new user to create.|gitea|
|mariadb.auth.password|Password for the new user. Ignored if existing secret is provided|gitea|
|mariadb.auth.database|Name for new database to create.|gitea|
|mariadb.auth.rootPassword|Password for the root user.|gitea|
|mariadb.primary.service.port|Port to connect to mariadb service|3306|
|mariadb.primary.persistence.size|Persistence size for mariadb |10Gi|

## Local development & testing

For local development and testing of pull requests, the following workflow can be used:

1. Install `minikube` and `helm`.
2. Start a `minikube` cluster via `minikube start`.
3. From the `gitea/helm-chart` directory execute `helm install --dependency-update gitea . -f values.yaml`.
   This will install the dependencies listed in `Chart.yml` and deploy the current state of the helm chart found locally.
   If you want to test a branch, make sure to switch to the respective branch first.
4. Gitea is now deployed in `minikube`.
   To access it, it's port needs to be forwarded first from `minikube` to localhost first via `kubectl --namespace default port-forward svc/gitea-http 3000:3000`.
   Now Gitea is accessible at http://localhost:3000.
