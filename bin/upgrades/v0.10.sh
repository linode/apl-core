#!/usr/bin/env sh
shopt -s expand_aliases
. bin/utils.sh
set -e

# pre update steps:

# Now able to tag old resources to be adopted by helm 3.20, yay!
# https://github.com/helm/helm/issues/7697#issuecomment-613535044

# istio-operator
KIND=namespace
NAME=istio-operator
RELEASE=istio-operator
NAMESPACE=default
. bin/upgrades/adopt-by-helm.sh

# gatekeeper
KIND=namespace
NAME=gatekeeper-system
RELEASE=gatekeeper-operator
NAMESPACE=default
. bin/upgrades/adopt-by-helm.sh

KIND=crd
for NAME in $(k get crd | grep gatekeeper | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh
done

# cert-manager
KIND=crd
RELEASE=cert-manager
NAMESPACE=ingress
for NAME in $(k get crd | grep cert-manager | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh
done

# nginx-ingress
RELEASE=nginx-ingress
NAME=nginx-ingress
NAMESPACE=ingress
for KIND in "rolebinding" "role"; do
  . bin/upgrades/adopt-by-helm.sh
done

