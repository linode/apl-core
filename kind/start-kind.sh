#!/bin/sh

set -e

export KUBECONFIG="${HOME}/.kube/config"
export KIND_EXPERIMENTAL_DOCKER_NETWORK=kind
if ! kind create cluster; then
  kind delete cluster && exec $(readlink -f "$0") && exit 1
fi

# kubectl config set-cluster kind-kind --server=https://kind-control-plane:6443

export METALLB_SUBNET="$(docker network inspect -f '{{ (index .IPAM.Config 0).Subnet }}' ${KIND_EXPERIMENTAL_DOCKER_NETWORK:-kind})"

helmfile -f helmfile.yaml apply 

export EX_DNS_IP="$(kubectl get services/external-dns -n kind -o go-template='{{(.spec.clusterIP)}}')"
export DOMAIN_SUFFIX="kind.local"

kubectl get cm coredns -n kube-system -o yaml | \
  sed -e "s/|/&\n\    $DOMAIN_SUFFIX:53 {\n\
      errors \n\
      cache 30 \n\
      forward . $EX_DNS_IP \n\
    }/" | kubectl apply -f - >/dev/null

kubectl get cm coredns -n kube-system -o yaml
echo "EX_DNS_IP: $EX_DNS_IP"
echo "DOMAIN_SUFFIX: $DOMAIN_SUFFIX"