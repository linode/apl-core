#!/bin/bash

set -eu

if [[ $(helm status -n default knative-operator 2>/dev/null) ]]; then
  # Since knative CRD are stored now in crds directory we need to ensure that they are not removed
  kubectl annotate crd/knativeservings.operator.knative.dev helm.sh/resource-policy='keep' --overwrite
  kubectl annotate crd/knativeeventings.operator.knative.dev helm.sh/resource-policy='keep' --overwrite
else
  echo "The old knative-operator release does not exists. Skipping"
fi
