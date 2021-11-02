FROM otomi/tools:v1.4.20

# https://github.com/kubernetes-sigs/kind/releases
ARG KIND_VERSION=0.11.1

USER root
RUN apt update && \
  curl -sSL https://get.docker.com/ | sh && \ 
  curl -Lo /usr/bin/kind https://kind.sigs.k8s.io/dl/v${KIND_VERSION}/kind-linux-amd64 && \
  chmod +x /usr/bin/kind

USER app
COPY . .

CMD "./start-kind.sh"