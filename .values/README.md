# otomi values repo (stack version: ##VERSION)

Repo that holds values for k8s clusters to deploy otomi-core on.
Contains drone pipelines for each cluster, which listen to updates of this repo.
Any updated values will be applied with the otomi cli (see `otomi help`)

This readme has the following index:

1. [Prerequisites for installation](#1-prerequisites)
2. [Configuration](#2-configuration)
3. [Deployment](#3-deployment)
4. [GitOps syncing](#4-gitops-syncing)
5. [Lifecycle management](#5-lifecycle-management)

## 1. Prerequisites

### 1.1 Admin accessible k8s cluster(s)

If you don't have access with kubectl immediately, you have to pull the credentials from the cloud:

- Azure: `otomi aks get-credentials --resource-group otomi-aks-dev --name otomi-aks-dev --admin`
- AWS: `otomi aws eks update-kubeconfig --name otomi-eks-dev`
- Google: `otomi gcloud container clusters get-credentials otomi-gke-dev --region europe-west4 --project otomi-cloud`

If you are not logged in with the correct credentials because you were logged in for another customer, then re-login first:

- Azure: `otomi az login` or, more directly with `otomi az login --tenant $TENANT_ID`
- AWS: `otomi aws login eks`
- Google: `otomi gcloud auth login`

### 1.2 Docker credentials for Otomi API (paid license)

To pull the API image locally you will have received the \$OTOMI_PULLSECRET. Please put it in your `.secrets` file and run `otomi bootstrap` once again to pull in extra files.

## 2. Configuration

To work with the values repo you will need the `otomi` command line tool.
If you read this you will have already installed it and ran the dockerized bootstrapper.

After this initial boostrap demo files were installed (`env/**/*.yaml`), demonstrating all the possibilities of the values configuration.
There are two ways to configure these: manually, or with the Otomi Console UI.

It's easiest to start by editing the basic configuration settings in the files themselves. It also helps to understand what is going on. (The bulk of the work is setting up and harvesting the credentials for all the Azure service principals, Google service accounts and AWS secrets and keys.)

Please edit the value files to your liking. Remove the cloud providers not in use, and edit/add your clusters.

### Otomi Console UI (paid license)

If you have a paid license to use the Otomi API you should be able to use the Otomi Console UI. It's user friendly interface allows you to operate on the values more easily.
To start the console locally (using docker-compose):

```bash
otomi console
```

If you see errors about your values folder not yet git initialized, then please do so and push to it's remote location. Otherwise Otomi API can not pull the values.
It might also complain about missing or faulty git credentials, so please follow the instructions and make sure the credentials are correct.

After running DEPLOY in the UI, the values are saved to it's remote git location. However, it has not really deployed to your target cluster(s) yet. The first time this will have to be done with the cli. Please refer to the [deployment section](#3-deployment) for that.

### 2.1 Manual configuration

When using Visual Studio Code the values will be automatically validated, and autocompletion and hints will be available.
(IMPORTANT NOTE: this will only work when all suggested extensions have been installed!)

Please configure all the empty/dummy yaml values remaining.

Don't forget: hovering over a yaml key will give you a description about it's intent. Autocompletion will insert defaults or show example values.

### 2.2 Changing values of running clusters

Pull the latest changes with `otomi pull` before editing values. When opening secrets files these will be de-/encrypted on the fly when using VSCode.

### 2.3 Diffing resulting output

After changing values you can do a `git diff` (which will take care of decrypting on the fly) of course, but you can also run a k8s resources diff with the target cluster:

```bash
otomi diff
# or target one release:
otomi diff -l name=prometheus-operator
```

### 2.3 Committing values

To save changes to git do:

```bash
otomi commit
```

This will do some extra work (git pull, generate drone pipelines), before committing the values with a standardized commit message. (Don't forget to run `git push` when you are done as that is not included by design :)

**Warning:**
It is recommended to use vscode with the `signageos.signageos-vscode-sops` extension to edit `secrets.*.yaml` files on the fly.

It is also possible to decrypt a file with `otomi decrypt ${file}` (resulting in `${file}.dec`) but beware as helmfile has a bug, which results in any `\*.dec` files being removed by each helmfile command (see: [roboll/helmfile#1517](https://github.com/roboll/helmfile/issues/1517)). It is therefor recommended to immediately encrypt the file after making changes with `otomi encrypt ${file}` until that bug is resolved.

## 3. Deployment

To deploy everything in the stack:

```bash
otomi deploy
```

NOTICE: when on GKE this may sometimes result in an access token refresh error as the full path to the `gcloud` binary is referenced from GKE's token refresh mechanism in `.kube/config`, which is mounted from the host, but inaccessible from within the container. (See bug report: https://issuetracker.google.com/issues/171493249).
Retrying the command usuall works, but we have created an issue to workaround this annoyance ([#178](https://github.com/redkubes/otomi-core/issues/178)).

It is also possible to target individual helmfile releases from the stack:

```bash
otomi apply -l name=prometheus-operator
```

This will first do a `diff` and then a `sync`. But if you expect the helm bookkeeping to not match the current state (because resources were manipulated without helm), then do a sync:

```bash
# or target one release:
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

We try to automate as much as possible with the scripts found in `otomi-core/bin/upgrades/`, but since this is a large monorepo with many working parts we can't guarantee seamless upgrades from every version.

So every time an upgrade of the stack is released it is important to follow these steps first:

1. Read the release notes on [redkubes/otomi-core](https://github.com/redkubes/otomi-core) for impact and special cases.
2. Check the corresponding upgrade script(s) and read the comments. It might involve manual steps.
3. Set the new version tag in `clusters.yaml` and run `otomi bootstrap` to pull in latest artifacts
4. Do a diff first: `otomi diff`
