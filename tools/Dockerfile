# FROM alpine:3.10
# FROM microsoft/azure-cli
FROM ubuntu:18.04

ARG DEBIAN_FRONTEND=noninteractive

ARG KUBECTL_VERSION=1.15.7
ARG HELM_VERSION=3.2.0
ARG HELM_DIFF_VERSION=v3.1.1
ARG HELM_SECRETS_VERSION=v2.0.2
ARG HELMFILE_VERSION=0.114.0
ARG EKSCTL_VERSION=0.18.0

ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apt-get update -qq && \
  apt-get install -qqy --no-install-recommends \
  apt-transport-https \
  build-essential \
  curl \
  ca-certificates \
  coreutils \
  git \
  gnupg \
  gettext \
  lsb-release \
  python3 \
  python3-pip \
  python3-setuptools \
  rlwrap \
  vim \
  nano \
  groff \
  jq

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# azure
RUN curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | tee /etc/apt/trusted.gpg.d/microsoft.asc.gpg > /dev/null
RUN AZ_REPO=$(lsb_release -cs) && echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | tee /etc/apt/sources.list.d/azure-cli.list
RUN apt-get update -qq &&  apt-get install -qqy azure-cli \
  && rm -rf /var/lib/apt/lists/* 

# kubectl
ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl $APP_HOME/kubectl
RUN chmod +x $APP_HOME/kubectl

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm $APP_HOME/helm \
  && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}
RUN echo "exec $*" > /usr/bin/sudo && chmod +x /usr/bin/sudo
RUN helm plugin install https://github.com/futuresimple/helm-secrets --version ${HELM_SECRETS_VERSION}

# helmfile
ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 $APP_HOME/helmfile
RUN chmod 0755 $APP_HOME/helmfile

# eksctl
ADD https://github.com/weaveworks/eksctl/releases/download/${EKSCTL_VERSION}/eksctl_Linux_amd64.tar.gz /tmp
RUN tar -zxvf /tmp/eksctl_Linux_amd64.tar.gz -C /tmp \
  && mv /tmp/eksctl $APP_HOME/eksctl \
  && rm -rf /tmp/*

# aws
RUN pip3 install --upgrade --no-cache-dir awscli
ENV PATH $PATH:/root/google-cloud-sdk/bin

# aws-iam-authenticator
ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator $APP_HOME/aws-iam-authenticator
RUN chmod +x $APP_HOME/aws-iam-authenticator

# gcloud
RUN curl https://sdk.cloud.google.com | bash
ENV PATH $PATH:$APP_HOME/google-cloud-sdk/bin

# yaml2json
RUN curl -Lo yaml2json https://github.com/wakeful/yaml2json/releases/latest/download/yaml2json-linux-amd64 && chmod +x yaml2json

CMD "/bin/bash"
