#!/usr/bin/env bash

# ENV_DIR=${ENV_DIR:-./env}
# . $ENV_DIR/.secrets

. bin/common.sh
. bin/colors.sh

run_crypt
readonly raw_receiver=$(yqr alerts.drone)
readonly receiver=${raw_receiver:-'slack'}
readonly raw_branch=$(yqr charts.otomi-api.git.branch)
readonly branch=${raw_branch:-'main'}
readonly template_path=$PWD/tpl/.drone.tpl.$receiver.yml
readonly customer_name=$(customer_name)

if [ "$receiver" = 'slack' ]; then
  key="url"
  channel=$(yqr alerts.$receiver.channel | echo dev-mon)
else
  key="lowPrio"
fi

readonly webhook=$(yqr alerts.$receiver.$key)

function template_drone_config() {
  local target_path="$ENV_DIR/.drone.yml"
  local image_tag="$(otomi_image_tag)"
  local cluster="$(yqr cluster.name)"
  local pullPolicy="always"
  [ "${image_tag:0:1}" = "v" ] && pullPolicy='if-not-exists'

  printf "${COLOR_LIGHT_PURPLE}Creating $target_path ${COLOR_NC}\n"

  local target=$target_path
  [ "${DRY_RUN-'false'}" = 'false' ] && target="/dev/stdout"

  cat $template_path | sed \
    -e "s/__CLUSTER/$cluster/g" \
    -e "s/__IMAGE_TAG/$image_tag/g" \
    -e "s|__WEBHOOK|$webhook|g" \
    -e "s/__CUSTOMER/$customer_name/g" \
    -e "s/__BRANCH/$branch/g" \
    -e "s/__CHANNEL/$channel/g" \
    -e "s/__PULL_POLICY/$pullPolicy/g" \
    >$target
}

template_drone_config
