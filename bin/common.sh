function otomi_image_tag() {
  [ "$ENV_DIR" == "" ] && echo 'latest' && exit
  local version
  local clusters_file="$ENV_DIR/env/clusters.yaml"
  if [ -f $clusters_file ] && [ "$CLOUD" != "" ] && [ "$CLUSTER" != "" ]; then
    semver=$(cat $clusters_file | yq r - clouds.$CLOUD.clusters.$CLUSTER.otomiVersion)
    tag="v$semver"
  else
    tag='latest'
  fi
  echo $tag
}

function customer_name() {
  [ "$ENV_DIR" == "" ] && exit 1
  cat $ENV_DIR/env/settings.yaml | yq r - customer.name
}

function get_receiver() {
  [ "$ENV_DIR" == "" ] && exit 1
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
  if [ "$@" != "" ]; then
    val=$(cat $file_secrets.dec | yq r - alerts.$receiver.$@)
    [ "$val" == "" ] && exit 1
    echo $val
  else
    echo $receiver
  fi
}

function prepare_crypt() {
  [ "$ENV_DIR" == "" ] || [ "$GCLOUD_SERVICE_KEY" == "" ] && exit 1
  GOOGLE_APPLICATION_CREDENTIALS="$ENV_DIR/gcp-key.json"
  if [ "$IN_DOCKER" != "" ] || [ "$CI" != "" ]; then
    GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
    echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  fi
  export GOOGLE_APPLICATION_CREDENTIALS
}
