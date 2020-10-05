function otomi_image_tag() {
  [[ ("$CLOUD" == "" || "$CLUSTER" == "") ]] && echo 'latest' && exit
  local version
  local clusters_file="$ENV_DIR/env/clusters.yaml"
  if [ -f $clusters_file ] && [ "$CLOUD" != "" ] && [ "$CLUSTER" != "" ]; then
    semver=$(cat $clusters_file | yq r - clouds.$CLOUD.clusters.$CLUSTER.otomiVersion)
    tag="$semver"
  else
    tag='latest'
  fi
  echo $tag
}

function customer_name() {
  cat $ENV_DIR/env/settings.yaml | yq r - customer.name
}

function get_receiver() {
  prepare_crypt
  file=$ENV_DIR/env/settings.yaml
  file_secrets=$ENV_DIR/env/secrets.settings.yaml
  if [ ! -f "$file_secrets.dec" ]; then
    set +e
    helm secrets dec $file_secrets >/dev/null
    set -e
  fi
  receiver=$(cat $file | yq r - alerts.receiver)
  [ "$receiver" == "" ] && receiver=$(cat $file_secrets.dec | yq r - alerts.receiver)
  [ "$receiver" == "" ] && exit 1
  if [ "$1" != "" ]; then
    val=$(cat $file_secrets.dec | yq r - alerts.$receiver.$@)
    [ "$val" == "" ] && exit 1
    echo $val
  else
    echo $receiver
  fi
}

function prepare_crypt() {
  [[ -z "$GCLOUD_SERVICE_KEY" ]] && echo "Error: The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

function for_each_cluster {
  executable=$1
  [[ -z "$executable" ]] && echo "ERROR: the positional argument is not set"
  local clustersPath="$ENV_DIR/env/clusters.yaml"
  clouds=($(yq r -j $clustersPath clouds | jq -r '.|keys[]'))

  for cloud in ${clouds[@]}; do
    clusters=($(yq r -j $clustersPath clouds.${cloud}.clusters | jq -r '.|keys[]'))
    for cluster in ${clusters[@]}; do
    CLOUD=$cloud; CLUSTER=$cluster; $executable
    done
  done
}