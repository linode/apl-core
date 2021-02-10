#!/usr/bin/env bash
set -e
set -o pipefail

. bin/common.sh

# install some stuff that we never want to end up as charts
hf -f helmfile.tpl/helmfile-init.yaml template | kubectl apply -f -
kubectl apply -f charts/prometheus-operator/crds

# helm charts after
hf sync --skip-deps
