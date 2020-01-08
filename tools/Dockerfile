FROM alpine:3.10

ARG KUBECTL_VERSION=1.15.6
ARG HELM_VERSION=3.0.2
ARG HELM_DIFF_VERSION=v3.0.0-rc.7
ARG HELMFILE_VERSION=0.98.1
ARG EKSCTL_VERSION=0.11.1

ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz

WORKDIR /

RUN apk --update --no-cache add bash ca-certificates coreutils git gnupg curl gettext jq python-dev py-pip

ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl

# Install gcloud SDK
RUN curl https://sdk.cloud.google.com | bash

ADD https://amazon-eks.s3-us-west-2.amazonaws.com/1.12.7/2019-03-27/bin/linux/amd64/aws-iam-authenticator /usr/local/bin/aws-iam-authenticator
RUN chmod +x /usr/local/bin/aws-iam-authenticator

RUN pip install --upgrade --no-cache-dir awscli

ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm /bin/helm \
  && rm -rf /tmp/*

RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}

ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /bin/helmfile
RUN chmod 0755 /bin/helmfile

ADD https://github.com/weaveworks/eksctl/releases/download/${EKSCTL_VERSION}/eksctl_Linux_amd64.tar.gz /tmp
RUN tar -zxvf /tmp/eksctl_Linux_amd64.tar.gz -C /tmp \
  && mv /tmp/eksctl /bin/eksctl \
  && rm -rf /tmp/*

ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /bin/helmfile
RUN chmod 0755 /bin/helmfile

CMD "/bin/helmfile"
