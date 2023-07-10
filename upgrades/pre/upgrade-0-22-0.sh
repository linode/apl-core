#!/bin/bash

set -eu

if [[ $(helm status -n harbor harbor 2>/dev/null) ]]; then
  kubectl annotate -n harbor secret/harbor-database helm.sh/resource-policy='keep' deprecated=true
  kubectl annotate -n harbor sts/harbor-database helm.sh/resource-policy='keep' deprecated=true
  kubectl annotate -n harbor svc/harbor-database helm.sh/resource-policy='keep' deprecated=true
else
  echo "Harbor doesn't exist. Skipping"
fi

if [[ $(helm status -n kube-system kured 2>/dev/null) ]]; then
  helm uninstall -n kube-system kured
else
  echo "The old kured release does not exists. Skipping"
fi

if [[ $(helm status -n monitoring prometheus-operator 2>/dev/null) ]]; then
  helm uninstall -n monitoring prometheus-operator
else
  echo "The old prometheus-operator release does not exists. Skipping"
fi

if [[ $(helm status -n tekton-pipeline tekton 2>/dev/null) ]]; then
  helm uninstall -n tekton-pipeline tekton
  [[ $(kubectl get ns tekton 2>/dev/null) ]] && kubectl delete ns tekton
  [[ $(kubectl get ns tekton-pipeline 2>/dev/null) ]] && kubectl delete ns tekton-pipeline
else
  echo "The old tekton release does not exists. Skipping"
fi