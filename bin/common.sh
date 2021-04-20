#!/usr/bin/env bash
[ -n "${TRACE:-}" ] && set -x
set -e

# Environment vars
ENV_DIR=${ENV_DIR:-./env}

# Common vars
readonly otomi_settings="$ENV_DIR/env/settings.yaml"
readonly otomi_tools_image="otomi/tools:latest"

# Mutliple files vars
readonly clusters_file="$ENV_DIR/env/cluster.yaml"
readonly helmfile_output_hide="(^\W+$|skipping|basePath=|Decrypting)"
readonly helmfile_output_hide_tpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"
readonly replace_paths_pattern="s@../env@${ENV_DIR}@g"

has_docker='false'
if docker --version &>/dev/null; then
  has_docker='true'
fi

#####
# https://github.com/google/styleguide/blob/gh-pages/shellguide.md#stdout-vs-stderr
#####
function err() {
  echo "[$(date +'%Y-%m-%dT %T.%3N')] ERROR: $*" >&2
}

function _rind() {
  local cmd="$1"
  shift
  if [ $has_docker = 'true' ] && [ -z "${IN_DOCKER:-''}" ]; then
    docker run --rm \
      -v ${ENV_DIR}:${ENV_DIR} \
      -e IN_DOCKER='1' \
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

function jq() {
  _rind "${FUNCNAME[0]}" "$@"
  return $?
}

function get_k8s_version() {
  yq r $clusters_file "cluster.k8sVersion"
}

function otomi_image_tag() {
  local otomi_version=''
  [ -f $clusters_file ] && otomi_version=$(yq r $clusters_file "cluster.otomiVersion")
  [ -z "$otomi_version" ] && otomi_version='latest'
  echo $otomi_version
}

function customer_name() {
  [ -f $otomi_settings ] && yq r $otomi_settings "customer.name" && return 0
  return 1
}

function hf() {
  helmfile --quiet "$@"
}

function hf_values() {
  [ -z "$VERBOSE" ] && quiet='--quiet'
  helmfile ${quiet-} -f helmfile.tpl/helmfile-dump.yaml build |
    grep -Ev $helmfile_output_hide |
    sed -e $replace_paths_pattern |
    yq read -P - 'releases[0].values[0]'
}

function prepare_crypt() {
  [ -z "$GCLOUD_SERVICE_KEY" ] && return 0
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}
