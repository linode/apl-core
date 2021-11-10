#!/bin/bash

set -e

#####
# recommended options to start minikube
#####
# minikube start --driver docker --network minikube --kubernetes-version=v1.19.0
# docker network inspect minikube
minikube addons enable ingress

#####
# env
#####
export VERBOSITY=2
export ENV_DIR=/tmp/otomi/values
export OTOMI_TAG=quickstart-values

#####
# configure minikube to connect from otomi
#####
KUBECONFIG_MINIKUBE=~/.kube/minikube-flattened-config
kubectl config view --flatten=true > $KUBECONFIG_MINIKUBE
export KUBECONFIG=$KUBECONFIG_MINIKUBE
kubectl config set-cluster minikube --server=https://minikube:8443 --insecure-skip-tls-verify
export CUSTOM_NETWORK='--network minikube'

#####
# apply 
#####
binzx/otomi apply -l name=otomi-api
binzx/otomi apply -l name=otomi-console