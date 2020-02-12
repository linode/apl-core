# /bin/bash
shopt -s expand_aliases
set -e
. bin/aliases

hft -f helmfile.tpl/helmfile-init.yaml -l name!=base | k apply -f -
hfd apply
