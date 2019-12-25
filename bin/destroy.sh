# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

cluster="$CLUSTER_PREFIX-$STAGE"

kcu $CLUSTER
hf -e $CLOUD-$STAGE destroy --concurrency=1
