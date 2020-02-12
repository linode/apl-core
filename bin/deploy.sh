# /bin/bash
shopt -s expand_aliases
set -e
. bin/aliases

# install some stuff that we never want to end up as charts
# (might get corrupted and we can then never pass that stage of deployment)
hft -f helmfile.tpl/helmfile-init.yaml | k apply -f -
k apply --validate=false -f k8s/cert-manager-init

# now sync
bin/sync.sh
