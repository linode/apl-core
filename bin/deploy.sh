#!/usr/bin/env bash
. bin/common.sh

crypt

# generate and show certs in case charts.demo-tlspass.enabled
[ -z "$CI" ] && bin/gen-demo-mtls-cert-secret.sh

# install some stuff that we never want to end up as charts
hf -f helmfile.tpl/helmfile-init.yaml template | kubectl apply -f -
# and prometheus-operator crds so charts can deploy ServiceMonitor
kubectl apply -f charts/prometheus-operator/crds

# helm charts after
hf -l stage!=post apply --skip-deps

# Post deploy tasks
[ -z "$CI" ] && bin/gen-drone.sh && bin/gitea-push.sh

hf -l stage=post apply --skip-deps
