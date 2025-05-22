#!/bin/bash

set -euo pipefail

if [ "$(yq '.spec.legacyRevision' "$ENV_DIR/env/apps/istio.yaml")" != "null" ]; then
  echo "Checking Istio installation."
  kubectl wait applications.argoproj.io -n argocd istio-system-istio-ingressgateway-public --timeout=600s --for=jsonpath='{.status.sync.status}'='Synced'
  kubectl wait applications.argoproj.io -n argocd istio-system-istio-ingressgateway-public --timeout=600s --for=jsonpath='{.status.health.status}'='Healthy'
  echo "Istio Ingress Gateway ready. Updating revision."
  yq -I 4 -i 'del(.spec.legacyRevision)' "$ENV_DIR/env/apps/istio.yaml"
  touch "$ENV_DIR/.rerun"
  if [[ -z "$(kubectl get job --ignore-not-found -ojson -n maintenance istio-operator-uninstall 2>/dev/null)" ]]; then
    echo "Scheduling cleanup."
    kubectl apply -f upgrades/post/upgrade-4-7-0-job.yaml
  fi
fi
