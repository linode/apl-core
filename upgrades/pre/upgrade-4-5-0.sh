#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io -n argocd keycloak-keycloak-operator-cr 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd keycloak-keycloak-operator-cr
fi

if [[ $(kubectl get applications.argoproj.io -n argocd keycloak-keycloak-operator 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd keycloak-keycloak-operator
fi
