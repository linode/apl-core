# otomi-stack

Otomi stack is Otomi's opinionated Kubernetes stack, offering an out of the box operations stack to help manage clusters.

All services are declared in own/vendor [Helm charts](https://helm.sh). See [./helmfile.yaml](./helmfile.yaml) which services will be synced.

Click here to open the [index of the system services](https://index.k8s-dev.otomi.cloud).

It is imperative to use the aliases to use the same command line commands. Not only to align with the team or to avoid manual errors, but also to use the same tooling in the docker image to avoid version skew. Please see [bin/aliases](bin/aliases) to understand what the commands in this readme do.

This readme has the following index:

1. [Prerequisites for installation](#1-prerequisites-for-installation)
2. [Installation](#3-intallation)
3. [Development](#2-development)
4. [Operation](#3-operation)
5. [Troubleshooting](#4-troubleshooting)

## 1. Prerequisites for installation

It is imperative to know the functioning of [helm](https://helm.sh) and [helmfile](https://github.com/roboll/helmfile). Please read about both beforehand. They both use Go templating and make use of the [Sprig template functions](http://masterminds.github.io/sprig/).

Before listing the hard requirements I would like to offer some really helpful tools:

- [Visual Studio Code](https://code.visualstudio.com): The most used code editor, which asks to install the extensions delivered in this repo.
- [kube_ps1 prompt](https://github.com/jonmosco/kube-ps1): I have it on the right with `RPROMPT='$(kube_ps1)'`

### 1.1 Working k8s cluster

Admin accessible k8s cluster(s). For convenience we have added `bin/create-gke-cluster.sh` to create a k8s cluster in GKE.

### 1.2 Configured .env

This monorepo is tergeting the cluster(s) as described in the `.(azure|google|aws)` files. Please register your target clusters there.

### 1.3 Configured values

Please look at the `values/_env/**` files and configure as needed for your target clusters.

## 2. Installation

The first time install must be done for each configured cloud and cluster like this:

```bash
export CLOUD=(azure|google|aws) && export STAGE=(dev|demo|prd) && bin/deploy.sh
```

It should install and start all the services in this repo.

### 2.1 (Optional) CI/CD deployment

After initial deployment, to enable Continuous Deployment of this repo (i.e. from within GitLab), for each cluster (DEV|TST|ACC|PRD):

Create and retrieve a token:

```bash
# to create the ci-deploy ServiceAccount:
kubectl apply -f k8s/base --recursive
# Get the token from the create sa:
SECRET_NAME=$(kubectl -n system get sa ci-deploy -o json | jq -r .secrets[].name)
TOKEN=$(k -n system get secret $SECRET_NAME -o json | jq -r .data.token)
# to copy to clipboard, on OSX:
echo $TOKEN | pbcopy
```

Create an environment variable `KUBE_TOKEN_(DEV|TST|ACC|PRD)` in GitLab Settings > CI/CD with the \$TOKEN content.

This should only happen when we need to create a cluster from scratch.

Please look at `.gitlab-ci.yml` to see how simple the pipelines are.

### 2.2 Manual Deployment

After initial deployment, it is possible to deploy (parts of) the stack to any cluster directly through helmfile, but this is meant for dev clusters only.
To be able to deploy manually, you should have the right credentials and access rights in .kube/config.
Deployment is preferably done by using the aliases:

```bash
# target the cloud you wish you deploy to and load the aliases
export CLOUD=(azure|google|aws) && . bin/aliases
# use hfd for deployment to dev, and hft|hfa|hfp to acc|tst|prd (see `bin/aliases`)
hfd apply|diff|template
# or target a single chart:
hfd -l name=index apply
# or target a single chart in debug mode, while excluding cruft from other helmfiles:
hfd --log-level=debug -f helmfile.d/helmfile-30.system.yaml -l name=index apply
```

## 2. Development

The helmfiles are found in `helmfile.d/` and their values under `values/**`.
The charts are found in the `charts/custom` folder. These charts can be exact copies from their online counterparts (see their `Chart.yaml`), or contain slight modifications/adaptations. The only real explicit one is `chart/index` which is an adaption of `bitnami/nginx` to hold our custom index page listing all the accessible services in this repo.

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
