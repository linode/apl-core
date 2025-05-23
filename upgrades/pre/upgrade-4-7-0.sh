#!/bin/bash

set -euo pipefail

if [ "$(yq '.spec.legacyRevision' "$ENV_DIR/env/apps/istio.yaml")" != "operator" ]; then
  echo "Checking if Istio Operator is installed."
  if [[ $(kubectl get applications.argoproj.io -n argocd istio-operator-istio-operator 2>/dev/null) ]]; then
    if [[ -z "$(kubectl get job --ignore-not-found -ojson -n maintenance istio-operator-uninstall 2>/dev/null)" ]]; then
      echo "Operator found. Setting revision."
      yq -I 4 -i '.spec.legacyRevision = "operator"' "$ENV_DIR/env/apps/istio.yaml"
    else
      echo "Operator removal pending."
    fi
  fi
fi
