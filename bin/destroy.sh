# /bin/bash
shopt -s expand_aliases
set -e
. bin/aliases

kcu $K8S_CONTEXT
kkc
