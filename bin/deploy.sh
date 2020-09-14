#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases 
set -e

# install some stuff that we never want to end up as charts
otomi templates -f helmfile.tpl/helmfile-init.yaml | k apply -f -

# not ready yet:
# set +e
# k -n maintenance create secret generic flux-ssh --from-file=identity=.ssh/id_rsa &>/dev/null
# set -e
k apply -f charts/gatekeeper-operator/crds
k apply -f charts/prometheus-operator/crds

otomi templates -f helmfile.tpl/helmfile-init.yaml -l name!=base | k apply -f -
otomi apply
