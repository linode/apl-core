#!/bin/bash

set -eu

if [[ $(kubectl get deployment -n cert-manager cert-manager -o jsonpath='{.metadata.labels.app\.kubernetes\.io/version}') == "v1.10.0" ]]; then
  kubectl delete -n cert-manager deployment cert-manager-cainjector cert-manager-webhook cert-manager
else
  echo "The old cert-manager release does not exists. Skipping"
fi