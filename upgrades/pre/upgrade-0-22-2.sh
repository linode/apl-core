#!/bin/bash

set -eu

if [[ $(helm status -n cert-manager cert-manager 2>/dev/null) ]]; then
  kubectl delete -n cert-manager deployment cert-manager cert-manager-cainjector cert-manager-webhook
else
  echo "The old prometheus-operator release does not exists. Skipping"
fi