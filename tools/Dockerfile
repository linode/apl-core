FROM ubuntu:18.04

ARG DEBIAN_FRONTEND=noninteractive

# https://github.com/kubernetes/kubernetes/releases
ARG KUBECTL_VERSION=v1.18.12
# https://github.com/helm/helm/tags
ARG HELM_VERSION=v3.4.1
# https://github.com/databus23/helm-diff/releases
ARG HELM_DIFF_VERSION=v3.1.3
# https://github.com/zendesk/helm-secrets/releases
ARG HELM_SECRETS_VERSION=v2.0.2
# https://github.com/mozilla/sops/releases
ARG SOPS_VERSION=v3.6.1
ARG HELMFILE_VERSION=v0.128.1
# https://github.com/instrumenta/kubeval/releases
ARG KUBEVAL_VERSION=0.15.0
# https://github.com/open-policy-agent/conftest/releases
ARG CONFTEST_VERSION=0.21.0
# https://github.com/plexsystems/konstraint/releases
ARG KONSTRAINT_VERSION=0.9.1

ARG HELM_FILE_NAME=helm-${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apt-get update -qq \
  && apt install apt-transport-https ca-certificates curl software-properties-common -qqy --no-install-recommends
RUN add-apt-repository ppa:rmescandon/yq && apt-get update -qq \
  && apt-get install -qqy --no-install-recommends \
  coreutils \
  gettext \
  git \
  gnupg2 \
  netcat \
  openssh-server \
  rlwrap \
  vim \
  nano \
  groff \
  jq \
  yq \
  awscli \
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

# aws-iam-authenticator
ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator aws-iam-authenticator
RUN chmod +x aws-iam-authenticator

# sops
ADD https://github.com/mozilla/sops/releases/download/${SOPS_VERSION}/sops-${SOPS_VERSION}.linux sops
RUN chmod +x sops

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-amd64/helm helm && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}
RUN echo "exec $*" > /usr/bin/sudo && chmod +x /usr/bin/sudo
RUN helm plugin install https://github.com/futuresimple/helm-secrets --version ${HELM_SECRETS_VERSION}

# helmfile
ADD https://github.com/roboll/helmfile/releases/download/${HELMFILE_VERSION}/helmfile_linux_amd64 helmfile
RUN chmod +x helmfile

# kubeval https://github.com/instrumenta/kubeval/releases
ADD https://github.com/instrumenta/kubeval/releases/download/${KUBEVAL_VERSION}/kubeval-linux-amd64.tar.gz /tmp
RUN tar -zxvf /tmp/kubeval-linux-amd64.tar.gz -C /tmp && mv /tmp/kubeval kubeval

# conftest https://github.com/open-policy-agent/conftest/releases
ADD https://github.com/open-policy-agent/conftest/releases/download/v$CONFTEST_VERSION/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz /tmp
RUN tar -zxvf /tmp/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz -C /tmp && mv /tmp/conftest conftest

# konstraint https://github.com/plexsystems/konstraint/releases/
ADD https://github.com/plexsystems/konstraint/releases/download/v${KONSTRAINT_VERSION}/konstraint-linux-amd64 /tmp
RUN mv /tmp/konstraint-linux-amd64 konstraint && chmod +x konstraint

# node 12 https://github.com/nodesource/distributions/blob/master/README.md
RUN curl -sL https://deb.nodesource.com/setup_lts.x | bash -
RUN apt-get install -y nodejs && \
  npm install -g ajv-cli

RUN chown -R app:app /home/app
USER app

CMD "/bin/bash"
