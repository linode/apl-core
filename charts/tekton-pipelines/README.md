# tekton helm chart

## Setup
First add the Jenkins X chart repository

```sh
helm repo add cdf https://cdfoundation.github.io/tekton-helm-chart/
```
If it already exists be sure to update the local cache
```
helm repo update
```

## Basic install
```
helm upgrade --install tekton cdf/tekton-pipeline
```

## Authenticated Git requests
If you are working with private git repositories or require secrets to tag or perform remote git actions then you can provide basic authentication which will be automatically mounted into Tekton Pipline pods.  We recommend using a bot user and a personal access token.

GitHub Example:

```sh
helm upgrade --install --set auth.git.username=bot-user --set auth.git.password=123456abcdef --set auth.git.url=https://github.com tekton jenkins-x/tekton 
```
## Authenticated Docker registries
If you are pushing images to authenticated docker registries you can provide basic authentication which will be automatically mounted into Knative Tekton Pipline pods.

DockerHub Example:

```sh
helm upgrade --install --set auth.docker.username=fred --set auth.docker.password=flintstone --set auth.docker.url=https://index.docker.io/v1/  tekton jenkins-x/tekton 
```
## Configuration options

|       Parameter                 |           Description                             |                         Default                                                 |
|----------------------------------------|---------------------------------------------------|--------------------------------------------------------------------------|
| `auth.git.username`             | Optional basic auth username for git provider     | ``                                                                              |
| `auth.git.password`             | Optional basic auth password for git provider     | ``                                                                              |
| `auth.git.url`                  | Optional basic auth server for git provider       | `https://github.com`                                                            |
| `auth.docker.username`          | Optional basic auth username for docker registry  | ``                                                                              |
| `auth.docker.password`          | Optional basic auth password for docker registry  | ``                                                                              |
| `auth.docker.url`               | Optional basic auth server for docker registry    | `https://index.docker.io/v1/`                                                   |
| `image.tag`                     | Docker image tag                                  | `see latest values.yaml`                                                        |
| `image.kubeconfigwriter`        | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/kubeconfigwriter` |
| `image.credsinit`               | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/creds-init`       |
| `image.gitinit`                 | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/git-init`         |
| `image.nop`                     | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/nop`              |
| `image.bash`                    | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/bash`             |
| `image.gsutil`                  | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/gsutil`           |
| `image.controller`              | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/controller`       |
| `image.webhook`                 | Docker image                                      | `gcr.io/knative-nightly/github.com/knative/build-pipeline/cmd/webhook`          |
