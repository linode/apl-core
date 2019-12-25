# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

cluster="$CLUSTER_PREFIX-$STAGE"

if [ ! -d ~/.kube ]; then
  echo "Creating kube config"
  k config set-cluster $cluster --server=$CLUSTER_API_HOST --insecure-skip-tls-verify=true
  k config set-credentials $cluster --token="$KUBE_TOKEN"
  k config set-context $cluster --cluster=$cluster
fi

kcu $cluster
hf -e $CLOUD-$STAGE apply --concurrency=1 --skip-deps
