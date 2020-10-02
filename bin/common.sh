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
  file=$ENV_DIR/env/secrets.settings.yaml
  receiver=$(cat $file | yq r - alerts.receiver)
  if [ "$receiver" == "" ] && [ -f "$file.dec" ]; then
    receiver=$(cat $file.dec | yq r - alerts.receiver)
  fi
  if [ "$receiver" == "" ]; then
    helm secrets dec $file
    receiver=$(cat $file.dec | yq r - alerts.receiver)
  fi
  if [ "$receiver" == "" ]; then
    echo "Can't find receiver!"
    exit 1
  fi
  echo $receiver
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
