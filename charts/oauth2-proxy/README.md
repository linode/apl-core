# oauth2-proxy

[oauth2-proxy](https://github.com/oauth2-proxy/oauth2-proxy) is a reverse proxy and static file server that provides authentication using Providers (Google, GitHub, and others) to validate accounts by e-mail, domain, or group.

## TL;DR;

```console
$ helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
$ helm install my-release oauth2-proxy/oauth2-proxy
```

## Introduction

This chart bootstraps an oauth2-proxy deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

## Installing the Chart

To install the chart with the release name `my-release`:

```console
$ helm install my-release oauth2-proxy/oauth2-proxy
```

The command deploys oauth2-proxy on the Kubernetes cluster in the default configuration.
The [configuration](#configuration) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
$ helm uninstall my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading an existing Release to a new major version

A major chart version change (like v1.2.3 -> v2.0.0) indicates an incompatible breaking change needing manual actions.

### To 1.0.0

This version upgrades oauth2-proxy to v4.0.0. To upgrade, please see the [changelog](https://github.com/oauth2-proxy/oauth2-proxy/blob/v4.0.0/CHANGELOG.md#v400).

### To 2.0.0

Version 2.0.0 of this chart introduces support for Kubernetes v1.16.x by addressing the Deployment object apiVersion `apps/v1beta2` deprecation.
See [the v1.16 API deprecations page](https://kubernetes.io/blog/2019/07/18/api-deprecations-in-1-16/) for more information.

Due to [this issue](https://github.com/helm/helm/issues/6583), errors may occur when performing a `helm upgrade` of this chart from versions earlier than 2.0.0.

### To 3.0.0

Version 3.0.0 introduces support for [EKS IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html) by adding a managed service account to the chart.
This is a breaking change since the service account is enabled by default.
To disable this behaviour set `serviceAccount.enabled` to `false`

### To 4.0.0

Version 4.0.0 adds support for the new Ingress apiVersion **networking.k8s.io/v1**.
Therefore, the `ingress.extraPaths` parameter must be updated to the new format.
See the [v1.22 API deprecations guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#ingress-v122) for more information.

For the same reason `service.port` was renamed to `service.portNumber`.

### To 5.0.0

Version 5.0.0 introduces support for custom labels and refactor [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/). 
This is a breaking change because many labels of all resources need to be updated to stay consistent.

In order to upgrade, delete the Deployment before upgrading:

```bash
kubectl delete deployment my-release-oauth2-proxy
```

This will introduce a slight downtime.

For users who don't want downtime, you can perform these actions:

- Perform a non-cascading removal of the deployment that keeps the pods running
- Add new labels to pods
- Perform `helm upgrade`

### To 6.0.0

Version 6.0.0 bumps the version of the Redis subchart from ~10.6.0 to ~16.4.0. 
You probably need to adjust your Redis configuration. 
See [here](https://github.com/bitnami/charts/tree/master/bitnami/redis#upgrading) for detailed upgrade instructions.

### To 7.0.0

Version 7.0.0 introduces a new implementation to support multiple hostAliases. 
You probably need to adjust your hostAliases config. 
See [here](https://github.com/oauth2-proxy/manifests/pull/164/) for detailed information.

## Configuration

The following table lists the configurable parameters of the oauth2-proxy chart and their default values.

| Parameter                                             | Description                                                                                                                                                                                                                                                      | Default                                                                          |
|-------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `affinity`                                            | node/pod affinities                                                                                                                                                                                                                                              | None                                                                             |
| `authenticatedEmailsFile.enabled`                     | Enables authorize individual e-mail addresses                                                                                                                                                                                                                    | `false`                                                                          |
| `authenticatedEmailsFile.persistence`                 | Defines how the e-mail addresses file will be projected, via a configmap or secret                                                                                                                                                                               | `configmap`                                                                      |
| `authenticatedEmailsFile.template`                    | Name of the configmap or secret that is handled outside of that chart                                                                                                                                                                                            | `""`                                                                             |
| `authenticatedEmailsFile.restrictedUserAccessKey`     | The key of the configmap or secret that holds the e-mail addresses list                                                                                                                                                                                          | `""`                                                                             |
| `authenticatedEmailsFile.restricted_access`           | [e-mail addresses](https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/#email-authentication) list config                                                                                                                                        | `""`                                                                             |
| `authenticatedEmailsFile.annotations`                 | configmap or secret annotations                                                                                                                                                                                                                                  | `nil`                                                                            |
| `config.clientID`                                     | oauth client ID                                                                                                                                                                                                                                                  | `""`                                                                             |
| `config.clientSecret`                                 | oauth client secret                                                                                                                                                                                                                                              | `""`                                                                             |
| `config.cookieSecret`                                 | server specific cookie for the secret; create a new one with `openssl rand -base64 32 \| head -c 32 \| base64`                                                                                                                                                   | `""`                                                                             |
| `config.existingSecret`                               | existing Kubernetes secret to use for OAuth2 credentials. See [oauth2-proxy.secrets helper](https://github.com/oauth2-proxy/manifests/blob/main/helm/oauth2-proxy/templates/_helpers.tpl#L157C13-L157C33) for the required values                                | `nil`                                                                            |
| `config.configFile`                                   | custom [oauth2_proxy.cfg](https://github.com/oauth2-proxy/oauth2-proxy/blob/master/contrib/oauth2-proxy.cfg.example) contents for settings not overridable via environment nor command line                                                                      | `""`                                                                             |
| `config.existingConfig`                               | existing Kubernetes configmap to use for the configuration file. See [config template](https://github.com/oauth2-proxy/manifests/blob/master/helm/oauth2-proxy/templates/configmap.yaml) for the required values                                                 | `nil`                                                                            |
| `config.cookieName`                                   | The name of the cookie that oauth2-proxy will create.                                                                                                                                                                                                            | `""`                                                                             |
| `autoscaling.enabled`                                 | Deploy a Horizontal Pod Autoscaler.                                                                                                                                                                                                                              | `false`                                                                          |
| `autoscaling.minReplicas`                             | Minimum replicas for the Horizontal Pod Autoscaler.                                                                                                                                                                                                              | `1`                                                                              |
| `autoscaling.maxReplicas`                             | Maximum replicas for the Horizontal Pod Autoscaler.                                                                                                                                                                                                              | `10`                                                                             |
| `autoscaling.targetCPUUtilizationPercentage`          | Horizontal Pod Autoscaler setting.                                                                                                                                                                                                                               | `80`                                                                             |
| `autoscaling.targetMemoryUtilizationPercentage`       | Horizontal Pod Autoscaler setting.                                                                                                                                                                                                                               | ``                                                                               |
| `autoscaling.annotations`                             | Horizontal Pod Autoscaler annotations.                                                                                                                                                                                                                           | `{}`                                                                             |
| `alphaConfig.enabled`                                 | Flag to toggle any alpha config-related logic                                                                                                                                                                                                                    | `false`                                                                          |
| `alphaConfig.annotations`                             | Configmap annotations                                                                                                                                                                                                                                            | `{}`                                                                             |
| `alphaConfig.serverConfigData`                        | Arbitrary configuration data to append to the server section                                                                                                                                                                                                     | `{}`                                                                             |
| `alphaConfig.metricsConfigData`                       | Arbitrary configuration data to append to the metrics section                                                                                                                                                                                                    | `{}`                                                                             |
| `alphaConfig.configData`                              | Arbitrary configuration data to append                                                                                                                                                                                                                           | `{}`                                                                             |
| `alphaConfig.configFile`                              | Arbitrary configuration to append, treated as a Go template and rendered with the root context                                                                                                                                                                   | `""`                                                                             |
| `alphaConfig.existingConfig`                          | existing Kubernetes configmap to use for the alpha configuration file. See [config template](https://github.com/oauth2-proxy/manifests/blob/master/helm/oauth2-proxy/templates/secret-alpha.yaml) for the required values                                        | `nil`                                                                            |
| `alphaConfig.existingSecret`                          | existing Kubernetes secret to use for the alpha configuration file. See [config template](https://github.com/oauth2-proxy/manifests/blob/master/helm/oauth2-proxy/templates/secret-alpha.yaml) for the required values                                           | `nil`                                                                            |
| `customLabels`                                        | Custom labels to add into metadata                                                                                                                                                                                                                               | `{}`                                                                             |
| `config.google.adminEmail`                            | user impersonated by the Google service account                                                                                                                                                                                                                  | `""`                                                                             |
| `config.google.useApplicationDefaultCredentials`      | use the application-default credentials (i.e. Workload Identity on GKE) instead of providing a service account JSON                                                                                                                                              | `false`                                                                          |
| `config.google.targetPrincipal`                       | service account to use/impersonate                                                                                                                                                                                                                               | `""`                                                                             |
| `config.google.serviceAccountJson`                    | Google service account JSON contents                                                                                                                                                                                                                             | `""`                                                                             |
| `config.google.existingConfig`                        | existing Kubernetes configmap to use for the service account file. See [Google secret template](https://github.com/oauth2-proxy/manifests/blob/master/helm/oauth2-proxy/templates/google-secret.yaml) for the required values                                    | `nil`                                                                            |
| `config.google.groups`                                | restrict logins to members of these Google groups                                                                                                                                                                                                                | `[]`                                                                             |
| `containerPort`                                       | used to customize port on the deployment                                                                                                                                                                                                                         | `""`                                                                             |
| `extraArgs`                                           | Extra arguments to give the binary. Either as a map with key:value pairs or as a list type, which allows the same flag to be configured multiple times. (e.g. `["--allowed-role=CLIENT_ID:CLIENT_ROLE_NAME_A", "--allowed-role=CLIENT_ID:CLIENT_ROLE_NAME_B"]`). | `{}` or `[]`                                                                     |
| `extraContainers`                                     | List of extra containers to be added to the pod                                                                                                                                                                                                                  | `[]`                                                                             |
| `extraEnv`                                            | key:value list of extra environment variables to give the binary                                                                                                                                                                                                 | `[]`                                                                             |
| `extraVolumes`                                        | list of extra volumes                                                                                                                                                                                                                                            | `[]`                                                                             |
| `extraVolumeMounts`                                   | list of extra volumeMounts                                                                                                                                                                                                                                       | `[]`                                                                             |
| `hostAliases`                                         | hostAliases is a list of aliases to be added to /etc/hosts for network name resolution.                                                                                                                                                                          |                                                                                  |
| `htpasswdFile.enabled`                                | enable htpasswd-file option                                                                                                                                                                                                                                      | `false`                                                                          |
| `htpasswdFile.entries`                                | list of [encrypted user:passwords](https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview#command-line-options)                                                                                                                                      | `{}`                                                                             |
| `htpasswdFile.existingSecret`                         | existing Kubernetes secret to use for OAuth2 htpasswd file                                                                                                                                                                                                       | `""`                                                                             |
| `httpScheme`                                          | `http` or `https`. `name` used for the port on the deployment. `httpGet` port `name` and `scheme` used for `liveness`- and `readinessProbes`. `name` and `targetPort` used for the service.                                                                      | `http`                                                                           |
| `image.pullPolicy`                                    | Image pull policy                                                                                                                                                                                                                                                | `IfNotPresent`                                                                   |
| `image.command`                                       | Define command to be executed by container at startup                                                                                                                                                                                                            | `[]`                                                                             |
| `image.repository`                                    | Image repository                                                                                                                                                                                                                                                 | `quay.io/oauth2-proxy/oauth2-proxy`                                              |
| `image.tag`                                           | Image tag                                                                                                                                                                                                                                                        | `""` (defaults to appVersion)                                                    |
| `imagePullSecrets`                                    | Specify image pull secrets                                                                                                                                                                                                                                       | `nil` (does not add image pull secrets to deployed pods)                         |
| `ingress.enabled`                                     | Enable Ingress                                                                                                                                                                                                                                                   | `false`                                                                          |
| `ingress.className`                                   | name referencing IngressClass                                                                                                                                                                                                                                    | `nil`                                                                            |
| `ingress.path`                                        | Ingress accepted path                                                                                                                                                                                                                                            | `/`                                                                              |
| `ingress.pathType`                                    | Ingress [path type](https://kubernetes.io/docs/concepts/services-networking/ingress/#path-types)                                                                                                                                                                 | `ImplementationSpecific`                                                         |
| `ingress.extraPaths`                                  | Ingress extra paths to prepend to every host configuration. Useful when configuring [custom actions with AWS ALB Ingress Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.8/guide/ingress/annotations/).                            | `[]`                                                                             |
| `ingress.labels`                                      | Ingress extra labels                                                                                                                                                                                                                                             | `{}`                                                                             |
| `ingress.annotations`                                 | Ingress annotations                                                                                                                                                                                                                                              | `nil`                                                                            |
| `ingress.hosts`                                       | Ingress accepted hostnames                                                                                                                                                                                                                                       | `nil`                                                                            |
| `ingress.tls`                                         | Ingress TLS configuration                                                                                                                                                                                                                                        | `nil`                                                                            |
| `initContainers.waitForRedis.enabled`                 | If `redis.enabled` is true, use an init container to wait for the Redis master pod to be ready. If `serviceAccount.enabled` is true, create additionally a role/binding to get, list, and watch the Redis master pod                                             | `true`                                                                           |
| `initContainers.waitForRedis.image.pullPolicy`        | kubectl image pull policy                                                                                                                                                                                                                                        | `IfNotPresent`                                                                   |
| `initContainers.waitForRedis.image.repository`        | kubectl image repository                                                                                                                                                                                                                                         | `docker.io/bitnami/kubectl`                                                      |
| `initContainers.waitForRedis.kubectlVersion`          | kubectl version to use for the init container                                                                                                                                                                                                                    | `printf "%s.%s" .Capabilities.KubeVersion.Major (.Capabilities.KubeVersion.Minor | replace "+" "")`
| `initContainers.waitForRedis.securityContext.enabled` | enable Kubernetes security context on container                                                                                                                                                                                                                  | `true`                                                                           |
| `initContainers.waitForRedis.timeout`                 | number of seconds                                                                                                                                                                                                                                                | 180                                                                              |
| `initContainers.waitForRedis.resources`               | pod resource requests & limits                                                                                                                                                                                                                                   | `{}`                                                                             |
| `livenessProbe.enabled`                               | enable Kubernetes livenessProbe. Disable to use oauth2-proxy with Istio mTLS. See [Istio FAQ](https://istio.io/help/faq/security/#k8s-health-checks)                                                                                                             | `true`                                                                           |
| `livenessProbe.initialDelaySeconds`                   | number of seconds                                                                                                                                                                                                                                                | 0                                                                                |
| `livenessProbe.timeoutSeconds`                        | number of seconds                                                                                                                                                                                                                                                | 1                                                                                |
| `namespaceOverride`                                   | Override the deployment namespace                                                                                                                                                                                                                                | `""`                                                                             |
| `nodeSelector`                                        | node labels for pod assignment                                                                                                                                                                                                                                   | `{}`                                                                             |
| `deploymentAnnotations`                               | annotations to add to the deployment                                                                                                                                                                                                                             | `{}`                                                                             |
| `podAnnotations`                                      | annotations to add to each pod                                                                                                                                                                                                                                   | `{}`                                                                             |
| `podLabels`                                           | additional labels to add to each pod                                                                                                                                                                                                                             | `{}`                                                                             |
| `podDisruptionBudget.enabled`                         | Enabled creation of PodDisruptionBudget (only if replicaCount > 1)                                                                                                                                                                                               | true                                                                             |
| `podDisruptionBudget.minAvailable`                    | minAvailable parameter for PodDisruptionBudget                                                                                                                                                                                                                   | 1                                                                                |
| `podSecurityContext`                                  | Kubernetes security context to apply to pod                                                                                                                                                                                                                      | `{}`                                                                             |
| `priorityClassName`                                   | priorityClassName                                                                                                                                                                                                                                                | `nil`                                                                            |
| `readinessProbe.enabled`                              | enable Kubernetes readinessProbe. Disable to use oauth2-proxy with Istio mTLS. See [Istio FAQ](https://istio.io/help/faq/security/#k8s-health-checks)                                                                                                            | `true`                                                                           |
| `readinessProbe.initialDelaySeconds`                  | number of seconds                                                                                                                                                                                                                                                | 0                                                                                |
| `readinessProbe.timeoutSeconds`                       | number of seconds                                                                                                                                                                                                                                                | 5                                                                                |
| `readinessProbe.periodSeconds`                        | number of seconds                                                                                                                                                                                                                                                | 10                                                                               |
| `readinessProbe.successThreshold`                     | number of successes                                                                                                                                                                                                                                              | 1                                                                                |
| `replicaCount`                                        | desired number of pods                                                                                                                                                                                                                                           | `1`                                                                              |
| `resources`                                           | pod resource requests & limits                                                                                                                                                                                                                                   | `{}`                                                                             |
| `revisionHistoryLimit`                                | maximum number of revisions maintained                                                                                                                                                                                                                           | 10                                                                               |
| `service.portNumber`                                  | port number for the service                                                                                                                                                                                                                                      | `80`                                                                             |
| `service.appProtocol`                                 | application protocol on the port of the service                                                                                                                                                                                                                  | `http`                                                                           |
| `service.externalTrafficPolicy`                       | denotes if the service desires to route external traffic to node-local or cluster-wide endpoints                                                                                                                                                                 | `Cluster`                                                                        |
| `service.internalTrafficPolicy`                       | denotes if the service desires to route internal traffic to node-local or cluster-wide endpoints                                                                                                                                                                 | `Cluster`                                                                        |
| `service.type`                                        | type of service                                                                                                                                                                                                                                                  | `ClusterIP`                                                                      |
| `service.clusterIP`                                   | cluster ip address                                                                                                                                                                                                                                               | `nil`                                                                            |
| `service.loadBalancerIP`                              | ip of load balancer                                                                                                                                                                                                                                              | `nil`                                                                            |
| `service.loadBalancerSourceRanges`                    | allowed source ranges in load balancer                                                                                                                                                                                                                           | `nil`                                                                            |
| `service.nodePort`                                    | external port number for the service when service.type is `NodePort`                                                                                                                                                                                             | `nil`                                                                            |
| `serviceAccount.enabled`                              | create a service account                                                                                                                                                                                                                                         | `true`                                                                           |
| `serviceAccount.name`                                 | the service account name                                                                                                                                                                                                                                         | ``                                                                               |
| `serviceAccount.annotations`                          | (optional) annotations for the service account                                                                                                                                                                                                                   | `{}`                                                                             |
| `strategy`                                            | configure deployment strategy                                                                                                                                                                                                                                    | `{}`                                                                             |
| `tolerations`                                         | list of node taints to tolerate                                                                                                                                                                                                                                  | `[]`                                                                             |
| `securityContext.enabled`                             | enable Kubernetes security context on container                                                                                                                                                                                                                  | `true`                                                                           |
| `proxyVarsAsSecrets`                                  | Choose between environment values or secrets for setting up OAUTH2_PROXY variables. When set to false, remember to add the variables OAUTH2_PROXY_CLIENT_ID, OAUTH2_PROXY_CLIENT_SECRET, OAUTH2_PROXY_COOKIE_SECRET in extraEnv                                  | `true`                                                                           |
| `sessionStorage.type`                                 | Session storage type which can be one of the following: cookie or Redis                                                                                                                                                                                          | `cookie`                                                                         |
| `sessionStorage.redis.existingSecret`                 | Name of the Kubernetes secret containing the Redis & Redis sentinel password values (see also `sessionStorage.redis.passwordKey`)                                                                                                                                | `""`                                                                             |
| `sessionStorage.redis.password`                       | Redis password. Applicable for all Redis configurations. Taken from Redis subchart secret if not set. `sessionStorage.redis.existingSecret` takes precedence                                                                                                     | `nil`                                                                            |
| `sessionStorage.redis.passwordKey`                    | Key of the Kubernetes secret data containing the Redis password value                                                                                                                                                                                            | `redis-password`                                                                 |
| `sessionStorage.redis.clientType`                     | Allows the user to select which type of client will be used for the Redis instance. Possible options are: `sentinel`, `cluster` or `standalone`                                                                                                                  | `standalone`                                                                     |
| `sessionStorage.redis.standalone.connectionUrl`       | URL of Redis standalone server for Redis session storage (e.g., `redis://HOST[:PORT]`). Automatically generated if not set.                                                                                                                                      | `""`                                                                             |
| `sessionStorage.redis.cluster.connectionUrls`         | List of Redis cluster connection URLs (e.g., `["redis://127.0.0.1:8000", "redis://127.0.0.1:8000"]`)                                                                                                                                                             | `[]`                                                                             |
| `sessionStorage.redis.sentinel.existingSecret`        | Name of the Kubernetes secret containing the Redis sentinel password value (see also `sessionStorage.redis.sentinel.passwordKey`). Default: `sessionStorage.redis.existingSecret`                                                                                | `""`                                                                             |
| `sessionStorage.redis.sentinel.password`              | Redis sentinel password. Used only for sentinel connection; any Redis node passwords need to use `sessionStorage.redis.password`                                                                                                                                 | `nil`                                                                            |
| `sessionStorage.redis.sentinel.passwordKey`           | Key of the Kubernetes secret data containing the Redis sentinel password value                                                                                                                                                                                   | `redis-sentinel-password`                                                        |
| `sessionStorage.redis.sentinel.masterName`            | Redis sentinel master name                                                                                                                                                                                                                                       | `nil`                                                                            |
| `sessionStorage.redis.sentinel.connectionUrls`        | List of Redis sentinel connection URLs (e.g. `["redis://127.0.0.1:8000", "redis://127.0.0.1:8000"]`)                                                                                                                                                             | `[]`                                                                             |
| `topologySpreadConstraints`                           | List of pod topology spread constraints                                                                                                                                                                                                                          | `[]`                                                                             |
| `redis.enabled`                                       | Enable the Redis subchart deployment                                                                                                                                                                                                                             | `false`                                                                          |
| `checkDeprecation`                                    | Enable deprecation checks                                                                                                                                                                                                                                        | `true`                                                                           |
| `metrics.enabled`                                     | Enable Prometheus metrics endpoint                                                                                                                                                                                                                               | `true`                                                                           |
| `metrics.port`                                        | Serve Prometheus metrics on this port                                                                                                                                                                                                                            | `44180`                                                                          |
| `metrics.nodePort`                                    | External port for the metrics when service.type is `NodePort`                                                                                                                                                                                                    | `nil`                                                                            |
| `metrics.service.appProtocol`                         | application protocol of the metrics port in the service                                                                                                                                                                                                          | `http`                                                                           |
| `metrics.serviceMonitor.enabled`                      | Enable Prometheus Operator ServiceMonitor                                                                                                                                                                                                                        | `false`                                                                          |
| `metrics.serviceMonitor.namespace`                    | Define the namespace where to deploy the ServiceMonitor resource                                                                                                                                                                                                 | `""`                                                                             |
| `metrics.serviceMonitor.prometheusInstance`           | Prometheus Instance definition                                                                                                                                                                                                                                   | `default`                                                                        |
| `metrics.serviceMonitor.interval`                     | Prometheus scrape interval                                                                                                                                                                                                                                       | `60s`                                                                            |
| `metrics.serviceMonitor.scrapeTimeout`                | Prometheus scrape timeout                                                                                                                                                                                                                                        | `30s`                                                                            |
| `metrics.serviceMonitor.labels`                       | Add custom labels to the ServiceMonitor resource                                                                                                                                                                                                                 | `{}`                                                                             |
| `metrics.serviceMonitor.scheme`                       | HTTP scheme for scraping. It can be used with `tlsConfig` for example, if using Istio mTLS.                                                                                                                                                                      | `""`                                                                             |
| `metrics.serviceMonitor.tlsConfig`                    | TLS configuration when scraping the endpoint. For example, if using Istio mTLS.                                                                                                                                                                                  | `{}`                                                                             |
| `metrics.serviceMonitor.bearerTokenFile`              | Path to bearer token file.                                                                                                                                                                                                                                       | `""`                                                                             |
| `metrics.serviceMonitor.annotations`                  | Used to pass annotations that are used by the Prometheus installed in your cluster                                                                                                                                                                               | `{}`                                                                             |
| `metrics.serviceMonitor.metricRelabelings`            | Metric relabel configs to apply to samples before ingestion.                                                                                                                                                                                                     | `[]`                                                                             |
| `metrics.serviceMonitor.relabelings`                  | Relabel configs to apply to samples before ingestion.                                                                                                                                                                                                            | `[]`                                                                             |
| `extraObjects`                                        | Extra K8s manifests to deploy                                                                                                                                                                                                                                    | `[]`                                                                             |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
$ helm install my-release oauth2-proxy/oauth2-proxy \
  --set=image.tag=v0.0.2,resources.limits.cpu=200m
```

Alternatively, a YAML file that specifies the values for the above parameters can be provided while installing the chart. For example,

```console
$ helm install my-release oauth2-proxy/oauth2-proxy -f values.yaml
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## TLS Configuration

See: [TLS Configuration](https://oauth2-proxy.github.io/oauth2-proxy/configuration/tls/).
Use ```values.yaml``` like:

```yaml
...
extraArgs:
  tls-cert-file: /path/to/cert.pem
  tls-key-file: /path/to/cert.key

extraVolumes:
  - name: ssl-cert
    secret:
      secretName: my-ssl-secret

extraVolumeMounts:
  - mountPath: /path/to/
    name: ssl-cert
...
```

With a secret called `my-ssl-secret`:

```yaml
...
data:
  cert.pem: AB..==
  cert.key: CD..==
```

## Extra environment variable templating
The extraEnv value supports the tpl function, which evaluates strings as templates inside the deployment template.
This is useful for passing a template string as a value to the chart's extra environment variables and rendering external configuration environment values.

```yaml
...
tplValue: "This is a test value for the tpl function"
extraEnv:
  - name: TEST_ENV_VAR_1
    value: test_value_1
  - name: TEST_ENV_VAR_2
    value: '{{ .Values.tplValue }}'
```

## Custom templates configuration
You can replace the default template files using a Kubernetes `configMap` volume. The default templates are the two files [sign_in.html](https://github.com/oauth2-proxy/oauth2-proxy/blob/master/pkg/app/pagewriter/sign_in.html) and [error.html](https://github.com/oauth2-proxy/oauth2-proxy/blob/master/pkg/app/pagewriter/error.html).

```yaml
config:
  configFile: |
    ...
    custom_templates_dir = "/data/custom-templates"

extraVolumes:
  - name: custom-templates
    configMap:
      name: oauth2-proxy-custom-templates

extraVolumeMounts:
  - name: custom-templates
    mountPath: "/data/custom-templates"
    readOnly: true

extraObjects:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: oauth2-proxy-custom-templates
    data:
      sign_in.html: |
        <!DOCTYPE html>
        <html>
        <body>sign_in</body>
        </html>
      error.html: |
        <!DOCTYPE html>
        <html>
        <body>
        <h1>error</h1>
        <p>{{.StatusCode}}</p>
        </body>
        </html>
```

## Multi whitelist-domain configuration
You must use the config.configFile section for a multi-whitelist-domain configuration for one Oauth2-proxy instance.

It will be overwriting the `/etc/oauth2_proxy/oauth2_proxy.cfg` [configuration file](https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview#config-file).
In this example, Google provider is used, but you can find all other provider configurations here [oauth_provider](https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/).

```
config:
  ...
  clientID="$YOUR_GOOGLE_CLIENT_ID"
  clientSecret="$YOUR_GOOGLE_CLIENT_SECRET"
  cookieSecret="$YOUR_COOKIE_SECRET"
  configFile: |
    ...
    email_domains = [ "*" ]
    upstreams = [ "file:///dev/null" ]
    cookie_secure = "false"
    cookie_domains = [ ".domain.com", ".example.io" ]
    whitelist_domains = [ ".domain.com", ".example.io"]
    provider = "google"
```
