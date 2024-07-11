#!/bin/bash

set -eu

kubectl delete job gitea-prepare -n maintenance
kubectl delete job harbor -n maintenance
kubectl delete job keycloak -n maintenance

if [[ $(helm status -n gitea-operator gitea-operator 2>/dev/null) ]]; then
  helm uninstall -n gitea-operator gitea-operator
  kubectl delete ns gitea-operator
fi
