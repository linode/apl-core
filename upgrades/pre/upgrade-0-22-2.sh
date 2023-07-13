#!/bin/bash

set -eu

if [[ $(helm status -n cert-manager cert-manager 2>/dev/null) ]]; then
  kubectl delete -n cert-manager deployment cert-webhook cert-manager
else
  echo "The old cert-manager release does not exists. Skipping"
fi