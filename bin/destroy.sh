# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

context=$CONTEXT_PREFIX-$STAGE

kcu $context
hf -e $CLOUD-$STAGE destroy --concurrency=1
