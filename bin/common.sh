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
  set -x
  file=$ENV_DIR/env/secrets.settings.yaml
  receiver=$(cat $file | yq r - alerts.receiver)
  if [ "$receiver" == "" ] && [ -f "$file.dec" ]; then
    receiver=$(cat $file.dec | yq r - alerts.receiver)
  fi
  if [ "$receiver" == "" ]; then
    pwd
    ls -als $file
    helm secrets dec $file
    receiver=$(cat $file.dec | yq r - alerts.receiver)
  fi
  if [ "$receiver" == "" ]; then
    echo "Can't find receiver!"
    exit 1
  fi
  echo $receiver
}
