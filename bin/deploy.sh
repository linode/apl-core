#!/usr/bin/env bash
. bin/common.sh

run_crypt

[ -z "$CI" ] && bin/gen-demo-mtls-cert-secret.sh

# install some stuff that we never want to end up as charts
hf -f helmfile.tpl/helmfile-init.yaml template | kubectl apply -f -
# and prometheus-operator crds so charts can deploy ServiceMonitor
kubectl apply -f charts/prometheus-operator/crds

# helm charts after
hf -l stage!=post apply --skip-deps

# Post deploy tasks
[ -z "$CI" ] && bin/gitea-push.sh

hf -l stage=post apply --skip-deps
