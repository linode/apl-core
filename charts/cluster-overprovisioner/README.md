# cluster-overprovisioner

![Version: 0.4.2](https://img.shields.io/badge/Version-0.4.2-informational?style=flat-square) ![AppVersion: 1.0](https://img.shields.io/badge/AppVersion-1.0-informational?style=flat-square)

This chart provide a buffer for cluster autoscaling to allow overprovisioning of cluster nodes. This is desired when you have work loads that need to scale up quickly without waiting for the new cluster nodes to be created and join the cluster.

It works but creating a deployment that creates pods of a lower than default `PriorityClass`. These pods request resources from the cluster but don't actually consume any resources. These pods are then evicted allowing other normal pods are created while also triggering a scale-up by the [cluster-autoscaler](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler).

This approach is the [current recommended method to achieve overprovisioning](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler).

**Homepage:** <https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler>

## How to install this chart

Add Delivery Hero public chart repo:

```console
helm repo add deliveryhero https://charts.deliveryhero.io/
```

A simple install with default values:

```console
helm install deliveryhero/cluster-overprovisioner
```

To install the chart with the release name `my-release`:

```console
helm install my-release deliveryhero/cluster-overprovisioner
```

To install with some set values:

```console
helm install my-release deliveryhero/cluster-overprovisioner --set values_key1=value1 --set values_key2=value2
```

To install with custom values file:

```console
helm install my-release deliveryhero/cluster-overprovisioner -f values.yaml
```

## Source Code

* <https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler>
* <https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler>
* <https://github.com/kubernetes/kubernetes/tree/master/build/pause>

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| deployments | list | {} | Define optional additional deployments - A default deployment is included by default |
| deployments[0].affinity | object | `{}` | Default Deployment - Map of node/pod affinities |
| deployments[0].annotations | object | `{}` | Default Deployment - Annotations to add to the deployment |
| deployments[0].labels | object | `{}` | Default Deployment - Optional labels tolerations |
| deployments[0].name | string | `"default"` | Default Deployment - Name for additional deployments (will be added as label cluster-over-provisioner-name, so you can match it with affinity rules) |
| deployments[0].nodeSelector | object | `{}` | Default Deployment - Node labels for pod assignment |
| deployments[0].replicaCount | int | `3` | Default Deployment - Number of replicas |
| deployments[0].resources.limits.cpu | string | `"1000m"` | Default Deployment - CPU limit for the overprovision pods |
| deployments[0].resources.limits.memory | string | `"1000Mi"` | Default Deployment - Memory limit for the overprovision pods |
| deployments[0].resources.requests.cpu | string | `"1000m"` | Default Deployment - CPU requested for the overprovision pods |
| deployments[0].resources.requests.memory | string | `"1000Mi"` | Default Deployment - Memory requested for the overprovision pods |
| deployments[0].tolerations | list | `[]` | Default Deployment - Optional deployment tolerations |
| fullnameOverride | string | `""` | Override the fullname of the chart |
| image.pullPolicy | string | `"IfNotPresent"` | Container pull policy |
| image.repository | string | `"k8s.gcr.io/pause"` | Image repository |
| image.tag | float | `3.1` | Image tag |
| nameOverride | string | `""` | Override the name of the chart |
| podSecurityContext | object | `{}` | Pod security context object |
| priorityClassDefault.enabled | bool | `true` | If true, enable default priorityClass |
| priorityClassDefault.name | string | `"default"` | Name of the default priorityClass |
| priorityClassDefault.value | int | `0` | Priority value of the default priorityClass |
| priorityClassOverprovision.name | string | `"overprovisioning"` | Name of the overprovision priorityClass |
| priorityClassOverprovision.value | int | `-1` | Priority value of the overprovision priorityClass |

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| max-rocket-internet | max.williams@deliveryhero.com |  |
| mmingorance-dh | miguel.mingorance@deliveryhero.com |  |
