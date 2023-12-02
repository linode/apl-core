# falco-exporter Helm Chart

[falco-exporter](https://github.com/falcosecurity/falco-exporter) is a Prometheus Metrics Exporter for Falco output events.

Before using this chart, you need [Falco installed](https://falco.org/docs/installation/) and running with the [gRPC Output](https://falco.org/docs/grpc/) enabled (over Unix socket by default).

This chart is compatible with the [Falco Chart](https://github.com/falcosecurity/charts/tree/master/falco) version `v1.2.0` or greater. Instructions to enable the gRPC Output in the Falco Helm Chart can be found [here](https://github.com/falcosecurity/charts/tree/master/falco#enabling-grpc). We also strongly recommend using [gRPC over Unix socket](https://github.com/falcosecurity/charts/tree/master/falco#grpc-over-unix-socket-default).

## Introduction

The chart deploys **falco-exporter** as Daemon Set on your the Kubernetes cluster. If a [Prometheus installation](https://github.com/helm/charts/tree/master/stable/prometheus) is running within your cluster, metrics provided by **falco-exporter** will be automatically discovered.

## Adding `falcosecurity` repository

Prior to installing the chart, add the `falcosecurity` charts repository:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
```

## Installing the Chart

To install the chart with the release name `falco-exporter` run:

```bash
helm install falco-exporter falcosecurity/falco-exporter
```

After a few seconds, **falco-exporter** should be running.

> **Tip**: List all releases using `helm list`, a release is a name used to track a specific deployment

## Uninstalling the Chart

To uninstall the `falco-exporter` deployment:

```bash
helm uninstall falco-exporter
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the main configurable parameters of the chart and their default values.

| Parameter                                        | Description                                                                                      | Default                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `image.registry`                                 | The image registry to pull from                                                                  | `docker.io`                        |
| `image.repository`                               | The image repository to pull from                                                                | `falcosecurity/falco-exporter`     |
| `image.tag`                                      | The image tag to pull                                                                            | `0.8.3`                            |
| `image.pullPolicy`                               | The image pull policy                                                                            | `IfNotPresent`                     |
| `falco.grpcUnixSocketPath`                       | Unix socket path for connecting to a Falco gRPC server                                           | `unix:///var/run/falco/falco.sock` |
| `falco.grpcTimeout`                              | gRPC connection timeout                                                                          | `2m`                               |
| `serviceAccount.create`                          | Specify if a service account should be created                                                   | `true`                             |
| `podSecurityPolicy.create`                       | Specify if a PSP, Role & RoleBinding should be created                                           | `false`                            |
| `serviceMonitor.enabled`                         | Enabled deployment of a Prometheus operator Service Monitor                                      | `false`                            |
| `serviceMonitor.additionalLabels`                | Add additional Labels to the Service Monitor                                                     | `{}`                               |
| `serviceMonitor.interval`                        | Specify a user defined interval for the Service Monitor                                          | `""`                               |
| `serviceMonitor.scrapeTimeout`                   | Specify a user defined scrape timeout for the Service Monitor                                    | `""`                               |
| `grafanaDashboard.enabled`                       | Enable the falco security dashboard, see https://github.com/falcosecurity/falco-exporter#grafana | `false`                            |
| `grafanaDashboard.folder`                        | The grafana folder to deplay the dashboard in                                                    |     `""`                                 |
| `grafanaDashboard.namespace`                     | The namespace to deploy the dashboard configmap in                                               | `default`                          |
| `grafanaDashboard.prometheusDatasourceName`      | The prometheus datasource name to be used for the dashboard                                      | `Prometheus`                       |
| `scc.create`                                     | Create OpenShift's Security Context Constraint                                                   | `true`                             |
| `service.mTLS.enabled`                           | Enable falco-exporter server Mutual TLS feature                                                  | `false`                            |
| `prometheusRules.enabled`                        | Enable the creation of falco-exporter PrometheusRules                                            | `false`                            |
| `daemonset.podLabels`                            | Customized Daemonset pod labels                                                                  | `{}`                               |
| `healthChecks.livenessProbe.probesPort`          | Liveness probes port                                                                             | `19376`                            |
| `healthChecks.readinessProbe.probesPort`         | Readiness probes port                                                                            | `19376`                            |
| `healthChecks.livenessProbe.initialDelaySeconds` | Number of seconds before performing the first liveness probe                                     | `60`                               |
| `healthChecks.readinessProbe.initialDelaySeconds`| Number of seconds before performing the first readiness probe                                    | `30`                               |
| `healthChecks.livenessProbe.timeoutSeconds`      | Number of seconds after which the liveness probe times out                                       | `5`                                |
| `healthChecks.readinessProbe.timeoutSeconds`     | Number of seconds after which the readiness probe times out                                      | `5`                                |
| `healthChecks.livenessProbe.periodSeconds`       | Time interval in seconds to perform the liveness probe                                           | `15`                               |
| `healthChecks.readinessProbe.periodSeconds`      | Time interval in seconds to perform the readiness probe                                          | `15`                               |

Please, refer to [values.yaml](./values.yaml) for the full list of configurable parameters.

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```bash
helm install falco-exporter --set falco.grpcTimeout=3m falcosecurity/falco-exporter
```

Alternatively, a YAML file that specifies the parameters' values can be provided while installing the chart. For example,

```bash
helm install falco-exporter -f values.yaml falcosecurity/falco-exporter
```

### Enable Mutual TLS

Mutual TLS for `/metrics` endpoint can be enabled to prevent alerts content from being consumed by unauthorized components.

To install falco-exporter with Mutual TLS enabled, you have to:

```shell
helm install falco-exporter \
  --set service.mTLS.enabled=true \
  --set-file service.mTLS.server.key=/path/to/server.key \
  --set-file service.mTLS.server.crt=/path/to/server.crt \
  --set-file service.mTLS.ca.crt=/path/to/ca.crt \
  falcosecurity/falco-exporter
```

> **Tip**: You can use the default [values.yaml](values.yaml)
