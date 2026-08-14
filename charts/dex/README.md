# dex

![version: 0.24.1](https://img.shields.io/badge/version-0.24.1-informational?style=flat-square) ![type: application](https://img.shields.io/badge/type-application-informational?style=flat-square) ![app version: 2.44.0](https://img.shields.io/badge/app%20version-2.44.0-informational?style=flat-square) ![kube version: >=1.14.0-0](https://img.shields.io/badge/kube%20version->=1.14.0--0-informational?style=flat-square) [![artifact hub](https://img.shields.io/badge/artifact%20hub-dex-informational?style=flat-square)](https://artifacthub.io/packages/helm/dex/dex)

OpenID Connect (OIDC) identity and OAuth 2.0 provider with pluggable connectors.

**Homepage:** <https://dexidp.io/>

## TL;DR;

```bash
helm repo add dex https://charts.dexidp.io
helm install --generate-name --wait dex/dex
```

## Getting started

### Minimal configuration

Dex requires a minimal configuration in order to work.
You can pass configuration to Dex using Helm values:

```yaml
config:
  # Set it to a valid URL
  issuer: http://my-issuer-url.com

  # See https://dexidp.io/docs/storage/ for more options
  storage:
    type: memory

  # Enable at least one connector
  # See https://dexidp.io/docs/connectors/ for more options
  enablePasswordDB: true
```

The above configuration won't make Dex automatically available on the configured URL.
One (and probably the easiest) way to achieve that is configuring ingress:

```yaml
ingress:
  enabled: true

  hosts:
    - host: my-issuer-url.com
      paths:
        - path: /
```

### Minimal TLS configuration

HTTPS is basically mandatory these days, especially for authentication and authorization services.
There are several solutions for protecting services with TlS in Kubernetes,
but by far the most popular and portable is undoubtedly [Cert Manager](https://cert-manager.io).

Cert Manager can be [installed](https://cert-manager.io/docs/installation/kubernetes) with a few steps:

```shell
helm repo add jetstack https://charts.jetstack.io
helm repo update
kubectl create namespace cert-manager
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set installCRDs=true
```

The next step is setting up an [issuer](https://cert-manager.io/docs/concepts/issuer/) (eg. [Let's Encrypt](https://letsencrypt.org/)):

```shell
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: acme
spec:
  acme:
    email: YOUR@EMAIL_ADDRESS
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: acme-account-key
    solvers:
    - http01:
       ingress:
         class: YOUR_INGRESS_CLASS
EOF
```

Finally, change the ingress config to use TLS:

```yaml
ingress:
  enabled: true

  annotations:
    cert-manager.io/cluster-issuer: acme

  hosts:
    - host: my-issuer-url.com
      paths:
        - path: /

  tls:
    - hosts:
        - my-issuer-url.com
      secretName: dex-cert
```

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| replicaCount | int | `1` | Number of replicas (pods) to launch. |
| commonLabels | object | `{}` | Labels to apply to all resources and selectors. |
| image.repository | string | `"ghcr.io/dexidp/dex"` | Name of the image repository to pull the container image from. |
| image.pullPolicy | string | `"IfNotPresent"` | [Image pull policy](https://kubernetes.io/docs/concepts/containers/images/#updating-images) for updating already existing images on a node. |
| image.tag | string | `""` | Image tag override for the default value (chart appVersion). |
| image.digest | string | `""` | When digest is set to a non-empty value, images will be pulled by digest (regardless of tag value). |
| imagePullSecrets | list | `[]` | Reference to one or more secrets to be used when [pulling images](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#create-a-pod-that-uses-your-secret) (from private registries). |
| namespaceOverride | string | `""` | A namespace in place of the release namespace for all resources. |
| nameOverride | string | `""` | A name in place of the chart name for `app:` labels. |
| fullnameOverride | string | `""` | A name to substitute for the full names of resources. |
| hostAliases | list | `[]` | A list of hosts and IPs that will be injected into the pod's hosts file if specified. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#hostname-and-name-resolution) |
| https.enabled | bool | `false` | Enable the HTTPS endpoint. |
| grpc.enabled | bool | `false` | Enable the gRPC endpoint. Read more in the [documentation](https://dexidp.io/docs/api/). |
| configSecret.create | bool | `true` | Enable creating a secret from the values passed to `config`. If set to false, name must point to an existing secret. |
| configSecret.name | string | `""` | The name of the secret to mount as configuration in the pod. If not set and create is true, a name is generated using the fullname template. Must point to secret that contains at least a `config.yaml` key. |
| config | object | `{}` | Application configuration. See the [official documentation](https://dexidp.io/docs/). |
| volumes | list | `[]` | Additional storage [volumes](https://kubernetes.io/docs/concepts/storage/volumes/). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#volumes-1) for details. |
| volumeMounts | list | `[]` | Additional [volume mounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#volumes-1) for details. |
| envFrom | list | `[]` | Additional environment variables mounted from [secrets](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-environment-variables) or [config maps](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#configure-all-key-value-pairs-in-a-configmap-as-container-environment-variables). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#environment-variables) for details. |
| env | object | `{}` | Additional environment variables passed directly to containers. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#environment-variables) for details. |
| envVars | list | `[]` | Similar to env but with support for all possible configurations. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#environment-variables) for details. |
| serviceAccount.create | bool | `true` | Enable service account creation. |
| serviceAccount.annotations | object | `{}` | Annotations to be added to the service account. |
| serviceAccount.name | string | `""` | The name of the service account to use. If not set and create is true, a name is generated using the fullname template. |
| rbac.create | bool | `true` | Specifies whether RBAC resources should be created. If disabled, the operator is responsible for creating the necessary resources based on the templates. |
| rbac.createClusterScoped | bool | `true` | Specifies which RBAC resources should be created. If disabled, the operator is responsible for creating the necessary resources (ClusterRole and RoleBinding or CRD's) |
| deploymentAnnotations | object | `{}` | Annotations to be added to deployment. |
| deploymentLabels | object | `{}` | Labels to be added to deployment. |
| podAnnotations | object | `{}` | Annotations to be added to pods. |
| podLabels | object | `{}` | Labels to be added to pods. |
| podDisruptionBudget.enabled | bool | `false` | Enable a [pod distruption budget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/) to help dealing with [disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/). It is **highly recommended** for webhooks as disruptions can prevent launching new pods. |
| podDisruptionBudget.minAvailable | int/percentage | `nil` | Number or percentage of pods that must remain available. |
| podDisruptionBudget.maxUnavailable | int/percentage | `nil` | Number or percentage of pods that can be unavailable. |
| priorityClassName | string | `""` | Specify a priority class name to set [pod priority](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#pod-priority). |
| podSecurityContext | object | `{}` | Pod [security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-pod). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#security-context) for details. |
| revisionHistoryLimit | int | `10` | Define the [count of deployment revisions](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#clean-up-policy) to be kept. May be set to 0 in case of GitOps deployment approach. |
| securityContext | object | `{}` | Container [security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-container). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#security-context-1) for details. |
| service.annotations | object | `{}` | Annotations to be added to the service. |
| service.type | string | `"ClusterIP"` | Kubernetes [service type](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types). |
| service.clusterIP | string | `""` | Internal cluster service IP (when applicable) |
| service.loadBalancerIP | string | `""` | Load balancer service IP (when applicable) |
| service.ports.http.port | int | `5556` | HTTP service port |
| service.ports.http.nodePort | int | `nil` | HTTP node port (when applicable) |
| service.ports.https.port | int | `5554` | HTTPS service port |
| service.ports.https.nodePort | int | `nil` | HTTPS node port (when applicable) |
| service.ports.grpc.port | int | `5557` | gRPC service port |
| service.ports.grpc.nodePort | int | `nil` | gRPC node port (when applicable) |
| ingress.enabled | bool | `false` | Enable [ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/). |
| ingress.className | string | `""` | Ingress [class name](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class). |
| ingress.annotations | object | `{}` | Annotations to be added to the ingress. |
| ingress.hosts | list | See [values.yaml](values.yaml). | Ingress host configuration. |
| ingress.tls | list | See [values.yaml](values.yaml). | Ingress TLS configuration. |
| httpRoute.enabled | bool | `false` | Enable Gateway API HTTPRoute. Gateway API support is in EXPERIMENTAL status. Support depends on your Gateway controller implementation. See the [Gateway API documentation](https://gateway-api.sigs.k8s.io/) for details. |
| httpRoute.annotations | object | `{}` | Annotations to be added to the HTTPRoute. |
| httpRoute.parentRefs | list | `[]` | References to the Gateway(s) that this HTTPRoute is attached to. See the [API reference](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.ParentReference) for details. |
| httpRoute.hostnames | list | `["chart-example.local"]` | Hostnames defines the hostnames for routing. See the [API reference](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.Hostname) for details. |
| httpRoute.rules | list | `[{"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | HTTPRoute rules configuration. See the [API reference](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.HTTPRouteRule) for details. |
| serviceMonitor.enabled | bool | `false` | Enable Prometheus ServiceMonitor. See the [documentation](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/design.md#servicemonitor) and the [API reference](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api.md#servicemonitor) for details. |
| serviceMonitor.namespace | string | Release namespace. | Namespace where the ServiceMonitor resource should be deployed. |
| serviceMonitor.interval | duration | `nil` | Prometheus scrape interval. |
| serviceMonitor.scrapeTimeout | duration | `nil` | Prometheus scrape timeout. |
| serviceMonitor.labels | object | `{}` | Labels to be added to the ServiceMonitor. |
| serviceMonitor.annotations | object | `{}` | Annotations to be added to the ServiceMonitor. |
| serviceMonitor.scheme | string | `""` | HTTP scheme to use for scraping. Can be used with `tlsConfig` for example if using istio mTLS. |
| serviceMonitor.path | string | `"/metrics"` | HTTP path to scrape for metrics. |
| serviceMonitor.tlsConfig | object | `{}` | TLS configuration to use when scraping the endpoint. For example if using istio mTLS. |
| serviceMonitor.bearerTokenFile | string | `nil` | Prometheus scrape bearerTokenFile |
| serviceMonitor.honorLabels | bool | `false` | HonorLabels chooses the metric's labels on collisions with target labels. |
| serviceMonitor.metricRelabelings | list | `[]` | Prometheus scrape metric relabel configs to apply to samples before ingestion. |
| serviceMonitor.relabelings | list | `[]` | Relabel configs to apply to samples before ingestion. |
| resources | object | No requests or limits. | Container resource [requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/). See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#resources) for details. |
| autoscaling | object | Disabled by default. | Autoscaling configuration (see [values.yaml](values.yaml) for details). |
| nodeSelector | object | `{}` | [Node selector](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector) configuration. |
| tolerations | list | `[]` | [Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) for node taints. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#scheduling) for details. |
| affinity | object | `{}` | [Affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity) configuration. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#scheduling) for details. |
| topologySpreadConstraints | list | `[]` | [TopologySpreadConstraints](https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/) configuration. See the [API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#scheduling) for details. |
| strategy | object | `{}` | Deployment [strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) configuration. |
| networkPolicy.enabled | bool | `false` | Create [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/) |
| networkPolicy.egressRules | list | `[]` | A list of network policy egress rules |

## Migrating from stable/dex (or banzaicloud-stable/dex) chart

This chart is not backwards compatible with the `stable/dex` (or `banzaicloud-stable/dex`) chart.

However, Dex itself remains backwards compatible, so you can easily install the new chart in place of the old one
and continue using Dex with a minimal downtime.
