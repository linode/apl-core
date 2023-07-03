#!/bin/bash

set -eu

if [[ $(helm status -n harbor harbor) ]]; then
  kubectl annotate -n harbor secret/harbor-database helm.sh/resource-policy='keep' deprecated=true
  kubectl annotate -n harbor sts/harbor-database helm.sh/resource-policy='keep' deprecated=true
  kubectl annotate -n harbor svc/harbor-database helm.sh/resource-policy='keep' deprecated=true
else
  echo "Harbor doesn't exist. Skipping"
fi

if [[ $(helm status -n kube-system kured) ]]; then
  helm uninstall -n kube-system kured
else
  echo "The old kured release does not exists. Skipping"
fi

if [[ $(helm status -n monitoring prometheus-operator) ]]; then
  helm uninstall -n monitoring prometheus-operator
else
  echo "The old prometheus-operator release does not exists. Skipping"
fi
