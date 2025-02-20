# OpenTelemetry Operator Helm Chart

> [!WARNING]  
> Version 0.58.0 of this Chart includes a new version of the `OpenTelemetryCollector` CRD. See [this document][v1beta1_migration] for upgrade instructions for the new Operator CRD. Please make sure you also follow the [helm upgrade instructions](./UPGRADING.md#0560-to-0570) for helm chart 0.57.0.

The Helm chart installs [OpenTelemetry Operator](https://github.com/open-telemetry/opentelemetry-operator) in Kubernetes cluster.
The OpenTelemetry Operator is an implementation of a [Kubernetes Operator](https://www.openshift.com/learn/topics/operators).
At this point, it has [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) as the only managed component.

## Prerequisites

- Kubernetes 1.24+ is required for OpenTelemetry Operator installation
- Helm 3.9+

### TLS Certificate Requirement

In Kubernetes, in order for the API server to communicate with the webhook component, the webhook requires a TLS
certificate that the API server is configured to trust. There are a few different ways you can use to generate/configure the required TLS certificate.

  - The easiest and default method is to install the [cert-manager](https://cert-manager.io/docs/) and set `admissionWebhooks.certManager.enabled` to `true`.
    In this way, cert-manager will generate a self-signed certificate. _See [cert-manager installation](https://cert-manager.io/docs/installation/kubernetes/) for more details._
  - You can provide your own Issuer by configuring the `admissionWebhooks.certManager.issuerRef` value. You will need
    to specify the `kind` (Issuer or ClusterIssuer) and the `name`. Note that this method also requires the installation of cert-manager.
  - You can use an automatically generated self-signed certificate by setting `admissionWebhooks.certManager.enabled` to `false` and `admissionWebhooks.autoGenerateCert.enabled` to `true`. Helm will create a self-signed cert and a secret for you.
  - You can use your own generated self-signed certificate by setting both `admissionWebhooks.certManager.enabled` and `admissionWebhooks.autoGenerateCert.enabled` to `false`. You should provide the necessary values to `admissionWebhooks.certFile`, `admissionWebhooks.keyFile`, and `admissionWebhooks.caFile`.
  - You can sideload custom webhooks and certificate by disabling `.Values.admissionWebhooks.create` and `admissionWebhooks.certManager.enabled` while setting your custom cert secret name in `admissionWebhooks.secretName`
  - You can disable webhooks altogether by disabling `.Values.admissionWebhooks.create` and setting env var to `ENABLE_WEBHOOKS: "false"`

## Add Repository

```console
$ helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
$ helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Install Chart

> [!NOTE]  
> This Chart uses templated CRDs, and therefore does not support `--skip-crds`. Use `crds.create=false` instead if you do not want the chart to install the OpenTelemetry Operator's CRDs.

```console
$ helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
--set "manager.collectorImage.repository=otel/opentelemetry-collector-k8s"
```

If you created a custom namespace, like in the TLS Certificate Requirement section above, you will need to specify the namespace with the `--namespace` helm option:

```console
$ helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
--namespace opentelemetry-operator-system \
--set "manager.collectorImage.repository=otel/opentelemetry-collector-k8s"
```

If you wish for helm to create an automatically generated self-signed certificate, make sure to set the appropriate values when installing the chart:

```console
$ helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
--set "manager.collectorImage.repository=otel/opentelemetry-collector-k8s" \
--set admissionWebhooks.certManager.enabled=false \
--set admissionWebhooks.autoGenerateCert.enabled=true
```

_See [helm install](https://helm.sh/docs/helm/helm_install/) for command documentation._

## Uninstall Chart

The following command uninstalls the chart whose release name is my-opentelemetry-operator.

```console
$ helm uninstall opentelemetry-operator
```

_See [helm uninstall](https://helm.sh/docs/helm/helm_uninstall/) for command documentation._

This will remove all the Kubernetes components associated with the chart and deletes the release.

The OpenTelemetry Collector CRD created by this chart won't be removed by default and should be manually deleted:

```console
$ kubectl delete crd opentelemetrycollectors.opentelemetry.io
$ kubectl delete crd opampbridges.opentelemetry.io
$ kubectl delete crd instrumentations.opentelemetry.io
```

## Upgrade Chart

```console
$ helm upgrade my-opentelemetry-operator open-telemetry/opentelemetry-operator
```

Please note that by default, the chart will be upgraded to the latest version. If you want to upgrade to a specific version,
use `--version` flag.

With Helm v3.0, CRDs created by this chart are not updated by default and should be manually updated.
Consult also the [Helm Documentation on CRDs](https://helm.sh/docs/chart_best_practices/custom_resource_definitions).

_See [helm upgrade](https://helm.sh/docs/helm/helm_upgrade/) for command documentation._

## Configuration

The following command will show all the configurable options with detailed comments.

```console
$ helm show values open-telemetry/opentelemetry-operator
```

When using this chart as a subchart, you may want to unset certain default values. Since Helm v3.13 values handling is improved and null can now consistently be used to remove values (e.g. to remove the default CPU limits).

### Role-based Access Control (RBAC) Configuration

The OpenTelemetry Collector requires specific RBAC permissions to function correctly, especially when using the `k8sattributesprocessor`. Depending on your deployment's scope, you may need to configure Cluster-scoped or Namespace-scoped RBAC permissions.

- **Cluster-scoped RBAC**: Necessary if the collector is to receive telemetry from across multiple namespaces. This setup requires `get`, `watch`, and `list` permissions on `pods`, `namespaces`, and `nodes`, plus `replicasets` if using deployment-related attributes.

- **Namespace-scoped RBAC**: Suitable for collecting telemetry within a specific namespace. This requires setting up a `Role` and `RoleBinding` to grant access to `pods` and `replicasets` within the target namespace. This setup limits the collector's access to resources within the specified namespace only.

**Important**: The `manager.createRbacPermissions` flag in the Helm chart values should be set to `false` if you are manually configuring RBAC permissions for the collector. Manual configuration allows for more granular control over the permissions granted to the OpenTelemetry Collector, ensuring it has exactly the access it needs based on your specific deployment requirements. Conversely, setting `manager.createRbacPermissions` to `true` will allow the operator to automatically configure RBAC for your collectors.

For detailed instructions and examples on configuring RBAC permissions, please refer to the [official documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md).

## Install OpenTelemetry Collector

_See [OpenTelemetry website](https://opentelemetry.io/docs/collector/) for more details about the Collector_

Once the opentelemetry-operator deployment is ready, you can deploy OpenTelemetry Collector in our Kubernetes
cluster.

The Collector can be deployed as one of four modes: Deployment, DaemonSet, StatefulSet and Sidecar. The default
mode is Deployment. We will introduce the benefits and use cases of each mode as well as giving an example for each.

### Deployment Mode

If you want to get more control of the OpenTelemetry Collector and create a standalone application, Deployment would
be your choice. With Deployment, you can relatively easily scale up the Collector to monitor more targets, roll back
to an early version if anything unexpected happens, pause the Collector, etc. In general, you can manage your Collector
instance just as an application.

The following example configuration deploys the Collector as Deployment resource. The receiver is Jaeger receiver and
the exporter is [debug exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter).

```console
$ kubectl apply -f - <<EOF
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: my-collector
spec:
  mode: deployment # This configuration is omittable.
  config:
    receivers:
      jaeger:
        protocols:
          grpc: {}
    processors: {}

    exporters:
      debug: {}

    service:
      pipelines:
        traces:
          receivers: [jaeger]
          processors: []
          exporters: [debug]
EOF
```

### DaemonSet Mode

DaemonSet should satisfy your needs if you want the Collector to run as an agent on your Kubernetes nodes.
In this case, every Kubernetes node will have its own Collector copy which would monitor the pods in it.

The following example configuration deploys the Collector as DaemonSet resource. The receiver is Jaeger receiver and
the exporter is debug exporter.

```console
$ kubectl apply -f - <<EOF
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: my-collector
spec:
  mode: daemonset
  hostNetwork: true
  config:
    receivers:
      jaeger:
        protocols:
          grpc: {}
    processors: {}

    exporters:
      debug:
        verbosity: detailed

    service:
      pipelines:
        traces:
          receivers: [jaeger]
          processors: []
          exporters: [debug]
EOF
```

### StatefulSet Mode
There are basically three main advantages to deploy the Collector as the StatefulSet:
- Predictable names of the Collector instance will be expected \
  If you use above two approaches to deploy the Collector, the pod name of your Collector instance will be unique (its name plus random sequence).
  However, each Pod in a StatefulSet derives its hostname from the name of the StatefulSet and the ordinal of the Pod (my-col-0, my-col-1, my-col-2, etc.).
- Rescheduling will be arranged when a Collector replica fails \
  If a Collector pod fails in the StatefulSet, Kubernetes will attempt to reschedule a new pod with the same name to the same node. Kubernetes will also attempt
  to attach the same sticky identity (e.g., volumes) to the new pod.

The following example configuration deploys the Collector as StatefulSet resource with three replicas. The receiver
is Jaeger receiver and the exporter is debug exporter.

```console
$ kubectl apply -f - <<EOF
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: my-collector
spec:
  mode: statefulset
  replicas: 3
  config:
    receivers:
      jaeger:
        protocols:
          grpc: {}
    processors: {}

    exporters:
      debug: {}

    service:
      pipelines:
        traces:
          receivers: [jaeger]
          processors: []
          exporters: [debug]
EOF
```

### Sidecar Mode
The biggest advantage of the sidecar mode is that it allows people to offload their telemetry data as fast and reliable as possible from their applications.
This Collector instance will work on the container level and no new pod will be created, which is perfect to keep your Kubernetes cluster clean and easily to be managed.
Moreover, you can also use the sidecar mode when you want to use a different collect/export strategy, which just suits this application.

Once a Sidecar instance exists in a given namespace, you can have your deployments from that namespace to get a sidecar
by either adding the annotation `sidecar.opentelemetry.io/inject: true` to the pod spec of your application, or to the namespace.

_See the [OpenTelemetry Operator github repository](https://github.com/open-telemetry/opentelemetry-operator) for more detailed information._

```console
$ kubectl apply -f - <<EOF
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: sidecar-for-my-app
spec:
  mode: sidecar
  config:
    receivers:
      jaeger:
        protocols:
          thrift_compact: {}
    processors: {}

    exporters:
      debug: {}

    service:
      pipelines:
        traces:
          receivers: [jaeger]
          processors: []
          exporters: [debug]
EOF

$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  annotations:
    sidecar.opentelemetry.io/inject: "true"
spec:
  containers:
  - name: myapp
    image: jaegertracing/vertx-create-span:operator-e2e-tests
    ports:
      - containerPort: 8080
        protocol: TCP
EOF
```

[v1beta1_migration]: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/crd-changelog.md#opentelemetrycollectoropentelemetryiov1beta1
