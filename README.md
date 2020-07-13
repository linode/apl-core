# otomi-stack

Otomi stack is Otomi's opinionated Kubernetes stack, offering an out of the box operations stack to help manage
clusters.

All services are declared in own/vendor [Helm charts](https://helm.sh). See [./helmfile.yaml](./helmfile.yaml) which services will be synced.

Click here to open the [index of the system services](https://index.team-admin.dev.aks.otomi.cloud/).

It is imperative to use the aliases to use the same command line commands. Not only to align with the team or to avoid manual errors, but also to use the same tooling in the docker image to avoid version skew. Please see
[bin/aliases](bin/aliases) to understand what the commands in this readme do.

This stack is published as a private docker image here: `eu.gcr.io/otomi-cloud/otomi-stack`, and the rest of this readme
is for developers only.

This readme has the following index:

1. [Prerequisites for installation](#1-prerequisites-for-installation)
2. [Installation](#2-installation)
3. [Development](#3-development)
4. [Operation](#4-operation)
5. [Troubleshooting](#4-5roubleshooting)

## 1. Prerequisites for development

It is imperative to know the functioning of [helm](https://helm.sh) and [helmfile](https://github.com/roboll/helmfile). Please read about both beforehand. They both use Go templating and make use of the [Sprig template functions](http://masterminds.github.io/sprig/).

Before listing the hard requirements I would like to offer some really helpful tools:

- [Visual Studio Code](https://code.visualstudio.com): The most used code editor, which asks to install the extensions delivered in this repo.
- [kube_ps1 prompt](https://github.com/jonmosco/kube-ps1): I have it on the right with `RPROMPT='$(kube_ps1)'`

### 1.1 Working k8s cluster with correct policies

Admin accessible k8s cluster(s). For convenience we have added `bin/create-gke-cluster.sh` to create a k8s cluster in
GKE.

If you don't have access with kubectl immediately, you have to pull the credentials from the cloud:

- Azure: `az aks get-credentials --resource-group otomi-aks-dev --name otomi-aks-dev --admin`
- AWS: `aws eks update-kubeconfig --name otomi-eks-dev`
- Google: `gcloud container clusters get-credentials otomi-gke-dev --region europe-west4 --project otomi-cloud`

If you are not logged in with the correct credentials because you were logged in for a customer, then re-login first:

- Azure: `az login`
- AWS: `aws login eks`
- Google: `gcloud auth login`

### 1.2 Unencrypted values repo

The values reside in another repo (otomi-values), and `$ENV_DIR` should be an absolute path to the root of this checked
out repo. The `*.yaml` files should be decrypted first, and for that the `GCLOUD_SERVICE_KEY` should be known to the environment. Please get the correct `.secrets` file from company storage and put it in the values repo, then source it and run `drun bin/crypt.sh dec` to decrypt.

Any changes made to the values repo should be committed from that repo, and the readme in that repo explains how. Most important part is the `bin/install-pre-commit.sh` script to automatically encrypt the values before committing.

### 1.3 Configured values

This monorepo is targeting the cluster(s) as described in the `$ENV_DIR/env/clusters.yaml.dec` file in the
`redkubes/otomi-values` repo. Please register your target clusters there.

Please look at the `$ENV_DIR/env/**` files and configure as needed for your target clusters.

## 2. Installation

The first time install must be done for each configured cloud and cluster like this:

```bash
export ENV_DIR=$PWD/../otomi-values CLOUD=(azure|google|aws) CLUSTER=(dev|demo|prd) && bin/deploy.sh
```

It should install and start all the services in this repo. In case of errors see [troubleshooting](#5-troubleshooting)
below.

### 2.1 GitOps syncing

After initial deployment, to enable Continuous Deployment of this repo from within Drone, for each cluster
(DEV|DEMO|PRD):

1. Login to Drone and activate the repo to sync with.
2. Choose the drone pipeline file to use: `.env/(azure|google|aws)/.drone.($CLUSTER).yml` and press save.

Sync is now live, and every git change is applied by each cluster's Drone by calling `bin/sync.sh` from the updated
code.

### 2.2 Manual Deployment

After initial deployment, it is possible to deploy (parts of) the stack to any cluster directly through helmfile, but
this is meant for development and dev clusters only. To be able to deploy manually, you should have the right
credentials and access rights in .kube/config. Deployment is ONLY ALLOWED BY USING THE ALIASES:

```bash
# target the customer values you wish to deploy with
export ENV_DIR=~/Documents/Workspace/redkubes/otomi/otomi-values
# target the cloud you wish you deploy to and load the aliases
export CLOUD=(azure|google|aws) && export CLUSTER=(dev|demo|prd) && . bin/utils.sh
# use hfd for deployment to dev, and hft|hfa|hfp to acc|tst|prd (see `bin/aliases`)
hfd apply|diff|template
# or target a single chart:
hfd -l name=index apply
# or target a single chart in debug mode, while excluding cruft from other helmfiles:
hfd --log-level=debug -f helmfile.d/helmfile-30.system.yaml -l name=index apply
```

### 2.3 Upgrades

The `bin/upgrades` folder should have an upgrade script for all minor and major changes. Please run successively and
make sure no errors occur.

## 3. Development

The helmfiles are found in `helmfile.d/` and `helmfile.tpl`, and their values under `values/**`. The `helmfile.tpl` dir
only contains charts that are used for basic k8s manifest generation to be deployed with kubectl apply, so we don't get
chart conflicts. (See `bin/deploy.sh` and `bin/sync.sh`.)

The charts are found in the `charts/custom` folder. These charts can be exact copies from their online counterparts (see
their `Chart.yaml`), or contain slight modifications/adaptations. The only real explicit one is `chart/index` which is
an adaption of `bitnami/nginx` to hold our custom index page listing all the accessible services in this repo.

### Helm charts & helmfiles

Open a terminal and watch all pods except those in `kube-system` namespace:

```bash
watch -n1 "kubectl --all-namespaces=true get po | grep -Fv kube-system"
```

You can test modifications to helm charts and helmfiles:

```bash
. bin/utils.sh
# diff one chart with the one deployed on dev:
hfd -l name=index diff
# deploy the whole prometheus-operator stack:
hfd -l name=prometheus-operator apply
# deploy all charts in the monitoring namespace:
hfd -f helmfile.d/helmfile-10.monitoring.yaml apply
```

## 4. Operation

As explained in the intro, the services are listed under the
[index of the admin services](https://index.team-admin.dev.aks.otomi.cloud/).

It is possible to change settings through any of these UIs, but to make them persistent these changes need to be
scripted into this repo. Please read through the charts and their values thoroughly to see how configuration is
injected.

## 5. Troubleshooting

### Deployment

It might be needed to run the deployment twice because of race conditions in the `gatekeeper-operator-artifacts` chart.

### Istio

```bash
# istio auth checks from gateway to service (here grafana):
istioctl -n istio-system authn tls-check $(kis get po -l app=istio-ingressgateway | tail -n1| awk '{print $1}') prometheus-operator-grafana.monitoring.svc.cluster.local
```
