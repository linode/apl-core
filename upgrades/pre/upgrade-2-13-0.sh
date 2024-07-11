#!/bin/bash

set -eu

if [[ $(kubectl get job gitea-prepare -n maintenance 2>/dev/null) ]]; then
  kubectl delete job gitea-prepare -n maintenance
fi

if [[ $(kubectl get job harbor -n maintenance 2>/dev/null) ]]; then
  kubectl delete job harbor -n maintenance
fi

if [[ $(kubectl get job keycloak -n maintenance 2>/dev/null) ]]; then
  kubectl delete job keycloak -n maintenance
fi

if [[ $(helm status -n gitea-operator gitea-operator 2>/dev/null) ]]; then
  helm uninstall -n gitea-operator gitea-operator
  kubectl delete ns gitea-operator
fi
