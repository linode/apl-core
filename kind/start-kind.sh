#!/bin/sh

# setup k8s cluster
export KIND_EXPERIMENTAL_DOCKER_NETWORK="${KIND_EXPERIMENTAL_DOCKER_NETWORK:-kind}"
if ! kind create cluster --config kind.yaml --image kindest/node:v1.19.0; then
  kind delete cluster && exec $(readlink -f "$0") && exit 1
fi

# configure metallb, k8s-external
export METALLB_SUBNET="$(docker network inspect -f '{{ (index .IPAM.Config 0).Subnet }}' $KIND_EXPERIMENTAL_DOCKER_NETWORK)"

helmfile -f helmfile.yaml apply 

# configure dns
export EX_DNS_IP="$(kubectl get services/external-dns -n kind -o go-template='{{(.spec.clusterIP)}}')"
export DOMAIN_SUFFIX="kind.local"

kubectl get cm coredns -n kube-system -o yaml | \
  sed -e "s/|/&\n\    $DOMAIN_SUFFIX:53 {\n\
      errors \n\
      cache 30 \n\
      forward . $EX_DNS_IP \n\
    }/" | kubectl apply -f - >/dev/null