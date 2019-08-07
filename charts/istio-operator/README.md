# Istio-operator chart

[Istio-operator](https://github.com/banzaicloud/istio-operator) is a Kubernetes operator to deploy and manage [Istio](https://istio.io/) resources for a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.10.0+

## Installing the chart

To install the chart:

```
$ helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com
$ helm install --name=istio-operator --namespace=istio-system banzaicloud-stable/istio-operator
```

## Uninstalling the Chart

To uninstall/delete the `istio-operator` release:

```
$ helm del --purge istio-operator
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the Banzaicloud Istio Operator chart and their default values.

Parameter | Description | Default
--------- | ----------- | -------
`operator.image.repository` | Operator container image repository | `banzaicloud/istio-operator`
`operator.image.tag` | Operator container image tag | `0.2.1`
`operator.image.pullPolicy` | Operator container image pull policy | `IfNotPresent`
`operator.resources` | CPU/Memory resource requests/limits (YAML) | Memory: `128Mi/256Mi`, CPU: `100m/200m`
`istioVersion` | Supported Istio version | `1.2`
`prometheusMetrics.enabled` | If true, use direct access for Prometheus metrics | `false`
`prometheusMetrics.authProxy.enabled` | If true, use auth proxy for Prometheus metrics | `true`
`prometheusMetrics.authProxy.image.repository` | Auth proxy container image repository | `gcr.io/kubebuilder/kube-rbac-proxy`
`prometheusMetrics.authProxy.image.tag` | Auth proxy container image tag | `v0.4.0`
`prometheusMetrics.authProxy.image.pullPolicy` | Auth proxy container image pull policy | `IfNotPresent`
`rbac.enabled` | Create rbac service account and roles | `true`
