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
  local targetPath="$ENV_DIR/env/.drone.yml"
  local image_tag="$(otomi_image_tag)"
  local cluster="$(yq r $clusters_file cluster.name)"

  printf "${COLOR_LIGHT_PURPLE}Creating $targetPath ${COLOR_NC}\n"

  local target=$targetPath
  [ "${DRY_RUN-'false'}" = 'false' ] && target="/dev/stdout"

  cat $templatePath | sed \
    -e "s/__CLUSTER/${cluster}/g" \
    -e "s/__IMAGE_TAG/${image_tag}/g" \
    -e "s|__WEBHOOK|${webhook}|g" \
    -e "s/__CUSTOMER/${customer_name}/g" \
    -e "s/__BRANCH/${branch}/g" \
    >$target
}

template_drone_config
