# OpenTelemetry Collector Helm Chart

The helm chart installs [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector)
in kubernetes cluster.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.9+

## Installing the Chart

Add OpenTelemetry Helm repository:

```console
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
```

To install the chart with the release name my-opentelemetry-collector, run the following command:

```console
helm install my-opentelemetry-collector open-telemetry/opentelemetry-collector --set mode=<value>
```

Where the `mode` value needs to be set to one of `daemonset`, `deployment` or `statefulset`.

## Upgrading

See [UPGRADING.md](UPGRADING.md).

## Security Considerations

OpenTelemetry Collector recommends to bind receivers' servers to addresses that limit connections to authorized users.
For this reason, by default the chart binds all the Collector's endpoints to the pod's IP.

More info is available in the [Security Best Practices docummentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/docs/security-best-practices.md#safeguards-against-denial-of-service-attacks)

Some care must be taken when using `hostNetwork: true`, as then OpenTelemetry Collector will listen on all the addresses in the host network namespace.

## Configuration

### Default configuration

By default this chart will deploy an OpenTelemetry Collector with three pipelines (logs, metrics and traces)
and logging exporter enabled by default. The collector can be installed either as daemonset (agent), deployment or stateful set.

*Example*: Install collector as a deployment.

```yaml
mode: deployment
```

By default collector has the following receivers enabled:

- **metrics**: OTLP and prometheus. Prometheus is configured only for scraping collector's own metrics.
- **traces**: OTLP, zipkin and jaeger (thrift and grpc).
- **logs**: OTLP (to enable container logs, see [Configuration for Kubernetes container logs](#configuration-for-kubernetes-container-logs)).

There are two ways to configure collector pipelines, which can be used together as well.

### Basic top level configuration

Default components can be removed with `null`.  When changing a pipeline, you must explicitly list all the components that are in the pipeline, including any default components.

*Example*: Disable metrics and logging pipelines and non-otlp receivers:

```yaml
config:
  receivers:
    jaeger: null
    prometheus: null
    zipkin: null
  service:
    pipelines:
      traces:
        receivers:
          - otlp
      metrics: null
      logs: null
```

*Example*: Add host metrics receiver:

```yaml
mode: daemonset

presets:
  hostMetrics:
    enabled: true
```

### Configuration for Kubernetes container logs

The collector can be used to collect logs sent to standard output by Kubernetes containers.
This feature is disabled by default. It has the following requirements:

- It needs agent collector to be deployed.
- It requires the [contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) version
of the collector image.

To enable this feature, set the  `presets.logsCollection.enabled` property to `true`.
Here is an example `values.yaml`:

```yaml
mode: daemonset

presets:
  logsCollection:
    enabled: true
    includeCollectorLogs: true
```

The way this feature works is it adds a `filelog` receiver on the `logs` pipeline. This receiver is preconfigured
to read the files where Kubernetes container runtime writes all containers' console output to.

#### :warning: Warning: Risk of looping the exported logs back into the receiver, causing "log explosion"

The container logs pipeline uses the `logging` console exporter by default.
Paired with the default `filelog` receiver that receives all containers' console output,
it is easy to accidentally feed the exported logs back into the receiver.

Also note that using the `--log-level=debug` option for the `logging` exporter causes it to output
multiple lines per single received log, which when looped, would amplify the logs exponentially.

To prevent the looping, the default configuration of the receiver excludes logs from the collector's containers.

If you want to include the collector's logs, make sure to replace the `logging` exporter
with an exporter that does not send logs to collector's standard output.

Here's an example `values.yaml` file that replaces the default `logging` exporter on the `logs` pipeline
with an `otlphttp` exporter that sends the container logs to `https://example.com:55681` endpoint.
It also clears the `filelog` receiver's `exclude` property, for collector logs to be included in the pipeline.

```yaml
mode: daemonset

presets:
  logsCollection:
    enabled: true
    includeCollectorLogs: true

config:
  exporters:
    otlphttp:
      endpoint: https://example.com:55681
  service:
    pipelines:
      logs:
        exporters:
          - otlphttp
```

### Configuration for Kubernetes attributes processor

The collector can be configured to add Kubernetes metadata to logs, metrics and traces.

This feature is disabled by default. It has the following requirements:

- It requires [k8sattributesprocessor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor) processor to be included in the collector, such as [contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) version of the collector image.

To enable this feature, set the  `presets.kubernetesAttributes.enabled` property to `true`.
Here is an example `values.yaml`:

```yaml
mode: daemonset
presets:
  kubernetesAttributes:
    enabled: true
```

### Configuration for Kubernetes Cluster Metrics

The collector can be configured to collects cluster-level metrics from the Kubernetes API server. A single instance of this receiver can be used to monitor a cluster.

This feature is disabled by default. It has the following requirements:

- It requires [k8sclusterreceiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sclusterreceiver) to be included in the collector, such as [contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) version of the collector image.
- It requires statefulset or deployment mode with a single replica.

To enable this feature, set the  `presets.clusterMetrics.enabled` property to `true`.

Here is an example `values.yaml`:

```yaml
mode: deployment
replicaCount: 1
presets:
  clusterMetrics:
    enabled: true
```

### Configuration for retrieving Kubelet metrics

The collector can be configured to collect Kubelet metrics.

This feature is disabled by default. It has the following requirements:

- It requires [kubeletstats](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver) receiver to be included in the collector, such as [contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) version of the collector image.

To enable this feature, set the  `presets.kubeletMetrics.enabled` property to `true`.
Here is an example `values.yaml`:

```yaml
mode: daemonset
presets:
  kubeletMetrics:
    enabled: true
```

### CRDs

At this time, Prometheus CRDs are supported but other CRDs are not.

### Other configuration options

The [values.yaml](./values.yaml) file contains information about all other configuration
options for this chart.

For more examples see [Examples](examples).
