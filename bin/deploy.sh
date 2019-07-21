# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env
set -e

ev=${CI_ENVIRONMENT_NAME:-dev}

if [ ! -d ~/.kube ]; then
    echo "Creating kube config"
    mkdir ~/.kube
    cat KUBECONFIG | sed -e "s/##CLUSTER##/$CLUSTER/g" >~/.kube/config
    k config set-cluster $CLUSTER --server="https://${CLUSTER_API_HOST}" --insecure-skip-tls-verify=true
    k config set-credentials default-admin --token="$(echo $KUBE_TOKEN)"
fi

kcu $cluster
k apply -f k8s/crds --recursive
k apply -f k8s/base --recursive
k apply -f k8s/apps --recursive
if [ -f "k8s/env/${ev}" ]; then
  k apply -f k8s/env/$ev --recursive
fi
if [ -f "k8s/cloud/${CLOUD}" ]; then
  k apply -f k8s/cloud/${CLOUD} --recursive
fi
hf -e $ev apply --concurrency=1
