FROM alpine:3.10

ARG KUBECTL_VERSION=1.15.6
ARG HELM_VERSION=2.13.0
# ARG HELM_VERSION=3.0.0
ARG HELM_DIFF_VERSION=v2.11.0+5
# ARG HELM_DIFF_VERSION=master
# ARG HELM_DIFF_VERSION=v3.0.0-rc.8
ARG HELM_TILLER_VERSION=v0.9.3
ARG HELMFILE_VERSION=0.93.2

ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apk --update --no-cache add bash ca-certificates coreutils git gnupg curl gettext jq

ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /bin/kubectl
RUN chmod +x /bin/kubectl

ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator /bin/aws-iam-authenticator
RUN chmod +x /bin/aws-iam-authenticator

ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm /bin/helm \
  && rm -rf /tmp/* \
  && /bin/helm init \
  --client-only

RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION} && \
  helm plugin install https://github.com/rimusz/helm-tiller --version ${HELM_TILLER_VERSION}

ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /bin/helmfile
RUN chmod 0755 /bin/helmfile

CMD "/bin/helmfile"
