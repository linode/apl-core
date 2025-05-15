#!/bin/bash

set -eu

echo "Checking Istio installation."
if [[ $(kubectl wait applications.argoproj.io -n argocd istio-system-istio-ingressgateway-public --timeout=60s --for=jsonpath='{.status.sync.status}'='Synced' 2>/dev/null) ]]; then
  echo "Istio Ingress Gateway ready. Updating revision."
  yq -I 4 -i '.spec.defaultRevision = "1-26-0"' "$ENV_DIR/env/apps/istio.yaml"
fi

#if [[ ! $(kubectl get --selector apl.io/istio-gateway=canary --all-namespaces gateway 2>/dev/null) ]]; then
#  echo "No more canary gateway detected."
#
#  if [[ $(kubectl get applications.argoproj.io -n argocd istio-operator-istio-operator-artifacts 2>/dev/null) ]]; then
#    kubectl delete applications.argoproj.io -n argocd istio-operator-istio-operator-artifacts
#    helm uninstall -n istio-operator istio-operator-artifacts || true
#  else
#    echo "Istio Operator resource not deployed. Skipping"
#  fi
#
#  if [[ $(kubectl get applications.argoproj.io -n argocd istio-operator-istio-operator 2>/dev/null) ]]; then
#    kubectl delete applications.argoproj.io -n argocd istio-operator-istio-operator
#    helm uninstall -n istio-operator istio-operator || true
#    kubectl delete customresourcedefinition istiooperators.install.istio.io || true
#    kubectl ns istio-operator --wait=false || true
#  else
#    echo "Istio Operator not installed. Skipping"
#  fi
#fi
