FROM node:16-buster-slim

ADD https://github.com/roboll/helmfile/releases/download/v0.140.1/helmfile_linux_amd64 /usr/bin/helmfile
ADD https://storage.googleapis.com/kubernetes-release/release/v1.20.6/bin/linux/amd64/kubectl /usr/bin/kubectl
ADD https://get.helm.sh/helm-v3.6.3-linux-amd64.tar.gz /tmp

RUN apt update && \
  apt install curl git -y && \
  curl -sSL https://get.docker.com/ | sh && \ 
  curl -Lo /usr/bin/kind https://kind.sigs.k8s.io/dl/v0.11.1/kind-linux-amd64 && \
  tar -zxvf /tmp/helm-v3.6.3-linux-amd64.tar.gz -C /tmp && mv /tmp/linux-amd64/helm /usr/bin/helm && rm -rf /tmp/* && \
  chmod +x /usr/bin/kubectl /usr/bin/helmfile /usr/bin/kind /usr/bin/helm && \
  helm plugin install https://github.com/databus23/helm-diff --version 3.1.3

COPY . .

CMD "./start-kind.sh"