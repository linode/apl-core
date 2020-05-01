#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh
set -e

# install some stuff that we never want to end up as charts
hft -f helmfile.tpl/helmfile-init.yaml | k apply -f -
# not ready yet:
# set +e
# k -n maintenance create secret generic flux-ssh --from-file=identity=.ssh/id_rsa &>/dev/null
# set -e
# k apply --validate=false -f k8s/cert-manager-init

# now sync
bin/sync.sh
