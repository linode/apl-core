#!/bin/bash

set -eu

if [[ $(helm status -n istio-operator istio-operator 2>/dev/null) ]]; then
  kubectl delete --ignore-not-found -n istio-system istiooperator istiocontrolplane
  helm uninstall -n istio-operator istio-operator
else
  echo "Istio Operator not installed. Skipping"
fi
