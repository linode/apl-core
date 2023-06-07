#!/bin/bash

set -eu

[[ ! $(helm status -n operator-lifecycle-manager operator-lifecycle-manager) ]] && echo "The operator-lifecycle-manager release does not exists. Skipping" && exit 0

# we can remove the release because helm does not remove CRDs
helm uninstall -n operator-lifecycle-manager operator-lifecycle-manager
# The olmconfigs is a new CRD so it cannot be replaced before applying
kubectl apply -f charts/operator-lifecycle-manager/crds/0000_50_olm_00-olmconfigs.crd.yaml
# replace OLM crds because helm won't upgrade them
kubectl replace -f charts/operator-lifecycle-manager/crds
