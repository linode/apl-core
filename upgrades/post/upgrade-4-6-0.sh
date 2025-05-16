#!/bin/bash

set -eu

echo "Checking Istio installation."
if [[ $(kubectl wait applications.argoproj.io -n argocd istio-system-istio-ingressgateway-public --timeout=60s --for=jsonpath='{.status.health.status}'='Healthy' 2>/dev/null) ]]; then
  echo "Istio Ingress Gateway ready. Updating revision."
  yq -I 4 -i '.spec.defaultRevision = "1-26-0"' "$ENV_DIR/env/apps/istio.yaml"
fi
