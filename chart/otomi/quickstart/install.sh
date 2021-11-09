#!/bin/bash

set -e

# minikube start --driver docker --network minikube --kubernetes-version=v1.19.0
# docker network inspect minikube

export VALUES_INPUT=./chart/otomi/quickstart/values.yaml
export VERBOSITY=2
export ENV_DIR=/tmp/otomi/values
export CI=1
export NOPULL=1

# rm -rf $ENV_DIR
# binzx/otomi bootstrap

KUBECONFIG_MINIKUBE=~/.kube/minikube-flattened-config
kubectl config set-cluster minikube --server=https://minikube:8443 
kubectl config view --flatten=true > $KUBECONFIG_MINIKUBE
export KUBECONFIG=$KUBECONFIG_MINIKUBE

# export CUSTOM_NETWORK='--network minikube'
binzx/otomi apply