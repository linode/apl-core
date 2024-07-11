#!/bin/bash

set -eu

kubectl annotate -n gitea secret/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea sts/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea svc/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true

if [[ $(helm status -n gatekeeper-system gatekeeper 2>/dev/null) ]]; then
  helm uninstall -n gatekeeper-system gatekeeper
  helm uninstall -n gatekeeper-system gatekeeper-artifacts
  helm uninstall -n gatekeeper-system gatekeeper-constraints
  helm uninstall -n gatekeeper-system opa-exporter-artifacts
  helm uninstall -n opa-exporter opa-exporter
fi

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
