FROM ubuntu:18.04

ARG DEBIAN_FRONTEND=noninteractive

# https://github.com/kubernetes/kubernetes/releases
ARG KUBECTL_VERSION=v1.18.12

# https://cloud.google.com/sdk/docs/downloads-versioned-archives
ARG GOOGLE_SDK_VERSION=318.0.0
# https://github.com/helm/helm/tags
ARG HELM_VERSION=v3.4.1
# https://github.com/databus23/helm-diff/releases
ARG HELM_DIFF_VERSION=v3.1.3
ARG EKSCTL_VERSION=0.31.0

ARG HELM_FILE_NAME=helm-${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apt-get update -qq \
  && apt install apt-transport-https ca-certificates curl gnupg-agent software-properties-common -qqy --no-install-recommends \
  build-essential \
  coreutils \
  gettext \
  python3 \
  python3-pip \
  python3-setuptools \
  rlwrap \
  vim \
  nano \
  groff \
  jq \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# kubectl
ADD https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl kubectl
RUN chmod +x kubectl

# azure
RUN curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | tee /etc/apt/trusted.gpg.d/microsoft.asc.gpg > /dev/null
RUN AZ_REPO=$(lsb_release -cs) && echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | tee /etc/apt/sources.list.d/azure-cli.list
RUN apt-get update -qq &&  apt-get install -qqy azure-cli --no-install-recommends && rm -rf /var/lib/apt/lists/* 

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-amd64/helm helm && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}

# eksctl
ADD https://github.com/weaveworks/eksctl/releases/download/${EKSCTL_VERSION}/eksctl_Linux_amd64.tar.gz /tmp
RUN tar -zxvf /tmp/eksctl_Linux_amd64.tar.gz -C /tmp && mv /tmp/eksctl eksctl && rm -rf /tmp/*

# aws
RUN pip3 install --upgrade --no-cache-dir awscli

# aws-iam-authenticator
ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator aws-iam-authenticator
RUN chmod +x aws-iam-authenticator

# gcloud
ADD https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-${GOOGLE_SDK_VERSION}-linux-x86_64.tar.gz /tmp/gsdk.tar.gz
RUN tar -zxvf /tmp/gsdk.tar.gz -C /tmp && mv /tmp/google-cloud-sdk/bin $APP_HOME/gsdk && rm -rf /tmp/*
ENV PATH $PATH:$APP_HOME/gsdk

RUN chown -R app:app /home/app
USER app

CMD "/bin/bash"
