#!/usr/local/env bash
ENV_DIR=${ENV_DIR:-./env}

readonly otomiSettings="$ENV_DIR/env/settings.yaml"
readonly clustersFile="$ENV_DIR/env/clusters.yaml"
readonly helmfileOutputHide="(^\W+$|skipping|basePath=|Decrypting)"
readonly helmfileOutputHideTpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"
readonly replacePathsPattern="s@../env@${ENV_DIR}@g"
readonly yqDockerImage="mikefarah/yq:3"

function dyq() {
  local yqcommand=$@
  if [ -x "$(command -v yq)" ] && [[ "$(yq --version 2>&1 | sed 's/yq version //g')" == "3."* ]] ; then
    yq ${yqcommand}
  elif [ -x "$(command -v docker)" ]; then
    docker run --rm -v ${ENV_DIR}:${ENV_DIR} ${yqDockerImage} yq ${yqcommand}
  else
    echo "ERROR: Either docker needs to be installed, or yq@3 needs to be installed." >&2
    exit 1
  fi
}

get_k8s_version() {
  dyq r $clustersFile "clouds.$CLOUD.clusters.$CLUSTER.k8sVersion"
}

otomi_image_tag() {
  local otomiVersion=$(dyq r $clustersFile "clouds.$CLOUD.clusters.$CLUSTER.otomiVersion")
  [[ -n $otomiVersion ]] && echo $otomiVersion || echo 'latest'
}

customer_name() {
  dyq r $otomiSettings "customer.name"
}

check_sops_file() {
  [[ ! -f "$ENV_DIR/.sops.yaml" ]] && (
    echo "Error: The $ENV_DIR/.sops.yaml does not exists" >&2
    exit 1
  )
  return 0
}

hf() {
  helmfile --quiet -e $CLOUD-$CLUSTER $@
}

hf_values() {
  [ "${VERBOSE-'false'}" = 'false' ] && quiet='--quiet'
  helmfile ${quiet-} -e "$CLOUD-$CLUSTER" -f helmfile.tpl/helmfile-dump.yaml build | grep -Ev $helmfileOutputHide | sed -e $replacePathsPattern |
    dyq read -P - 'releases[0].values[0]'
}

prepare_crypt() {
  [[ -z "$GCLOUD_SERVICE_KEY" ]] && echo "Error: The GCLOUD_SERVICE_KEY environment variable is not set" >&2 && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

for_each_cluster() {
  # Perform a command from argument for each cluster
  executable=$1
  [[ -z "$executable" ]] && echo "ERROR: the positional argument is not set" >&2
  local clustersPath="$ENV_DIR/env/clusters.yaml"
  clouds=$(dyq r -j $clustersPath clouds | jq -rc '.|keys[]')
  for cloud in $clouds; do
    clusters=($(dyq r -j $clustersPath clouds.${cloud}.clusters | jq -rc '. | keys[]'))
    for cluster in "${clusters[@]}"; do
      CLOUD=$cloud CLUSTER=$cluster $executable
    done
  done
}
