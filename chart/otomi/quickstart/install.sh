#!/bin/bash

set -e

# minikube start --driver docker --network minikube --kubernetes-version=v1.19.0
# docker network inspect minikube

export VERBOSITY=2
export ENV_DIR=/tmp/otomi/values
export OTOMI_TAG=quickstart-values

KUBECONFIG_MINIKUBE=~/.kube/minikube-flattened-config
kubectl config view --flatten=true > $KUBECONFIG_MINIKUBE
export KUBECONFIG=$KUBECONFIG_MINIKUBE
kubectl config set-cluster minikube --server=https://minikube:8443 --insecure-skip-tls-verify

export CUSTOM_NETWORK='--network minikube'
binzx/otomi apply