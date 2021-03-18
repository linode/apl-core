#!/usr/bin/env bash
. bin/common.sh

set -eo pipefail

# install some stuff that we never want to end up as charts
hf -f helmfile.tpl/helmfile-init.yaml template | kubectl apply -f -
kubectl apply -f charts/prometheus-operator/crds

# helm charts after
hf apply --skip-deps -l stage!=post

# Post deploy tasks
bin/retrieve-credentials.sh
bin/gitea-push.sh 

hf apply --skip-deps -l stage=post