# syntax=docker/dockerfile:1.6
FROM ubuntu:24.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
# https://github.com/kubernetes/kubernetes/releases
ARG KUBECTL_VERSION=1.34.2
# https://github.com/helm/helm/tags
ARG HELM_VERSION=3.19.2
# https://github.com/databus23/helm-diff/releases
ARG HELM_DIFF_VERSION=3.14.1
# https://github.com/noqcks/gucci/releases
ARG GUCCI_VERSION=1.9.0
# https://github.com/yannh/kubeconform/releases/
ARG KUBECONFORM_VERSION=0.7.0
# https://github.com/helmfile/helmfile/releases
ARG HELMFILE_VERSION=1.2.2
# https://nodejs.org/en/download/
ARG NODE_VERSION=24
# https://github.com/cloudnative-pg/cloudnative-pg/releases
ARG CNPG_VERSION=1.27.1
# https://github.com/jqlang/jq/releases/
ARG JQ_VERSION=1.8.1

ARG HELM_FILE_NAME=helm-v${HELM_VERSION}-linux-${TARGETARCH}.tar.gz
WORKDIR /

# Install all required packages in one layer
RUN apt-get update && apt-get install -y \
  curl \
  apache2-utils \
  ca-certificates \
  git \
  locales \
  rsync && \
  rm -rf /var/lib/apt/lists/* && \
  locale-gen en_US.UTF-8

# jq
RUN curl -LO "https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-linux-${TARGETARCH}" && \
  curl -L "https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/sha256sum.txt" | grep "jq-linux-${TARGETARCH}" > sha256sum.txt && \
  echo sha256sum --check sha256sum.txt && \
  mv jq-linux-${TARGETARCH} /usr/bin/jq && \
  chmod +x /usr/bin/jq

RUN mkdir -p /home/app
RUN groupadd -r app && \
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# kubectl
RUN curl -LO "https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/$TARGETARCH/kubectl" && \
  curl -LO "https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/$TARGETARCH/kubectl.sha256" && \
  echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check && \
  chmod +x kubectl

# cnpg kubectl plugin
RUN CNPG_ARCH=$(if [ "${TARGETARCH}" = "amd64" ]; then echo "x86_64"; else echo "${TARGETARCH}"; fi) && \
  curl -LO "https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v${CNPG_VERSION}/kubectl-cnpg_${CNPG_VERSION}_linux_${CNPG_ARCH}.tar.gz" && \
  tar -zxvf kubectl-cnpg_${CNPG_VERSION}_linux_${CNPG_ARCH}.tar.gz && \
  chmod +x kubectl-cnpg && \
  rm kubectl-cnpg_${CNPG_VERSION}_linux_${CNPG_ARCH}.tar.gz

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-${TARGETARCH}/helm helm && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}

# helmfile
ADD https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz /tmp
RUN tar -zxvf /tmp/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz -C /tmp && mv /tmp/helmfile helmfile

# gucci
ADD https://github.com/noqcks/gucci/releases/download/v${GUCCI_VERSION}/gucci-v${GUCCI_VERSION}-linux-${TARGETARCH} gucci
RUN chmod +x gucci

# kubeconform
ADD https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-${TARGETARCH}.tar.gz /tmp
RUN tar -zxvf /tmp/kubeconform-linux-${TARGETARCH}.tar.gz -C /tmp && mv /tmp/kubeconform kubeconform

# node
# https://github.com/nodesource/distributions
RUN set -uex && \
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x -o nodesource_setup.sh && \
  bash nodesource_setup.sh && \
  apt-get update && \
  apt-get install -y nodejs

FROM ubuntu:24.04 AS final

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME
ENV PATH="/usr/local/bin:${PATH}"

# Copy over binaries
COPY --from=builder /usr/bin /usr/bin
# Copy over node_modules (npm)
COPY --from=builder /usr/lib /usr/lib
# Copy over tools
COPY --from=builder $APP_HOME $APP_HOME
COPY --from=builder $HOME/.local/share/helm/plugins $HOME/.local/share/helm/plugins
# Copy over trust store
COPY --from=builder /etc/ssl /etc/ssl

RUN chown -R app:app /home/app
USER app

CMD ["/bin/bash"]
