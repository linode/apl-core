# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

context=$CONTEXT_PREFIX-$STAGE

if [ ! -d ~/.kube ]; then
  echo "Creating kube config"
  k config set-context $context --server=$CLUSTER_API_HOST --insecure-skip-tls-verify=true
  k config set-credentials $context --token="$KUBE_TOKEN"
  k config set-context $context --context=$context
fi

kcu $context
hf -e $CLOUD-$STAGE apply --concurrency=1 --skip-deps
