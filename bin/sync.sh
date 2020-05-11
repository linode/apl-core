#!/usr/bin/env bash
shopt -s expand_aliases
[ -z $1 ] && . bin/utils.sh
set -e

hft -f helmfile.tpl/helmfile-init.yaml -l name!=base | k apply -f -
hfd apply
