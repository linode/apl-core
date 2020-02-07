# /bin/bash
shopt -s expand_aliases
. bin/aliases

set -e

if [ ! -z $1 ]; then
  # install some stuff that we never want to end up as charts
  # (might get corrupted and we can then never pass that stage of deployment)
  hft -f helmfile.tpl/helmfile-init.yaml | k apply -f -
  k apply --validate=false -f k8s/cert-manager-init
fi

# now the charts
hfd apply
