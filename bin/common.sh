function otomi_image_tag() {
  local version
  local clusters_file="$ENV_DIR/env/clusters.yaml"
  if [[ -f $clusters_file && (! -z "$CLOUD" || -z "$CLUSTER") ]]; then
    version="v$(cat $clusters_file | yq r - clouds.$CLOUD.clusters.$CLUSTER.otomiVersion)"
  else
    version='latest'
  fi
  echo $version
}

function customer_name() {
  cat $ENV_DIR/env/settings.yaml | yq r - customer.name
}
