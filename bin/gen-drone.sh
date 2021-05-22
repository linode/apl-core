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
readonly templatePath=$PWD/tpl/.drone.tpl.$receiver.yml
readonly customer_name=$(customer_name)

if [ "$receiver" = 'slack' ]; then
  key="url"
  channel=$(yqr alerts.$receiver.channel | echo dev-mon)
else
  key="lowPrio"
fi

readonly webhook=$(yqr alerts.$receiver.$key)

function template_drone_config() {
  local targetPath="$ENV_DIR/.drone.yml"
  local image_tag="$(otomi_image_tag)"
  local cluster="$(yqr cluster.name)"

  printf "${COLOR_LIGHT_PURPLE}Creating $targetPath ${COLOR_NC}\n"

  local target=$targetPath
  [ "${DRY_RUN-'false'}" = 'false' ] && target="/dev/stdout"

  cat $templatePath | sed \
    -e "s/__CLUSTER/${cluster}/g" \
    -e "s/__IMAGE_TAG/${image_tag}/g" \
    -e "s|__WEBHOOK|${webhook}|g" \
    -e "s/__CUSTOMER/${customer_name}/g" \
    -e "s/__BRANCH/${branch}/g" \
    -e "s/__CHANNEL/${channel}/g" \
    >$target
}

template_drone_config
