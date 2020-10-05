# otomi-stack

Otomi Stack is Otomi's opinionated Kubernetes stack, offering an out of the box operations stack to help manage clusters.

An architecture overview can be found here: [docs/architecture.md](./docs/architecture.md)

This stack is published as public docker image (`otomi/stack:latest`). This readme is aimed at development & deployment.

This readme has the following index:

1. [Prerequisites for installation](#1-prerequisites)
2. [Development](#2-development)
3. [Deployment](#3-deployment)

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

Use the following command to configure Docker to use the correct credentials for pulling the API image (paid license) locally.

```bash
gcloud auth configure-docker
```

### 1.3 Values repo

If you don't yet have a values repo, you can start one in a new folder like this:

```bash
docker run -e ENV_DIR=$PWD -v $PWD:$PWD otomi/stack:latest bin/bootstrap.sh
```

This will also install the needed artifacts (such as the Otomi CLI) and demo values.

Please read the `README.md` that is exported as it has extensive instructions on initial configuration.

### 1.4 Key Service Account

Please refer to [SOPS](https://github.com/mozilla/sops) to get acquainted and choose / wire up your KMS provider.

### 1.5 Local tooling

- npm@~10.0 binary
- `npm install` in root

## 2. Development

Most of the code is in go templates: helmfile's `*.gotmpl` and helm chart's `templates/*.yaml`. Please become familiar with it's intricacies. Notable quirks that can give you headaches:

- dashes (`-`) in the template statements remove all whitespace characters (before or after the statement). The helm formatter will always autoclose with an ending dash. Sometimes you need to remove this ending dash to not break the yaml.

Helmfile has some custom functionality, but uses a subset of Helm's features. Most notable differences:

- helm's `.Files.Get` can be achieved by helmfile's `readFile`
- helm's `.Files.Glob` can be achieved by executing a bash command and parsing the result. (See `helmfile.d/snippets/env.gotmpl`)
- helmfile's `get` can read a nested property and takes an optional default value, which you can see a lot in the top of the `*.gotmpl` files

### 2.1 Testing

To test code against running clusters you will need to export at least `ENV_DIR`, `CLOUD` and `CLUSTER` and source the aliases:

```bash
export ENV_DIR=$PWD/../otomi-values CLOUD=google CLUSTER=demo && . bin/aliases
```

After changing code you can do a diff to see everything still works:

```bash
otomi diff
# or target one release:
otomi diff -l name=prometheus-operator
```

## 3. Deployment

It is preferred that deployment is done from the values repo, as it is tied to a cluster, and thus can do least damage.
When you feel that you are in control and want fast iteration you can connect to a values repo directly by exporting `ENV_DIR`. It is mandatory and won't work without it. The CLI will also check that you are targeting `kubectl`'s `current-context` as a failsafe mechanism.

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
