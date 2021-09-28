#!/bin/bash

set -e

timestamp=$(date +%Y-%m-%d.%H-%M-%S)
my_kind="kind-$timestamp"

kind create cluster \
  --name "$my_kind" \
  --image kindest/node:"$KIND_TAG" \
  --config=./kind/config.yaml 

[ -n "$KIND_EXPERIMENTAL_DOCKER_NETWORK" ] && \
  kubectl config set-cluster kind-kind --server=https://kind-control-plane:6443

export METALLB_SUBNET="$(docker network inspect -f '{{ (index .IPAM.Config 0).Subnet }}' ${KIND_EXPERIMENTAL_DOCKER_NETWORK:-kind})"

helmfile -f kind/helmfile.yaml apply 

export EX_DNS_IP="$(kubectl get services/external-dns -n kind -o go-template='{{(.spec.clusterIP)}}')"
export DOMAIN_SUFFIX="$(cat kind/env/cluster.yaml | grep domainSuffix | awk '{print $2}')"

kubectl get cm coredns -n kube-system -o yaml | \
  sed -e "s/|/&\n\    $DOMAIN_SUFFIX:53 {\n\
      errors \n\
      cache 30 \n\
      forward . $EX_DNS_IP \n\
    }/" | kubectl apply -f - >/dev/null

kubectl get cm coredns -n kube-system -o yaml
echo "EX_DNS_IP: $EX_DNS_IP"
echo "DOMAIN_SUFFIX: $DOMAIN_SUFFIX"


npm set-script prepare "" && \
  npm i typescript && \
  npm run compile && \
  /usr/bin/node --experimental-specifier-resolution=node ./dist/otomi.js -- apply