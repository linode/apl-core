#!/usr/bin/env bash
set -e
. bin/colors.sh
. bin/aliases
shopt -s expand_aliases

# Environment vars
ENV_DIR=${ENV_DIR:-./env}
LOG_LEVEL='--log-level warn'

# Common vars
readonly otomi_settings="$ENV_DIR/env/settings.yaml"
readonly otomi_tools_image="otomi/tools:latest"

# Mutliple files vars
readonly clusters_file="$ENV_DIR/env/cluster.yaml"
readonly helmfile_output_hide="(^\W+$|skipping|basePath=)"
readonly replace_paths_pattern="s@../env@${ENV_DIR}@g"

has_docker='false'
if docker --version &>/dev/null; then
  has_docker='true'
  [ -n "$VERBOSE" ] && echo "has_docker: $has_docker"
fi

function err() {
  echo "[$(date +'%Y-%m-%dT %T.%3N')] ERROR: $*" >&2
  return 0
}

#####
# Use OPTIONS/LONGOPTS(LONGOPTIONS) to set additional parameters.
# Resources:
# - https://github.com/google/styleguide/blob/gh-pages/shellguide.md#s4.2-function-comments
# - https://stackoverflow.com/a/29754866
#####
# skip parsing args for some commands
caller=${1#./}
if [ "$caller" == 'bin/otomi' ] || [[ ! "x bash bats" == *"$1"* ]]; then
  ! getopt --test >/dev/null
  if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
    err '`getopt --test` failed in this environment.'
    exit 1
  fi

  OPTIONS=dtvsp:f:l:
  LONGOPTS=debug,trace,verbose,skip-cleanup,profile:,file:,label:
  ! PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
  if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    exit 1
  fi
  eval set -- "$PARSED"
  while true; do
    case "$1" in
      -d | --debug)
        DEBUG=1
        LOG_LEVEL='--log-level debug'
        shift 1
        ;;
      -t | --trace)
        TRACE=1
        PS4='[\D{%F %T}] $BASH_SOURCE:$LINENO:'
        set -x
        shift 1
        ;;
      -v | --verbose)
        VERBOSE=1
        shift 1
        ;;
      -s | --skip-cleanup)
        SKIP_CLEANUP='--skip-cleanup'
        shift 1
        ;;
      -p | --profile)
        PROFILE=$2
        shift 2
        ;;
      -f | --file)
        FILE_OPT="$FILE_OPT -f $2"
        shift 2
        ;;
      -l | --label)
        LABEL_OPT="$LABEL_OPT -l $2"
        shift 2
        ;;
      --)
        shift
        break
        ;;
      *)
        err "Programming error: expected '--' but got $1"
        exit 1
        ;;
    esac
  done
fi

function _rind() {
  local cmd="$1"
  shift
  if [ $has_docker = 'true' ] && [ -z "$IN_DOCKER" ]; then
    docker run --rm \
      -v ${ENV_DIR}:${ENV_DIR} \
      -e IN_DOCKER='1' \
      -w ${ENV_DIR} \
      $otomi_tools_image $cmd "$@"
    return $?
  elif command -v $cmd &>/dev/null; then
    command $cmd "$@"
    return $?
  else
    err "Docker is not available and $cmd is not installed locally"
    exit 1
  fi
}

#####
# https://github.com/google/styleguide/blob/gh-pages/shellguide.md#quoting
#####
function yq() {
  _rind "${FUNCNAME[0]}" "$@"
  return $?
}

all_values=
function yqr() {
  if [ -n "$OTOMI_VALUES_INPUT" ]; then
    # we are in the chart installer and will read from the given file
    [ -z "$all_values" ] && all_values=$(cat $OTOMI_VALUES_INPUT)
  else
    [ -z "$all_values" ] && all_values=$(hf_values)
  fi
  local ret=$(echo "$all_values" | yq r - "$@")
  [ -z "$ret" ] && return 1
  echo $ret
}

function jq() {
  _rind "${FUNCNAME[0]}" "$@"
  return $?
}

function get_k8s_version() {
  yqr "cluster.k8sVersion"
}

function otomi_image_tag() {
  local otomi_version=''
  [ -f $clusters_file ] && otomi_version=$(yq r $clusters_file otomi.version)
  [ -z "$otomi_version" ] && otomi_version='master'
  echo $otomi_version
}

function customer_name() {
  [ -f $otomi_settings ] && yq r $otomi_settings "customer.name" && return 0
  [ -n "$CI" ] && return 0
  return 1
}

function rotate() {
  cd $ENV_DIR/env >/dev/null
  find . -type f -name 'secrets.*.yaml' -exec bash -c "sops --input-type=yaml --output-type yaml -r {} > {}" \;
  cd - >/dev/null
}

function pushd() {
  command pushd "$@" >/dev/null
}

function popd() {
  command popd "$@" >/dev/null
}

function crypt() {
  if [ ! -f "$ENV_DIR/.sops.yaml" ]; then
    [ -n "$VERBOSE" ] && echo "No .sops.yaml found so skipping decryption"
    return 0
  fi
  pushd $ENV_DIR/env
  command=${1:-'dec'}
  shift
  files="$*"
  local out='/dev/stdout'
  [ -z "$VERBOSE" ] && out='/dev/null'
  if [ -n "$files" ]; then
    for f in $files; do
      echo "${command}rypting $f" >$out
      drun "helm secrets $command ./env/$f" >$out
    done
  else
    if [ "$command" = 'enc' ]; then
      find . -type f -name 'secrets.*.yaml' -exec helm secrets enc {} \; >$out
    else
      find . -type f -name 'secrets.*.yaml' -exec helm secrets dec {} \; >$out
    fi
  fi
  popd
}

function run_crypt() {
  if [ -n "$GCLOUD_SERVICE_KEY" ]; then
    GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
    echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
    export GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS
  fi
  action=${1:-decrypt}
  crypt $action
  unset GOOGLE_APPLICATION_CREDENTIALS
}

function hf() {
  [ -n "$KUBE_VERSION_OVERRIDE" ] && args="--set kubeVersionOverride=${KUBE_VERSION_OVERRIDE}"
  helmfile $FILE_OPT $LABEL_OPT $LOG_LEVEL "$@" $args
}

function hf_values() {
  hf -f helmfile.tpl/helmfile-dump.yaml build |
    grep -Ev $helmfile_output_hide |
    sed -e $replace_paths_pattern |
    yq read -P - 'renderedvalues'
}

function hf_template() {
  QUIET=1
  if [ -n "$1" ]; then
    local out_dir="$1"
    [ -z "$FILE_OPT" ] && [ -z "$LABEL_OPT" ] && hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$out_dir" $SKIP_CLEANUP >/dev/null
    hf template --skip-deps --output-dir="$out_dir" $SKIP_CLEANUP >/dev/null
  else
    [ -z "$FILE_OPT" ] && [ -z "$LABEL_OPT" ] && hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps $SKIP_CLEANUP
    hf template --skip-deps $SKIP_CLEANUP
  fi
}
