#!/bbin/env bash
shopt -s expand_aliases
. bin/aliases

hfd lint
hfd diff
