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

# some exit handling for scripts to clean up
exitcode=0
script_message=''
function exit_handler() {
  local x=$?
  [ $x -ne 0 ] && exitcode=$x
  [ "$script_message" != '' ] && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  cleanup
  trap "exit $exitcode" EXIT ERR
  exit $exitcode
}
trap exit_handler EXIT ERR
function cleanup() {
  return 0
}
function abort() {
  cleanup
  trap 'exit 0' EXIT
  exit 0
}
trap abort SIGINT

<<'###'
https://github.com/google/styleguide/blob/gh-pages/shellguide.md#stdout-vs-stderr
###
function err() {
  echo "[$(date +'%Y-%m-%dT %T.%3N')] ERROR: $*" >&2
}

function _rind() {
  local cmd="$1"
  shift
  if [[ $has_docker = 'true' && ${IN_DOCKER+0} -eq 0 ]]; then
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

<<'###'
https://github.com/google/styleguide/blob/gh-pages/shellguide.md#quoting                                                               
###
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

function cluster_env() {
  printf "$CLOUD-$CLUSTER"
}

function hf() {
  helmfile --quiet -e $CLOUD-$CLUSTER "$@"
}

function hf_values() {
  [ -z "$VERBOSE" ] && quiet='--quiet'
  helmfile ${quiet-} -e "$CLOUD-$CLUSTER" -f helmfile.tpl/helmfile-dump.yaml build |
    grep -Ev $helmfile_output_hide |
    sed -e $replace_paths_pattern |
    yq read -P - 'releases[0].values[0]'
}

function prepare_crypt() {
  [[ ! $GCLOUD_SERVICE_KEY ]] && err "The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

function for_each_cluster() {
  executable=$1
  [[ ! "$executable" ]] && err "The positional argument is not set"
  local clustersPath="$ENV_DIR/env/clusters.yaml"
  clouds=$(yq r -j $clustersPath clouds | jq -rc '.|keys[]')
  for cloud in $clouds; do
    clusters=($(yq r -j $clustersPath clouds.$cloud.clusters | jq -rc '. | keys[]'))
    for cluster in "${clusters[@]}"; do
      CLOUD=$cloud CLUSTER=$cluster $executable
    done
  done
}

function hf_templates_init() {
  local out_dir="$1"
  shift
  [[ $all ]] && hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$out_dir" >/dev/null 2>&1
  hf $(echo ${label:+"-l $label"} | xargs) template --skip-deps --output-dir="$out_dir" >/dev/null 2>&1
}

<<'###'
Use OPTIONS/LONGOPTS(LONGOPTIONS) to set additional parameters.                       
Returns:                                                                              
    all -> if passed, sets to 'y' and can be used globally in conditional statements  
    label -> if passed (e.g. label init=true), sets to label (e.g. 'init=true') and   
             can be used globally in conditional statements                           
    configure ->                                                                      
Resources:                                    
- https://github.com/google/styleguide/blob/gh-pages/shellguide.md#s4.2-function-comments                                        
- https://stackoverflow.com/a/29754866                                                
###
function parse_args() {
  if [[ "$*" != "" ]]; then
    ! getopt --test >/dev/null
    if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
      echo '`getopt --test` failed in this environment.'
      exit 1
    fi

    OPTIONS=Al:
    LONGOPTS=all,label:

    # - regarding ! and PIPESTATUS see above
    # - temporarily store output to be able to check for errors
    # - activate quoting/enhanced mode (e.g. by writing out “--options”)
    # - pass arguments only via   -- "$@"   to separate them correctly
    ! PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
      exit 2
    fi
    eval set -- "$PARSED"
    while true; do
      case "$1" in
        -l | --label)
          label=$2
          shift 2
          ;;
        -A | --all)
          all=y
          shift
          ;;
        --)
          shift
          break
          ;;
        *)
          echo "Programming error: expected '--' but got $1"
          exit 3
          ;;
      esac
    done
  else
    echo "Error: --all or --label not specified"
    exit 5
  fi
}
