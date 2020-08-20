#/usr/bin/env bash
#####################################################################################
##
## NOTE:
## This is a command line tool to operate on otomi-stack.
## All commands and executed in docker container.
## Keep this file as simple as possible:
## - do not depend on any external files.
## - do not use any non standard tooling.
## - only Docker is needed to run otomi-stack image
## If you need to use any extra binaries then most probably you want to run as a part of otomi-stack image.
##
#####################################################################################
set -ex
CMD=$1

CUSTOMER=''
CURRENT_DIR_NAME=$(basename "$PWD")
OTOMI_IMAGE=''
K8S_CONTEXT=''
SET_KUBE_CONTEXT=1
DOCKER_WORKING_DIR='/home/app/stack'
STACK_DIR=$DOCKER_WORKING_DIR
DOCKER_TTY_PARAMS=''
VERBOSE=1
HELM_CONFIG=''


function set_helm_config {
  uname -a | grep -i darwin >/dev/null
  if [ $? -eq 0 ]; then
    HELM_CONFIG="$HOME/Library/Preferences/helm"
  else
    HELM_CONFIG="$HOME/.config/helm"
  fi
  return 0
}

function show_usage {
  echo "The $0 usage:
    aws - run CLI AWS
    az - run CLI for Azure
    bash - run interactive bash
    deploy - execute otomi-stack deploy script
    decrypt - decrypt values to env/*.dec files
    encrypt - encrypt values encrypt all env/*.dec files
    eksctl - run CLI for Amazon EKS
    exec - execute custom command
    gcloud - run CLI for Google Cloud
    helm - run helm
    helmfile - run helmfile with selected environment <CLOUD>-<CLUSTER>
    helmfile-raw - run helmfile without any additional parameters
    helmfile-values - show merged values 
    helmfile-template - run helmfile template
    helmfile-template-quiet - run helmfile template (only print yaml documents)
    help - print this help
    install-git-hooks - set pre-commit and post-merge git hooks
    install-drone-pipelines - create drone configuration file at env/<CLOUD>/.drone.<CLUSTER>.yml file
    kubectl - run kubectl
  "
}

function set_k8s_context {
  local ENV_FILE="${ENV_DIR}/env/${CLOUD}/${CLUSTER}.sh"
  [ ! -f $ENV_FILE ] && echo "The file '${ENV_FILE}' does not exist" && exit 1
  source $ENV_FILE
  [[ -z "$K8S_CONTEXT" ]] && echo "The K8S_CONTEXT env is not defined in $ENV_FILE" && exit 1
  return 0
}

function use_k8s_context {
  kubectl config use-context $K8S_CONTEXT > /dev/null
  return 0
}

function set_env_ini {
  local INIT_PATH=$ENV_DIR/env.ini
  source $INIT_PATH
  local version
  eval "version=\$${CLUSTER}Version"
  [[ -z "$version" ]] && echo "Unable to evaluate '${CLUSTER}Version' variable from $INIT_PATH" && exit 1
  [[ -z "$customer" ]] && echo "Unable to evaluate 'customer' variable from $INIT_PATH" && exit 1

  OTOMI_IMAGE="eu.gcr.io/otomi-cloud/otomi-stack:${version}"
  CUSTOMER=$customer
  return 0
}

validate_env() {
  [[ -z "$CLOUD" ]] && echo "Error<$0>: The CLOUD environment variable is not set" && exit 2
  [[ -z "$CLUSTER" ]] && echo "Error<$0>: The CLUSTER environment variable is not set" && exit 2
  [[ -z "$GCLOUD_SERVICE_KEY" ]] && echo "Error<$0>: The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  return 0
}

function drun() {
  CMD=$@
  
  # execute any kubectl command to refresh access token
  if [ $SET_KUBE_CONTEXT -eq 1 ]; then
    set_k8s_context
    use_k8s_context
    kubectl version >/dev/null
  fi

  if [ $VERBOSE -eq 1 ]; then
    echo "Command: $CMD"
    verbose_env
  fi

  docker run $DOCKER_TTY_PARAMS --rm \
    -v /tmp:/tmp \
    -v ${HOME}/.kube/config:/home/app/.kube/config \
    -v ${HELM_CONFIG}:/home/app/.config/helm \
    -v ${HOME}/.config/gcloud:/home/app/.config/gcloud \
    -v ${HOME}/.aws:/home/app/.aws \
    -v ${HOME}/.azure:/home/app/.azure \
    -v ${ENV_DIR}:${STACK_DIR}/env \
    $STACK_VOLUME \
    -e CUSTOMER=$CUSTOMER \
    -e CLOUD="$CLOUD" \
    -e GCLOUD_SERVICE_KEY="$GCLOUD_SERVICE_KEY" \
    -e CLUSTER="$CLUSTER" \
    -e K8S_CONTEXT="$K8S_CONTEXT" \
    -w $DOCKER_WORKING_DIR \
    $OTOMI_IMAGE \
    $CMD
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
      drun helmfile -e ${CLOUD}-$CLUSTER "${@:2}" --skip-deps
      break
      ;;
    helmfile-raw)
      drun helmfile "${@:2}"
      break
      ;;
    helmfile-values)
      drun helmfile -f helmfile.tpl/helmfile-dump.yaml build
      break
      ;;
    helmfile-template)
      drun helmfile -e ${CLOUD}-$CLUSTER "${@:2}" template --skip-deps
      break
      ;;
    helmfile-template-quiet)
      drun helmfile -e ${CLOUD}-$CLUSTER --quiet "${@:2}" template --skip-deps | grep --color=auto --exclude-dir=.cvs --exclude-dir=.git --exclude-dir=.hg --exclude-dir=.svn -vi skipping | grep --color=auto --exclude-dir=.cvs --exclude-dir=.git --exclude-dir=.hg --exclude-dir=.svn -vi "helmfile-"
      break
      ;;
    aws)
      SET_KUBE_CONTEXT=0
      drun aws "${@:2}"
      break
      ;;
    az)
      SET_KUBE_CONTEXT=0
      drun az "${@:2}"
      break
      ;;
    eksctl)
      SET_KUBE_CONTEXT=0
      drun eksctl "${@:2}"
      break
      ;; 
    gcloud)
      SET_KUBE_CONTEXT=0
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
    install-git-hooks)
      SET_KUBE_CONTEXT=0
      drun bin/install-git-hooks.sh
      break
      ;;
    install-drone-pipelines)
      SET_KUBE_CONTEXT=0
      drun bin/gen-drone.sh
      break
      ;;
    bash)
      DOCKER_TTY_PARAMS='-it'
      drun bash
      break
      ;;
    help)
      show_usage
      break
      ;;
    exec)
      drun "${@:2}"
      break
      ;;
    kubectl)
      drun kubectl "${@:2}"
      break
      ;;
    *)
      show_usage
      echo "Unknown command: $@"
      exit 1
      ;;
    esac
  done
}


function verbose_env {
  echo "DOCKER_WORKING_DIR=$DOCKER_WORKING_DIR"
  echo "ENV_DIR=$ENV_DIR"
  echo "STACK_DIR=$STACK_DIR"
  echo "OTOMI_IMAGE=$OTOMI_IMAGE"
  echo "SET_KUBE_CONTEXT=$SET_KUBE_CONTEXT"
  echo "K8S_CONTEXT=$K8S_CONTEXT"
}

function set_env_and_stack_dir {
  if [[ "$CURRENT_DIR_NAME" == 'otomi-stack' ]]; then
    STACK_DIR=$PWD
    STACK_VOLUME="-v ${STACK_DIR}:${STACK_DIR}"
    DOCKER_WORKING_DIR=$STACK_DIR
    [[ -z "$ENV_DIR" ]] && echo "Error<$0>: The ENV_DIR environment variable is not set" && exit 2
  else
    ENV_DIR=$PWD
  fi
  return 0
}

[[ -z "$CMD" ]] && echo "Missing command argument" && show_usage && exit 2

validate_env
set_env_and_stack_dir
set_env_ini
set_helm_config
execute $@
