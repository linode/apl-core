#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io -n argocd istio-operator-istio-operator-artifacts 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd istio-operator-istio-operator-artifacts
  helm uninstall -n istio-operator istio-operator-artifacts || true
else
  echo "Istio Operator resource not deployed. Skipping"
fi

if [[ $(kubectl get applications.argoproj.io -n argocd istio-operator-istio-operator 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd istio-operator-istio-operator
  helm uninstall -n istio-operator istio-operator || true
else
  echo "Istio Operator not installed. Skipping"
fi
