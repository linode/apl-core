#!/usr/local/env bash
ENV_DIR=${ENV_DIR:-./env}

readonly otomiSettings="$ENV_DIR/env/settings.yaml"
readonly clustersFile="$ENV_DIR/env/clusters.yaml"
readonly helmfileOutputHide="(^\W+$|skipping|basePath=|Decrypting)"
readonly helmfileOutputHideTpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"
readonly replacePathsPattern="s@../env@${ENV_DIR}@g"

function get_k8s_version() {
  yq r $clustersFile "clouds.$CLOUD.clusters.$CLUSTER.k8sVersion"
}

function otomi_image_tag() {
  local otomiVersion=$(yq r $clustersFile "clouds.$CLOUD.clusters.$CLUSTER.otomiVersion")
  [[ -n $otomiVersion ]] && echo $otomiVersion || echo 'latest'
}

function customer_name() {
  yq r $otomiSettings "customer.name"
}

function exit_if_sops_file_missing(){
  [[ ! -f "$ENV_DIR/.sops.yaml" ]] && (echo "Error: The $ENV_DIR/.sops.yaml does not exists"; exit 1;)
  return 0
}

function hf_values(){
  [ "${VERBOSE-0}" == "0" ] && quiet='--quiet'
  helmfile ${quiet-} -e "$CLOUD-$CLUSTER" -f helmfile.tpl/helmfile-dump.yaml build | grep -Ev $helmfileOutputHide | sed -e $replacePathsPattern | \
  yq read -P - 'releases[0].values[0]'
}

function prepare_crypt() {
  [[ -z "$GCLOUD_SERVICE_KEY" ]] && echo "Error: The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

function for_each_cluster() {
  # Perform a command from function argument for each cluster
  executable=$1
  [[ -z "$executable" ]] && echo "ERROR: the positional argument is not set"
  local clustersPath="$ENV_DIR/env/clusters.yaml"
  clouds=($(yq r -j $clustersPath clouds | jq -r '.|keys[]'))

  for cloud in "${clouds[@]}"; do
    clusters=($(yq r -j $clustersPath clouds.${cloud}.clusters | jq -r '. | keys[]'))
    for cluster in "${clusters[@]}"; do
      CLOUD=$cloud CLUSTER=$cluster $executable
    done
  done
}
