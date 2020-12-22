#!/usr/local/env bash
ENV_DIR=${ENV_DIR:-./env}

readonly otomi_settings="$ENV_DIR/env/settings.yaml"
readonly clusters_file="$ENV_DIR/env/clusters.yaml"
readonly helmfile_output_hide="(^\W+$|skipping|basePath=|Decrypting)"
readonly helmfile_output_hide_tpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"
readonly replace_paths_pattern="s@../env@${ENV_DIR}@g"

get_k8s_version() {
  yq r $clusters_file "clouds.$CLOUD.clusters.$CLUSTER.k8sVersion"
}

otomi_image_tag() {
  local otomi_version=$(yq r $clusters_file "clouds.$CLOUD.clusters.$CLUSTER.otomi_version")
  [[ -n $otomi_version ]] && echo $otomi_version || echo 'latest'
}

customer_name() {
  yq r $otomi_settings "customer.name"
}

check_sops_file() {
  [[ ! -f "$ENV_DIR/.sops.yaml" ]] && (
    echo "Error: The $ENV_DIR/.sops.yaml does not exists"
    exit 1
  )
  return 0
}

cluster_env() {
  printf "${CLOUD}-${CLUSTER}"
}

hf() {
  helmfile --quiet -e "$(cluster_env)" $@
}

hf_values() {
  [ "${VERBOSE-}" = '' ] && quiet='--quiet'
  helmfile ${quiet-} -e "$CLOUD-$CLUSTER" -f helmfile.tpl/helmfile-dump.yaml build | grep -Ev $helmfile_output_hide | sed -e $replace_paths_pattern |
    yq read -P - 'releases[0].values[0]'
}

prepare_crypt() {
  [ "${GCLOUD_SERVICE_KEY}" = "" ] && echo "Error: The GCLOUD_SERVICE_KEY environment variable is not set" && exit 2
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}

for_each_cluster() {
  # Perform a command from argument for each cluster
  local executable=$1
  [[ -z "$executable" ]] && echo "ERROR: the positional argument is not set"
  local clusters_path="$ENV_DIR/env/clusters.yaml"
  local clouds=$(yq r -j $clusters_path clouds | jq -rc '.|keys[]')
  for cloud in $clouds; do
    mapfile -t clusters < <(yq r -j $clusters_path clouds.${cloud}.clusters | jq -rc '. | keys[]')
    for cluster in "${clusters[@]}"; do
      CLOUD=$cloud CLUSTER=$cluster $executable
    done
  done
}

hf_templates() {
  hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$1" >/dev/null
  hf template --skip-deps --output-dir="$1" >/dev/null
}
