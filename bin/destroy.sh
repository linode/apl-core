# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env/cloud

set -e

kcu $K8S_CONTEXT
hf -e $CLOUD-$STAGE destroy --concurrency=1
