function otomi_image_tag() {
  [[ ("$CLOUD" == "" || "$CLUSTER" == "") ]] && echo 'latest' && exit
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
  if [ "$@" != "" ]; then
    val=$(cat $file_secrets.dec | yq r - alerts.$receiver.$@)
    [ "$val" == "" ] && exit 1
    echo $val
  else
    echo $receiver
  fi
}

function prepare_crypt() {
  [ "$GCLOUD_SERVICE_KEY" == "" ] && exit 1
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}
