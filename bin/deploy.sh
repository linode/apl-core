# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

#cluster="$CLUSTER_PREFIX-$STAGE"
cluster=taco.hamers@dev-redkubes-io.eu-central-1.eksctl.io

if [ ! -d ~/.kube ]; then
  echo "Creating kube config"
  k config set-cluster $cluster --server=$CLUSTER_API_HOST --insecure-skip-tls-verify=true
  k config set-credentials $cluster --token="$KUBE_TOKEN"
  k config set-context $cluster --cluster=$cluster
fi

echo kcu $cluster
echo hf -e $CLOUD-$STAGE apply --concurrency=1 --skip-deps
