# otomi-stack

Otomi stack is Otomi's opinionated Kubernetes stack, offering an out of the box operations stack to help manage clusters.

All services are declared in own/vendor [Helm charts](https://helm.sh). See [./helmfile.yaml](./helmfile.yaml) which services will be synced.

Click here to open the [index of the system services](https://index-dev.k8s.otomi.cloud).

It is strongly advised to use the aliases to use the same command line commands. Not only to align with the team or to avoid manual errors, but also to use the same tooling in the docker image to avoid version skew. Please see [bin/aliases](bin/aliases) to understand what the commands in this readme do.

This readme has the following index:

1. [Prerequisites](#1-prerequisites)
2. [Development](#2-development)
3. [Operation](#3-operation)
4. [Troubleshooting](#4-troubleshooting)

## 1. Prerequisites

Before listing the hard requirements I would like to offer some really helpful tools:

- [Visual Studio Code](https://code.visualstudio.com): The most used code editor, which asks to install the extensions delivered in this repo.
- [kube_ps1 prompt](https://github.com/jonmosco/kube-ps1): I have it on the right with `RPROMPT='$(kube_ps1)'`

### 1.1 Working k8s cluster

Admin accessible k8s clusters as listed in KUBECONFIG (defaults to `~/.kube/config`). These clusters are bootstrapped with KOPS (see [redkubes/kops-(gcp|aws)-iaas](https://github.com/redkubes/kops-gce-iaas)).
For convenience we have added `bin/create-gke-cluster.sh` to boot the Otomi GKE cluster.

### 1.2 Otomi Github deployment

To enable CI/CD deployment from within github actions, for each cluster (DEV|TST|ACC|PRD):

1. Create and retrieve a token:

```bash
# to create the ci-deploy ServiceAccount:
kubectl apply -f k8s/base --recursive
# Get the token from the create sa:
SECRET_NAME=$(kubectl -n system get sa ci-deploy -o json | jq -r .secrets[].name)
TOKEN=$(k -n system get secret $SECRET_NAME -o json | jq -r .data.token)
# to copy to clipboard, on OSX:
echo $TOKEN | pbcopy
```

2. Create an environment variable `KUBE_TOKEN_(DEV|TST|ACC|PRD)` in Settings > CI/CD with the \$TOKEN content

This has all been done and this documentation serves only as reference for when we need to create a cluster from scratch.

It is also possible to run a local gitlab runner, and that is explained in the **Development** section below, as it is only needed when editing `.gitlab-ci.yml`, but that is highly unlikely.

### 1.3 Manual Deployment

It is possible to deploy the stack to any cluster directly through helmfile, but this is meant for dev clusters only.
To be able to deploy manually, ask for a kube config from seniors, and put it in `~/.kube/config`.
Deployment is preferably done by using the aliases:

```bash
# use hfd for deployment to dev, and hft|hfa|hfp to acc|tst|prd (see aliases!)
hfd apply|diff|template
# or target a single chart:
hfd -l name=index apply
```

## 2. Development

The helmfiles are found in `helmfile.d/` and their values under `values/**`.
Custom charts are found in the `charts/custom` folder.

### Helm charts & helmfiles

Open a terminal and watch all pods except those in `kube-system` namespace:

```bash
watch -n1 "kubectl --all-namespaces=true get po | grep -Fv kube-system"
```

You can test modifications to helm charts and helmfiles:

```bash
. bin/aliases
# diff one chart with the one deployed on dev:
hfd -l name=index diff
# deploy the whole prometheus-operator stack:
hfd -l name=prometheus-operator apply
# deploy all charts in the monitoring namespace:
hfd -f helmfile.d/helmfile-10.monitoring.yaml apply
```

## 3. Operation

Lets work with the `dev` cluster for this example. Switch to it's context with `kcu dev.otomi`.

As explained in the intro, the services are listed under the [index of the system services](https://index-dev.k8s.otomi.cloud).
So far we have the following services (shown for `dev`):

1. [Weave Scope](https://weave-dev.k8s.otomi.cloud): a graphical overview of all the components and their relationships.
2. [Grafana](https://grafana-dev.k8s.otomi.cloud): the famous metrics dashboard that shows prometheus metrics.
3. [Prometheus](https://prom-dev.k8s.otomi.cloud/targets): the prometheus environment showing what is being monitored.
4. [Alertmanager](https://alerts-dev.k8s.otomi.cloud/): Alerts and their configuration.
5. [Blackbox](https://blackbox-dev.k8s.otomi.cloud): shows the http probes that we test for.

It is possible to change settings through any of these UIs, but to make them persistent these changes need to be scripted into this repo. Please read through the charts and their values thoroughly to see how configuration is injected.

# 4. Troubleshooting

```bash
# istio auth checks from gateway to service (here grafana):
istioctl -n istio-system authn tls-check $(kis get po -l app=istio-ingressgateway | tail -n1| awk '{print $1}') prometheus-operator-grafana.monitoring.svc.cluster.local
```
