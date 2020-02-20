#!/bbin/env bash
shopt -s expand_aliases
. bin/utils.sh

hfd lint
hfd diff
