#!/bin/bash

set -eu

if [[ $(helm status -n cert-manager cert-manager 2>/dev/null) ]]; then
  helm uninstall -n cert-manager cert-manager
else
  echo "The old cert-manager release does not exists. Skipping"
fi