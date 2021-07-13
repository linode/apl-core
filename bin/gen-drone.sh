#!/usr/bin/env bash

. bin/common.sh
. bin/colors.sh

readonly enabled=$(yqr charts.drone.enabled || echo false)
[ "$enabled" != 'true' ] && exit

crypt

readonly template_path=$PWD/tpl/.drone.yml.gotmpl
readonly target_path=$ENV_DIR/.drone.yml
readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')
readonly cluster="$(yqr cluster.name)"
readonly customer=$(customer_name)
readonly global_pull_secret=$(yqr otomi.globalPullSecret)
readonly image_tag="$(otomi_image_tag)"
readonly provider=$(yqr alerts.drone)

pull_policy="always"
[ "${image_tag:0:1}" = "v" ] && pull_policy='if-not-exists'
target=$target_path
[ -n "$DRY_RUN" ] && target="/dev/stdout"

if [ "$provider" != '' ]; then
  if [ "$provider" = 'slack' ]; then
    key="url"
    channel=$(yqr alerts.$provider.channel | echo dev-mon)
  else
    key="lowPrio"
  fi
  readonly webhook=$(yqr alerts.$provider.$key)
fi

printf "${COLOR_LIGHT_PURPLE}Creating $target_path ${COLOR_NC}\n"

cat $template_path | gucci \
  -s imageTag="$image_tag" \
  -s branch="$branch" \
  -s cluster="$cluster" \
  -s channel="$channel" \
  -s customer="$customer" \
  -s globalPullSecret="$global_pull_secret" \
  -s provider="$provider" \
  -s webhook="$webhook" \
  -s pullPolicy="$pull_policy" \
  >$target
