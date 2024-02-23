#!/bin/bash

set -eu

if [[ $(helm status -n velero velero 2>/dev/null) ]]; then
  echo "Found old velero release. Upgrading Velero CRDs"
  kubectl apply -f charts/velero/crds --server-side --force-conflicts
else
  echo "Velero helm release not found. Skipping."
fi
