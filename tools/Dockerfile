# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=24.22.3
FROM node:${NODE_VERSION}-alpine AS binaries

ARG TARGETARCH
# https://github.com/kubernetes/kubernetes/releases
ARG KUBECTL_VERSION=1.36.5
# https://github.com/helm/helm/tags
ARG HELM_VERSION=4.3.1
# https://github.com/yannh/kubeconform/releases/
ARG KUBECONFORM_VERSION=0.8.0
# https://github.com/helmfile/helmfile/releases
ARG HELMFILE_VERSION=1.8.2
# https://github.com/cloudnative-pg/cloudnative-pg/releases
ARG CNPG_VERSION=1.30.1

RUN apk add --no-cache \
  coreutils \
  curl

WORKDIR /out

# kubectl
RUN curl -fsSLo kubectl "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" && \
  curl -fsSLo kubectl.sha256 "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl.sha256" && \
  echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check && \
  chmod +x kubectl && \
  rm kubectl.sha256

# cnpg kubectl plugin
RUN case "${TARGETARCH}" in \
    amd64) CNPG_ARCH=x86_64 ;; \
    arm64) CNPG_ARCH=arm64 ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
  esac && \
  curl -fsSLo kubectl-cnpg.tar.gz "https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v${CNPG_VERSION}/kubectl-cnpg_${CNPG_VERSION}_linux_${CNPG_ARCH}.tar.gz" && \
  tar -zxf kubectl-cnpg.tar.gz && \
  chmod +x kubectl-cnpg && \
  rm kubectl-cnpg.tar.gz

# helm
ARG HELM_FILE_NAME=helm-v${HELM_VERSION}-linux-${TARGETARCH}.tar.gz
RUN curl -fsSLo /tmp/${HELM_FILE_NAME} "https://get.helm.sh/${HELM_FILE_NAME}" && \
  tar -zxf /tmp/${HELM_FILE_NAME} -C /tmp && \
  mv /tmp/linux-${TARGETARCH}/helm /out/helm && \
  rm -rf /tmp/*

# helmfile
RUN curl -fsSLo /tmp/helmfile.tar.gz "https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz" && \
  tar -zxf /tmp/helmfile.tar.gz -C /tmp && \
  mv /tmp/helmfile /out/helmfile && \
  rm /tmp/helmfile.tar.gz

# kubeconform
RUN curl -fsSLo /tmp/kubeconform.tar.gz "https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-${TARGETARCH}.tar.gz" && \
  tar -zxf /tmp/kubeconform.tar.gz -C /tmp && \
  mv /tmp/kubeconform /out/kubeconform && \
  rm /tmp/kubeconform.tar.gz

FROM node:${NODE_VERSION}-alpine

RUN apk add --no-cache \
  bash \
  ca-certificates \
  git \
  rsync \
  tini

RUN addgroup -g 1001 app && \
  addgroup -g 2000 appfsgroup && \
  adduser -D -u 1001 -G appfsgroup -h /home/app -s /sbin/nologin -g "Docker image user" app

ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
ENV PATH="${PATH}:${APP_HOME}"
WORKDIR ${APP_HOME}

COPY --from=binaries /out/ ${APP_HOME}/

RUN chown -R app:app /home/app
USER app
