#/usr/bin/env bash
set -e
CMD=$1

VALUES_DIR=$PWD
OTOMI_IMAGE=''
OTOMI_MODE='values'
K8S_CONTEXT=''
KUBE_CONTEXT_REFRESH=0

[[ -z "$CMD" ]] && echo "Missing command argument" && exit 2

function set_k8s_context {

  if [[ "$CLOUD" == "aws" ]]; then
    K8S_CONTEXT="${CUSTOMER}-eks-${CLUSTER}"
  elif [[ "$CLOUD" == "azure" ]]; then
    K8S_CONTEXT="${CUSTOMER}-aks-${CLUSTER}-admin"
  elif [[ "$CLOUD" == "google" ]]; then
    K8S_CONTEXT="gke_${PROJECT}_${GOOGLE_REGION}_${CLUSTER_NAME}"
  else
    K8S_CONTEXT="${CUSTOMER}-${CLOUD}-${CLUSTER}"
  fi
  echo "K8S_CONTEXT=$K8S_CONTEXT"
}

function set_otomi_mode {
  if [[ "$(basename $PWD)" == "otomi-stack" ]]; then
    OTOMI_MODE='stack'
  else
    OTOMI_MODE='values'
  fi
  echo "OTOMI_MODE=$OTOMI_MODE"
}

function set_otomi_image {

  if [[ "$OTOMI_MODE" == 'stack' ]]; then
    local version="v$(jq --raw-output .version package.json)"
  else
    source $VALUES_DIR/env.ini
    local version
    eval "version=\$${CLUSTER}Version"
  fi
  [[ -z "$version" ]] && echo "Unable to retrieve otomi-stack image version" && exit 1
  OTOMI_IMAGE="eu.gcr.io/otomi-cloud/otomi-stack:${version}"
  echo "OTOMI_IMAGE=$OTOMI_IMAGE"

}

validate_env() {
  if [[ -z "$CLOUD" ||  -z "$GCLOUD_SERVICE_KEY" || -z "$CLUSTER" ]]; then
    echo "Error<$0>: Missing environment variables"
    exit 2
  fi
}

function drun() {
  echo $@
  # execute any kubectl command to refresh access token
  if [ $KUBE_CONTEXT_REFRESH -eq 1 ]; then
    kubectl version >/dev/null
  fi
  docker run -it --rm \
    -v $PWD:$PWD \
    -v /tmp:/tmp \
    -v ${HOME}/.kube/config:/home/app/.kube/config \
    -v $HELM_CONFIG:/home/app/.config/helm \
    -v ${HOME}/.config/gcloud:/home/app/.config/gcloud \
    -v ${HOME}/.aws:/home/app/.aws \
    -v ${HOME}/.azure:/home/app/.azure \
    -v $ENV_DIR:$PWD/env \
    -e K8S_CONTEXT="$K8S_CONTEXT" \
    -e CLOUD="$CLOUD" \
    -e GCLOUD_SERVICE_KEY="$GCLOUD_SERVICE_KEY" \
    -e CLUSTER="$CLUSTER" \
    -w $PWD \
    $OTOMI_IMAGE \
    $@
}

function execute {
  while :
  do 
    case $CMD in
    helm)
      drun helm "${@:2}"
      break
      ;;
    helmfile)
      drun helmfile "${@:2}"
      break
      ;;
    hfd)
      drun helmfile "${@:2}" --skip-deps
      break
      ;;
    aws)
      drun aws "${@:2}"
      break
      ;;
    az)
      drun az "${@:2}"
      break
      ;;
    gcloud)
      drun gcloud "${@:2}"
      break
      ;;
    deploy)
      drun bin/deploy.sh
      break
      ;;
    encrypt)
      drun bin/crypt.sh enc
      break
      ;;
    decrypt)
      drun bin/crypt.sh dec
      break
      ;;
    set-values-git-hooks)
      drun bin/install-git-hooks.sh
      break
      ;;
    set-values-drone-pipelines)
      drun bin/gen-drone.sh
      break
      ;;
    *)
      echo "Sorry, I don't understand"
      exit 1
      ;;
    esac
  done
}

echo "Otomi"

validate_env
set_otomi_mode
set_otomi_image
set_k8s_context
execute $@
 
echo "That's all folks!"
