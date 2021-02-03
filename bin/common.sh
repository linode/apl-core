#!/usr/local/env bash
ENV_DIR=${ENV_DIR:-./env}

# Common vars
readonly otomi_settings="$ENV_DIR/env/settings.yaml"
readonly otomi_tools_image="otomi/tools:latest"

# Mutliple files vars
readonly clusters_file="$ENV_DIR/env/clusters.yaml"
readonly helmfile_output_hide="(^\W+$|skipping|basePath=|Decrypting)"
readonly helmfile_output_hide_tpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"
readonly replace_paths_pattern="s@../env@${ENV_DIR}@g"

has_docker='false'
if docker --version &>/dev/null; then
  has_docker='true'
fi

#######################################
# https://github.com/google/styleguide/blob/gh-pages/shellguide.md#stdout-vs-stderr
#######################################
function err() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] ERROR: $*" >&2
}

function _rind() {
  local cmd="$1"
  shift
  if [ $has_docker = 'true' ] && [ -n "$IN_DOCKER" ]; then
    docker run --rm \
      -v ${ENV_DIR}:${ENV_DIR} \
      -e CLOUD="$CLOUD" \
      -e IN_DOCKER='1' \
      -e CLUSTER="$CLUSTER" \
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

#######################################
# https://github.com/google/styleguide/blob/gh-pages/shellguide.md#quoting
#######################################
function yq() {
  _rind "${FUNCNAME[0]}" "$@"
  return $?
}

function jq() {
  _rind "${FUNCNAME[0]}" "$@"
  return $?
}

function get_k8s_version() {
  yq r $clusters_file "clouds.$CLOUD.clusters.$CLUSTER.k8sVersion"
}

function otomi_image_tag() {
  local otomiVersion=$([ -n "${CLOUD+x}${CLUSTER+x}" ] && yq r $clusters_file "clouds.$CLOUD.clusters.$CLUSTER.otomiVersion")
  [ -n "$otomiVersion" ] && echo $otomiVersion || echo 'latest'
}

function customer_name() {
  yq r $otomi_settings "customer.name"
}

function check_sops_file() {
  [[ ! -f "$ENV_DIR/.sops.yaml" ]] && (
    err "The $ENV_DIR/.sops.yaml does not exists"
    exit 1
  )
  return 0
}

function hf() {
  helmfile --quiet -e $CLOUD-$CLUSTER "$@"
}

function hf_values() {
  [ "${VERBOSE-'false'}" = 'false' ] && quiet='--quiet'
  helmfile ${quiet-} -e "$CLOUD-$CLUSTER" -f helmfile.tpl/helmfile-dump.yaml build |
    grep -Ev $helmfile_output_hide |
    sed -e $replace_paths_pattern |
    yq read -P - 'releases[0].values[0]'
}

function prepare_crypt() {
  [ -z "$GCLOUD_SERVICE_KEY" ] && err "The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

function for_each_cluster() {
  # Perform a command from argument for each cluster
  executable=$1
  [[ -z "$executable" ]] && err "The positional argument is not set"
  local clustersPath="$ENV_DIR/env/clusters.yaml"
  clouds=$(yq r -j $clustersPath clouds | jq -rc '.|keys[]')
  for cloud in $clouds; do
    clusters=($(yq r -j $clustersPath clouds.$cloud.clusters | jq -rc '. | keys[]'))
    for cluster in "${clusters[@]}"; do
      CLOUD=$cloud CLUSTER=$cluster $executable
    done
  done
}
