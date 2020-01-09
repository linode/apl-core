# /bin/bash
shopt -s expand_aliases
. bin/aliases

set -e

if [ ! -d ~/.kube ]; then
  echo "Creating kube config"
  k config set-context $K8S_CONTEXT --server=$CLUSTER_API_HOST --insecure-skip-tls-verify=true
  k config set-credentials $K8S_CONTEXT --token="$KUBE_TOKEN"
  k config set-context $K8S_CONTEXT --context=$K8S_CONTEXT
fi

kcu $K8S_CONTEXT
k apply --validate=false -f k8s/cert-manager-init
hf -e $CLOUD-$STAGE apply --concurrency=1 --skip-deps
