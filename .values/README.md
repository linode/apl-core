# otomi values repo

Repo that holds values for a customer's clusters to deploy otomi-stack on.

Contains drone pipelines for each cluster, which listens to updates of this repo.
Any updated values will be applied with the otomi cli (see `otomi help`)

## 1. Prerequisites

### 1.1 Working k8s cluster with correct policies

Admin accessible k8s cluster(s).

If you don't have access with kubectl immediately, you have to pull the credentials from the cloud:

- Azure: `az aks get-credentials --resource-group otomi-aks-dev --name otomi-aks-dev --admin`
- AWS: `aws eks update-kubeconfig --name otomi-eks-dev`
- Google: `gcloud container clusters get-credentials otomi-gke-dev --region europe-west4 --project otomi-cloud`

If you are not logged in with the correct credentials because you were logged in for a customer, then re-login first:

- Azure: `az login`
- AWS: `aws login eks`
- Google: `gcloud auth login`

### 1.2 Docker credentials for local tooling

Use the following command to configure Docker to use the correct credentials for pulling the API image (paid license) on your workstation.

```bash
gcloud auth configure-docker
```

## 2. Development / configuration

Most of the time you will work with the `otomi` command line tool.

If you read this you will have already installed it and ran the bootstrapper.

### 2.1 Changing values

In order pull changes from remote git repo use:

```bash
otomi pull
```

This will do a git pull and decrypt the values.

In case the stack version of your target cluster in `env.ini` was changed because of an upgrade, run `otomi bootstrap` to pull in the latest cli and other corresponding resources to become up to date.

### 2.2 Diffing resulting output

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

After initial deployment, to enable Continuous Deployment of this repo from within Drone (running in the cluster), for each otomi:

1. Login to Drone and activate the repo to sync with.
2. Choose the drone pipeline file to use: `clouds/(aws|azure|google|onprem)/$CLUSTER/.drone.yml` and press save.

Sync is now live, and every git change is applied by each cluster's Drone.
