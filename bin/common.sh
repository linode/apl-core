function otomi_image_tag() {
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
  file="$ENV_DIR/env/secrets.settings.yaml"
  RECEIVER=$(cat $file | yq r - alerts.receiver)
  [ "$RECEIVER" == "" ] && [ -f $ENV_DIR/env/secrets.settings.yaml.dec ] && RECEIVER=$(cat $file.dec | yq r - alerts.receiver)
  if [ "$RECEIVER" == "" ]; then
    helm secrets dec $file
    RECEIVER=$(cat $file.dec | yq r - alerts.receiver)
  fi
  echo $RECEIVER
}
