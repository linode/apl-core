# /bin/bash
shopt -s expand_aliases
. bin/aliases
. .env
set -e

ev=${1:-dev}
envs="dev tst acc prd"
if [[ ! $envs == *$ev* ]]; then
  echo "NO SUCH ENVIRONMENT: $ev"
  exit 1
fi

kcu $CLUSTER
hf -e $ev destroy --concurrency=1
if [ -d "k8s/cloud/${CLOUD}" ]; then
  k delete -f k8s/cloud/${CLOUD} --recursive
fi
if [ -d "k8s/env${ev}" ]; then
  k delete -f k8s/env/$ev --recursive
fi
k delete -f k8s/apps --recursive
k delete -f k8s/base --recursive
k delete -f k8s/crds --recursive

# everything one more time to be sure
k delete -f k8s/ --recursive
