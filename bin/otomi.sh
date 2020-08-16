#/usr/bin/env bash
set -e
CMD=$1

ENV_DIR=$PWD
OTOMI_IMAGE=''
K8S_CONTEXT=''
KUBE_CONTEXT_REFRESH=0
STACK_DIR=${STACK_DIR:-'/home/app/stack'}
DOCKER_WORKING_DIR=$STACK_DIR
VERBOSE=0


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
}

function set_otomi_image {
  source $ENV_DIR/env.ini
  local version
  eval "version=\$${CLUSTER}Version"
  [[ -z "$version" ]] && echo "Unable to retrieve otomi-stack image version" && exit 1
  OTOMI_IMAGE="eu.gcr.io/otomi-cloud/otomi-stack:${version}"
}

validate_env() {
  if [[ -z "$CLOUD" ||  -z "$GCLOUD_SERVICE_KEY" || -z "$CLUSTER" ]]; then
    echo "Error<$0>: Missing environment variables"
    exit 2
  fi
}

function drun() {
  if [ $VERBOSE -eq 1 ]; then
    echo "Command: $@"
  fi
  
  # execute any kubectl command to refresh access token
  if [ $KUBE_CONTEXT_REFRESH -eq 1 ]; then
    kubectl version >/dev/null
  fi

  if [[ "$STACK_DIR" != "/home/app/stack" ]]; then
    STACK_VOLUME="-v ${STACK_DIR}:${STACK_DIR}"
  fi

  docker run -it --rm \
    -v $PWD:$PWD \
    -v /tmp:/tmp \
    -v ${HOME}/.kube/config:/home/app/.kube/config \
    -v ${HELM_CONFIG}:/home/app/.config/helm \
    -v ${HOME}/.config/gcloud:/home/app/.config/gcloud \
    -v ${HOME}/.aws:/home/app/.aws \
    -v ${HOME}/.azure:/home/app/.azure \
    -v ${ENV_DIR}:/home/app/stack/env \
    $STACK_VOLUME \
    -e K8S_CONTEXT="$K8S_CONTEXT" \
    -e CLOUD="$CLOUD" \
    -e GCLOUD_SERVICE_KEY="$GCLOUD_SERVICE_KEY" \
    -e CLUSTER="$CLUSTER" \
    -w $DOCKER_WORKING_DIR \
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
      drun $@
      break
      ;;
    esac
  done
}


function verbose_env {
  if [ $VERBOSE -eq 1 ]; then
    echo "DOCKER_WORKING_DIR=$DOCKER_WORKING_DIR"
    echo "K8S_CONTEXT=$K8S_CONTEXT"
    echo "KUBE_CONTEXT_REFRESH=$KUBE_CONTEXT_REFRESH"
    echo "OTOMI_IMAGE=$OTOMI_IMAGE"
    echo "STACK_DIR=$STACK_DIR"
  fi 
}
verbose_env
validate_env
set_otomi_image
set_k8s_context
execute $@
