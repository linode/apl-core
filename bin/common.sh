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
