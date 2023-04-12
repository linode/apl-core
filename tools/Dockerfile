FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive

# https://github.com/kubernetes/kubernetes/releases
ARG KUBECTL_VERSION=1.24.12
# https://github.com/helm/helm/tags
ARG HELM_VERSION=3.9.4
# https://github.com/databus23/helm-diff/releases
ARG HELM_DIFF_VERSION=3.6.0
# https://github.com/jkroepke/helm-secrets/releases
ARG HELM_SECRETS_VERSION=3.15.0
# https://github.com/mozilla/sops/releases
ARG SOPS_VERSION=3.7.3
# https://github.com/noqcks/gucci/releases
ARG GUCCI_VERSION=1.6.6
# https://github.com/helmfile/helmfile/releases
ARG HELMFILE_VERSION=0.147.0
# https://github.com/open-policy-agent/opa/releases
ARG OPA_VERSION=0.50.1
# https://github.com/instrumenta/kubeval/releases
ARG KUBEVAL_VERSION=0.16.1
# https://github.com/open-policy-agent/conftest/releases
ARG CONFTEST_VERSION=0.39.2
# https://github.com/plexsystems/konstraint/releases
ARG KONSTRAINT_VERSION=0.26.0
# https://nodejs.org/en/download/
ARG NODE_VERSION=16
# https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/
ARG AWS_AUTHENTICATOR_VERSION=0.5.9
# https://github.com/vmware-tanzu/sonobuoy/releases/download/
ARG SONOBUOY_VERSION=0.56.16

ARG HELM_FILE_NAME=helm-v${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apt-get update -qq \
  && apt install --reinstall coreutils \
  && apt install -qqy --no-install-recommends \
  apt-transport-https \
  awscli \
  ca-certificates \
  curl \
  gettext \
  git \
  gnupg2 \
  groff \
  locales \
  nano \
  netcat \
  openssh-server \
  python3 \
  python3-pip \
  python3-setuptools \
  rlwrap \
  vim \
  nano \
  groff \
  rsync \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# set locale
RUN locale-gen en_US.UTF-8

# jq
RUN curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 --output /usr/bin/jq && \
  echo 'af986793a515d500ab2d35f8d2aecd656e764504b789b66d7e1a0b727a124c44  /usr/bin/jq' | sha256sum -c && \
  chmod +x /usr/bin/jq

# yq
COPY --from=mikefarah/yq:3 /usr/bin/yq /usr/bin/yq

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# kubectl
ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl kubectl
RUN chmod +x kubectl

# sops
ADD https://github.com/mozilla/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux sops
RUN chmod +x sops

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-amd64/helm helm && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}
RUN echo "exec \$*" > /usr/bin/sudo && chmod +x /usr/bin/sudo
RUN helm plugin install https://github.com/jkroepke/helm-secrets --version ${HELM_SECRETS_VERSION}

# helmfile
ADD https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_amd64.tar.gz /tmp
RUN tar -zxvf /tmp/helmfile_${HELMFILE_VERSION}_linux_amd64.tar.gz -C /tmp && mv /tmp/helmfile helmfile

# gucci
ADD https://github.com/noqcks/gucci/releases/download/${GUCCI_VERSION}/gucci-v${GUCCI_VERSION}-linux-amd64 gucci
RUN chmod +x gucci

# aws
RUN curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip && \
  unzip awscliv2.zip && \
  ./aws/install && \
  rm -rf awscliv2.zip aws

# aws-iam-authenticator
RUN curl -Lo aws-iam-authenticator https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v${AWS_AUTHENTICATOR_VERSION}/aws-iam-authenticator_${AWS_AUTHENTICATOR_VERSION}_linux_amd64
RUN chmod +x aws-iam-authenticator

# opa
ADD https://github.com/open-policy-agent/opa/releases/download/v${OPA_VERSION}/opa_linux_amd64 opa
RUN chmod +x opa

# kubeval
ADD https://github.com/instrumenta/kubeval/releases/download/v${KUBEVAL_VERSION}/kubeval-linux-amd64.tar.gz /tmp
RUN tar -zxvf /tmp/kubeval-linux-amd64.tar.gz -C /tmp && mv /tmp/kubeval kubeval

# conftest
ADD https://github.com/open-policy-agent/conftest/releases/download/v$CONFTEST_VERSION/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz /tmp
RUN tar -zxvf /tmp/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz -C /tmp && mv /tmp/conftest conftest

# konstraint
ADD https://github.com/plexsystems/konstraint/releases/download/v${KONSTRAINT_VERSION}/konstraint-linux-amd64 /tmp
RUN mv /tmp/konstraint-linux-amd64 konstraint && chmod +x konstraint

# node
RUN curl -sL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
RUN apt-get install -y nodejs && \
  npm install -g ajv-cli@v3.3.0 json-dereference-cli@0.1.2 zx

# conftest
ADD https://github.com/vmware-tanzu/sonobuoy/releases/download/v${SONOBUOY_VERSION}/sonobuoy_${SONOBUOY_VERSION}_linux_amd64.tar.gz /tmp
RUN tar -zxvf /tmp/sonobuoy_${SONOBUOY_VERSION}_linux_amd64.tar.gz -C /tmp && mv /tmp/sonobuoy sonobuoy

RUN chown -R app:app /home/app
USER app

CMD "/bin/bash"
