#!/bin/bash

set -eu

[[ ! $(helm status -n default istio-operator) ]] && echo "The old istio-operator release does not exists. Skipping" && exit 0

# Istio release has been moved to the istio-operator namespace. It is safet to delete it because helm does not remove CRDs and removing operator itself does not impact service mesh
helm uninstall istio-operator -n default
