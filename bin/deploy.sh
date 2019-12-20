# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env

set -e

ev=${CI_ENVIRONMENT_NAME:-dev}
suffix="-$ev"
[ "$ev" == "prd" ] && suffix=""
cluster="$CLUSTER_PREFIX-$ev"

if [ ! -d ~/.kube ]; then
  echo "Creating kube config"
  k config set-cluster $cluster --server=$CLUSTER_API_HOST --insecure-skip-tls-verify=true
  k config set-credentials $cluster --token="$KUBE_TOKEN"
  k config set-context $cluster --cluster=$cluster
fi

kcu $cluster
k apply -f k8s/base --recursive
hf -e $ev apply --concurrency=1 --skip-deps
