FROM alpine:3.10

ARG KUBECTL_VERSION=1.15.6
ARG HELM_VERSION=3.0.0
ARG HELM_DIFF_VERSION=v3.0.0-rc.8
ARG HELMFILE_VERSION=0.93.2

ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz

LABEL version="${HELMFILE_VERSION}-${HELM_VERSION}-${KUBECTL_VERSION}"

WORKDIR /

RUN apk --update --no-cache add bash ca-certificates coreutils git gnupg curl gettext jq python-dev

ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /bin/kubectl
RUN chmod +x /bin/kubectl

ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm /bin/helm \
  && rm -rf /tmp/* 

RUN helm plugin install https://github.com/databus23/helm-diff --version master

ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /bin/helmfile
RUN chmod 0755 /bin/helmfile

# Install gcloud SDK
RUN curl https://sdk.cloud.google.com | bash

CMD "/bin/helmfile"
