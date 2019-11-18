FROM alpine:3.10

ARG KUBECTL_VERSION=1.15.6
ARG HELM_VERSION=2.14.3
ARG HELM_DIFF_VERSION=v2.11.0+5
ARG HELM_TILLER_VERSION=v0.9.3
ARG HELMFILE_VERSION=0.92.1

ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz

LABEL version="${HELMFILE_VERSION}-${HELM_VERSION}-${KUBECTL_VERSION}"

WORKDIR /

RUN apk --update --no-cache add bash ca-certificates coreutils git gnupg curl gettext jq

ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl

ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator /usr/local/bin/aws-iam-authenticator
RUN chmod +x /usr/local/bin/aws-iam-authenticator

ADD http://storage.googleapis.com/kubernetes-helm/${HELM_FILE_NAME} /tmp
RUN ls -als /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm /bin/helm \
  && rm -rf /tmp/* \
  && /bin/helm init --client-only

RUN mkdir -p "$(helm home)/plugins" && \
  helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION} && \
  helm plugin install https://github.com/futuresimple/helm-secrets --version ${HELM_SECRETS_VERSION} && \
  helm plugin install https://github.com/rimusz/helm-tiller --version ${HELM_TILLER_VERSION}

ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /bin/helmfile
RUN chmod 0755 /bin/helmfile

CMD "/bin/helmfile"
