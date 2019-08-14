# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env
set -e

ev=${CI_ENVIRONMENT_NAME:-dev}
suffix="-$ev"
[ "$ev" == "prd" ] && suffix=""
apiHost="api.k8s${suffix}.$DNS_NAME"
cluster="$ev.$CUSTOMER"

if [ ! -d ~/.kube ]; then
    echo "Creating kube config"
    mkdir ~/.kube
    cat KUBECONFIG | sed -e "s/##CLUSTER##/$cluster/g" >~/.kube/config
    k config set-cluster $cluster --server="https://${apiHost}" --insecure-skip-tls-verify=true
    k config set-credentials $cluster --token="$(echo $KUBE_TOKEN)"
fi

kcu $cluster
k apply -f k8s/base --recursive
if [ -f "k8s/env/${ev}" ]; then
  k apply -f k8s/env/$ev --recursive
fi
if [ -f "k8s/cloud/${CLOUD}" ]; then
  k apply -f k8s/cloud/${CLOUD} --recursive
fi
hf repos
hf -e $ev apply --concurrency=1 --skip-deps
