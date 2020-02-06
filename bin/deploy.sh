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

# install some stuff that we never want to end up as charts
# (might get corrupted and we can then never pass that stage of deployment)
hft | k apply -f -
k apply --validate=false -f k8s/cert-manager-init
hf apply
