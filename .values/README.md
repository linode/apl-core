# otomi values repo

Repo that holds values for k8s clusters to deploy otomi-stack on.
Contains drone pipelines for each cluster, which listen to updates of this repo.
Any updated values will be applied with the otomi cli (see `otomi help`)

This readme has the following index:

1. [Prerequisites for installation](#1-prerequisites)
2. [Configuration](#2-configuration)
3. [Deployment](#3-deployment)
4. [GitOps syncing](#4-gitops-syncing)
5. [Lifecycle management](#4-lifecycle-management)

## 1. Prerequisites

### 1.1 Working k8s cluster with correct policies

Admin accessible k8s cluster(s).

If you don't have access with kubectl immediately, you have to pull the credentials from the cloud:

- Azure: `otomi aks get-credentials --resource-group otomi-aks-dev --name otomi-aks-dev --admin`
- AWS: `otomi aws eks update-kubeconfig --name otomi-eks-dev`
- Google: `otomi gcloud container clusters get-credentials otomi-gke-dev --region europe-west4 --project otomi-cloud`

If you are not logged in with the correct credentials because you were logged in for another customer, then re-login first:

- Azure: `otomi az login` or, more directly with `otomi az login --tenant $TENANT_ID`
- AWS: `otomi aws login eks`
- Google: `otomi gcloud auth login`

### 1.2 Docker credentials for local tooling

Use the following command to configure Docker to use the correct credentials for pulling the API image (paid license) locally:

```bash
otomi gcloud auth configure-docker
```

## 2. Configuration

Most of the time you will work with the `otomi` command line tool.
If you read this you will have already installed it and ran the bootstrapper.

### 2.1 Initial configuration

The bulk of the work is setting up and harvesting the credentials for all the Azure service principals, Google service accounts and AWS secrets and keys.

### 2.2 Changing values

In order pull changes from remote git repo use:

```bash
otomi pull
```

This will do a git pull and decrypt the values.

In case the stack version of your target cluster in `env.ini` was changed because of an upgrade, run `otomi bootstrap` to pull in the latest cli and other corresponding resources to become up to date.

### 2.3 Diffing resulting output

After changing values you can do a diff:

```bash
otomi diff
# or:
otomi diff -l name=prometheus-operator
```

### 2.3 Committing values

In order to save changes in local git repo use:

```bash
otomi commit
```

This will encrypt the values and create a commit with standardized commit message.

## 3. Deployment

To deploy everything in the stack:

```bash
otomi deploy
```

It is also possible to target individual helmfile releases from the stack:

```bash
otomi apply -l name=prometheus-operator
```

This will first do a `diff` and then a `sync`. But if you expect the helm bookkeeping to not match the current state (because resources were manipulated without helm), then do a sync:

```bash
# or:
otomi sync -l name=prometheus-operator
```

## 4. GitOps syncing

After initial deployment, to enable Continuous Deployment of this repo from within Drone (running in the cluster), for each cluster:

1. Login to Drone and activate the repo to sync with.
2. Choose the drone pipeline file to use: `clouds/(aws|azure|google|onprem)/$CLUSTER/.drone.yml` and press save.

Sync is now live, and every git change is applied by each cluster's Drone.

## 5. Lifecycle management

Otomi Stack contains a curated list of apps, which are mostly deployed by [mature k8s operators](https://operatorhub.io/). We strive to only adopt operators with capability level "Seamless Upgrades". However, many parts are not at that maturity level, and therefor we have to write upgrade scripts. A lot of the times this involves removing/patching existing resources before helm can adopt or manipulate them. Notable issues:

- Resources not under helm chart control: since helm 3.2 these can be adopted. When trying to deploy helm resources over existing resources helm will give detailed instructions on how to adopt these.
- Some resources have labels and do not allow changing them. This usually points to bad chart practices, but mandates removal before recreating these resources. This can't always be done and is a big drawback. Remedies exist but might have to be investigated on the fly.

We try to automate as much as possible with the scripts found in `bin/upgrades/`, but since this is a large monorepo with many working parts we can't guarantee seamless upgrades from every version.

So every time an upgrade of the stack is released it is important to follow these steps:

1. Read the release notes on [redkubes/otomi-stack](https://github.com/redkubes/otomi-stack) for impact and special cases.
2. Check the corresponding upgrade script(s) and read the comments. It might involve manual steps.
3. Set the new version tag in `env.ini` and run `otomi bootstrap` to pull in latest artifacts
4. Do a diff first: `otomi diff`
