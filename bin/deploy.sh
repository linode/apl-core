#!/usr/bin/env bash
. bin/aliases
set -e

# install some stuff that we never want to end up as charts
otomi template -f helmfile.tpl/helmfile-init.yaml | otomi x kubectl apply -f -
# not ready yet:
# set +e
# k -n maintenance create secret generic flux-ssh --from-file=identity=.ssh/id_rsa &>/dev/null
# set -e
otomi x kubectl apply -f charts/gatekeeper-operator/crds
otomi x kubectl apply -f charts/prometheus-operator/crds

# now sync
otomi apply
