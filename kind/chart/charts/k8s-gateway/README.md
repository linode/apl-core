# k8s-gateway
A simple chart to install [k8s_gateway](https://github.com/ori-edge/k8s_gateway)


## Parameters

The following table lists the configurable parameters of the k8s_gateway chart and their default values.

| Parameter                        | Description                                                                               | Default               |
| -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| `domain`                         | Delegated domain                                                                          |                       |
| `watchedResources`               | Limit what kind of resources to watch, e.g. `watchedResources: ["Ingress"]`               | `[]`                  |
| `ttl`                            | TTL for non-apex responses (in seconds)                                                   | `300`                 |
| `dnsChallenge.enabled`           | Optional configuration option for DNS01 challenge                                         | `false`               |
| `dnsChallenge.domain`            | See: https://cert-manager.io/docs/configuration/acme/dns01/                               | `dns01.clouddns.com`  |
| `image.registry`                 | Image registry                                                                            | `quay.io`             |
| `image.repository`               | Image repository                                                                          | `oriedge/k8s_gateway` |
| `image.tag`                      | Image tag                                                                                 | `latest`              |
| `image.pullPolicy`               | Image pull policy                                                                         | `Always`              |
| `nodeSelector`                   | Node labels for pod assignment                                                            | `{}`                  |
| `affinity`                       | Pod affinity                                                                              | `{}`                  |
| `resources`                      | Pod resource requests & limits                                                            | `{}`                  |
| `serviceAccount.create`          | Create ServiceAccount                                                                     | `true`                |
| `serviceAccount.annotations`     | ServiceAccount annotations                                                                |                       |
| `service.port`                   | Service port to expose                                                                    | `53`                  |
| `service.type`                   | The type of service to create (`LoadBalancer`, `NodePort`)                                | `LoadBalancer`        |
| `service.nodePort`               | Node port when service type is `NodePort`. Randomly chonsen by Kubernetes if not provided |                       |
| `service.loadBalancerIP`         | The IP address to use when using serviceType `LoadBalancer`                               |                       |
