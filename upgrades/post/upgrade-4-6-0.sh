#!/bin/bash

set -eu

if [[ $(helm status -n istio-operator istio-operator-artifacts 2>/dev/null) ]]; then
  helm uninstall -n istio-operator istio-operator-artifacts
else
  echo "Istio Operator resource not deployed. Skipping"
fi

if [[ $(helm status -n istio-operator istio-operator 2>/dev/null) ]]; then
  helm uninstall -n istio-operator istio-operator
else
  echo "Istio Operator not installed. Skipping"
fi
