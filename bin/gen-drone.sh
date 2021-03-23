#!/usr/bin/env bash
set -eu
set -o pipefail

ENV_DIR=${ENV_DIR:-./env}
. $ENV_DIR/.secrets

. bin/common.sh
. bin/colors.sh

prepare_crypt
readonly values=$(hf_values)
readonly raw_receiver=$(echo "$values" | yq r - alerts.drone)
readonly receiver=${raw_receiver:-'slack'}
readonly raw_branch=$(echo "$values" | yq r - charts.otomi-api.git.branch)
readonly branch=${raw_branch:-'master'}
readonly templatePath=$PWD/tpl/.drone.tpl.$receiver.yml
readonly customer_name=$(customer_name)

if [ "$receiver" = 'slack' ]; then
  key="url"
else
  key="lowPrio"
fi

readonly webhook=$(echo "$values" | yq r - "alerts.$receiver.$key")

function template_drone_config() {
  local targetPath="$ENV_DIR/env/clouds/${CLOUD}/${CLUSTER}/.drone.yml"
  local otomi_image_tag="$(yq r $clusters_file clouds.${CLOUD}.clusters.${CLUSTER}.otomiVersion)"

  printf "${COLOR_LIGHT_PURPLE}Creating $targetPath ${COLOR_NC}\n"

  local target=$targetPath
  [ "${DRY_RUN-'false'}" = 'false' ] && target="/dev/stdout"

  cat $templatePath | sed -e "s/__CLOUD/${CLOUD}/g" -e "s/__CLUSTER/${CLUSTER}/g" \
    -e "s/__IMAGE_TAG/${otomi_image_tag}/g" -e "s|__WEBHOOK|${webhook}|g" \
    -e "s/__CUSTOMER/${customer_name}/g" -e "s/__BRANCH/${branch}/g" \
    >$target
}

for_each_cluster template_drone_config
