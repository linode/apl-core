#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io gitea-operator-gitea-operator -n argocd 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io gitea-operator-gitea-operator -n argocd
fi

if [[ $(helm status -n gitea-operator gitea-operator 2>/dev/null) ]]; then
  helm uninstall -n gitea-operator gitea-operator
  kubectl delete ns gitea-operator
fi

if [[ $(helm status -n maintenance job-gitea-prepare 2>/dev/null) ]]; then
  helm uninstall -n maintenance job-gitea-prepare
fi

if [[ $(helm status -n maintenance job-harbor 2>/dev/null) ]]; then
  helm uninstall -n maintenance job-harbor
fi

if [[ $(helm status -n maintenance job-keycloak 2>/dev/null) ]]; then
  helm uninstall -n maintenance job-keycloak
fi
