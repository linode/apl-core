# Glasnostic Kubernetes Data Plan Helm Chart

## Prerequisites

- Kubernetes 1.16+
- Helm 3.0+

## Installing the Chart

Search all the repositories available

```sh
helm search repo glasnostic -l
```

Install specific helm chart. Make sure to create the `glasnostic-system` namespace before installing via Helm.

```sh
kubectl create namespace glasnostic-system
helm install glasnosticd glasnostic/glasnosticd \
    -n glasnostic-system
    --set networkKey="myNetworkKey"
    
helm status glasnosticd
```

## Uninstalling the Chart

To uninstall/delete the `glasnosticd` deployment:

```sh
helm delete glasnosticd
```