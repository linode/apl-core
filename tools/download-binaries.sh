#!/bin/bash
set -e

# Define architecture and versions
ARCH=${1:-amd64}
KUBECTL_VERSION="1.26.9"
HELM_VERSION="3.12.3"
HELMFILE_VERSION="0.156.0"
SOPS_VERSION="3.7.3"
GUCCI_VERSION="1.6.6"
AWS_IAM_AUTHENTICATOR_VERSION="1.21.2"
KUBECONFORM_VERSION="0.6.4"
HELM_DIFF_VERSION="3.8.0"
HELM_SECRETS_VERSION="3.15.0"

echo "installing kubectl..."
curl -sSLO "https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/$TARGETARCH/kubectl"
curl -sSLO "https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/$TARGETARCH/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
chmod +x kubectl
echo "kubectl installed!"

echo "installing sops..."
curl -sSL "https://github.com/mozilla/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux" -o sops
chmod +x sops
echo "sops installed!"

echo "installing helm..."
HELM_FILE_NAME="helm-v${HELM_VERSION}-linux-${ARCH}.tar.gz"
curl -sSL -o /tmp/${HELM_FILE_NAME} "https://get.helm.sh/${HELM_FILE_NAME}"
tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-${TARGETARCH}/helm helm && rm -rf /tmp/*
helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}
echo "exec \$*" > /usr/bin/sudo && chmod +x /usr/bin/sudo
helm plugin install https://github.com/jkroepke/helm-secrets --version ${HELM_SECRETS_VERSION}
echo "helm installed!"

echo "installing helmfile..."
curl -sSL https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz -o /tmp/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz
tar -zxvf /tmp/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz -C /tmp && mv /tmp/helmfile helmfile
echo "helmfile installed!"

echo "installing gucci..."
curl -sSL "https://github.com/noqcks/gucci/releases/download/${GUCCI_VERSION}/gucci-v${GUCCI_VERSION}-linux-${ARCH}" -o gucci
chmod +x gucci
echo "gucci installed!"

echo "installing awscli..."
pip3 install --upgrade --no-cache-dir awscli
echo "awscli installed!"

echo "installing aws-iam-authenticator..."
curl -sSL "https://s3.us-west-2.amazonaws.com/amazon-eks/${AWS_IAM_AUTHENTICATOR_VERSION}/2021-07-05/bin/linux/${ARCH}/aws-iam-authenticator" -o aws-iam-authenticator
chmod +x aws-iam-authenticator
echo "aws-iam-authenticator installed!"

echo "installing kubeconform..."
KUBECONFORM_FILE="kubeconform-linux-${ARCH}.tar.gz"
curl -sSL "https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/${KUBECONFORM_FILE}" -o ${KUBECONFORM_FILE}
tar -zxvf /tmp/${KUBECONFORM_FILE} -C /tmp && mv /tmp/kubeconform kubeconform
echo "kubeconform installed!"

echo "All binaries downloaded and installed."
