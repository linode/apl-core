#!/usr/bin/env bash
set -e
set -o pipefail

hf="helmfile -e $CLOUD-$CLUSTER"
# install some stuff that we never want to end up as charts
$hf -f helmfile.tpl/helmfile-init.yaml template | kubectl apply -f -
# not ready yet:
# set +e
# k -n maintenance create secret generic flux-ssh --from-file=identity=.ssh/id_rsa &>/dev/null
# set -e
kubectl apply -f charts/gatekeeper-operator/crds
kubectl apply -f charts/prometheus-operator/crds

$hf apply --skip-deps
