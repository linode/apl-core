#/usr/bin/env bash
#####################################################################################
##
## NOTE:
## This is a command line tool to operate on otomi-stack
## All comands and executed in docker container
## Keep this file simple and do not depend on any external file.
## Do not use any non standard tooling. Only Docker is needed.
## If you need to use any extra binaries then most probably you want to run in inside docker container.
##
#####################################################################################
set -e
CMD=$1

ENV_DIR=$PWD
OTOMI_IMAGE=''
K8S_CONTEXT=''
KUBE_CONTEXT_REFRESH=0
STACK_DIR=${STACK_DIR:-'/home/app/stack'}
DOCKER_WORKING_DIR=$STACK_DIR
DOCKER_TTY_PARAMS=''
VERBOSE=0



function show_usage {
  echo "The $0 usage:
    aws - run command on Amazon Web Services CLI
    az - run command on Azure CLI
    bash - run interactive bash
    deploy - execute otomi-stack deploy script
    decrypt - decrypt values to env/*.dec files
    encrypt - encrypt values encrypt all env/*.dec files
    gcloud - run command on Google Cloud CLI
    helm - run helm
    helmfile - run helmfile
    helmfile-values - show merged values 
    helmfile-template - run helmfile template
    help - print this help
    hfd - run helmfile with selected environment
    hft - run helmfile template with selected environment in silent mode
    install-git-hooks - set pre-commit and post-merge git hooks
    install-drone-pipelines - create drone configuration file at env/<CLOUD>/.drone.<CLUSTER>.yml file
  "

}
function set_k8s_context {
  local ENV_FILE="${ENV_DIR}/env/${CLOUD}/${CLUSTER}.sh"
  source $ENV_FILE
  [[ -z "$K8S_CONTEXT" ]] && echo "The K8S_CONTEXT env is not defined in $ENV_FILE" && exit 1
  kubectl config use-context $K8S_CONTEXT > /dev/null
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

  docker run $DOCKER_TTY_PARAMS --rm \
    -v /tmp:/tmp \
    -v ${HOME}/.kube/config:/home/app/.kube/config \
    -v ${HELM_CONFIG}:/home/app/.config/helm \
    -v ${HOME}/.config/gcloud:/home/app/.config/gcloud \
    -v ${HOME}/.aws:/home/app/.aws \
    -v ${HOME}/.azure:/home/app/.azure \
    -v ${ENV_DIR}:${STACK_DIR}/env \
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
    helmfile-values)
      drun helmfile -f helmfile.tpl/helmfile-dump.yaml build
      break
      ;;
    helmfile-template)
      drun helmfile -e ${CLOUD}-$CLUSTER --quiet "${@:2}" template --skip-deps 
      break
      ;;
    hfd)
      drun helmfile -e ${CLOUD}-$CLUSTER "${@:2}" --skip-deps
      break
      ;;
    hft)
      drun helmfile -e ${CLOUD}-$CLUSTER --quiet "${@:2}" template --skip-deps | grep --color=auto --exclude-dir=.cvs --exclude-dir=.git --exclude-dir=.hg --exclude-dir=.svn -vi skipping | grep --color=auto --exclude-dir=.cvs --exclude-dir=.git --exclude-dir=.hg --exclude-dir=.svn -vi "helmfile-"
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
    install-git-hooks)
      drun bin/install-git-hooks.sh
      break
      ;;
    install-drone-pipelines)
      drun bin/gen-drone.sh
      break
      ;;
    bash)
      DOCKER_TTY_PARAMS='-it'
      drun $@
      break
      ;;
    help)
      show_usage
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

[[ -z "$CMD" ]] && echo "Missing command argument" && show_usage && exit 2

validate_env
set_otomi_image
set_k8s_context
verbose_env
execute $@
