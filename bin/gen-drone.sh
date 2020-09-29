#!/usr/bin/env bash
. bin/common.sh
. bin/colors.sh
set -e
set -o pipefail

ENV_DIR=${ENV_DIR:-./env}

helm secrets dec $ENV_DIR/env/secrets.settings.yaml

RECEIVER=$(cat $ENV_DIR/env/settings.yaml | yq r - alerts.receiver)
[ "$RECEIVER" == "" ] && RECEIVER=$(cat $ENV_DIR/env/secrets.settings.yaml.dec | yq r - alerts.receiver)

customer_name=$(customer_name)
echo "customer_name: $customer_name"
clustersPath="$ENV_DIR/env/clusters.yaml"
tpl=$PWD/tpl/.drone.tpl.$RECEIVER.yml
otomi_image_tag=$(otomi_image_tag)

if [ "$RECEIVER" = "slack" ]; then
  key="url"
else
  key="lowPrio"
fi

# Note: the .secrets.yaml exists only if .secrets.yaml.enc has been decrypted
webhook=$(cat $ENV_DIR/env/secrets.settings.yaml.dec | yq r - alerts.$RECEIVER.$key)
[ "$webhook" == "" ] && webhook=$(cat $ENV_DIR/env/settings.yaml | yq r - alerts.$RECEIVER.$key)
clouds=($(yq r -j $clustersPath clouds | jq -r '.|keys[]'))

function template_drone_config() {

  local targetPath=$1
  local templatePath=$2
  local cloud=$3
  local cluster=$4
  local otomi_image_tag=$5
  printf "${COLOR_LIGHT_PURPLE}Creating $targetPath ${COLOR_NC}\n"
  cat $templatePath | sed -e "s/__CLOUD/${cloud}/g" -e "s/__CLUSTER/${cluster}/g" \
    -e "s/__IMAGE_TAG/${otomi_image_tag}/g" -e "s|__WEBHOOK|${webhook}|g" \
    -e "s/__CUSTOMER/${customer_name}/g" \
    >$targetPath
}

for cloud in ${clouds[@]}; do
  clusters=($(yq r -j $clustersPath clouds.${cloud}.clusters | jq -r '.|keys[]'))
  for cluster in ${clusters[@]}; do
    targetPath="$ENV_DIR/env/clouds/${cloud}/${cluster}/.drone.yml"
    otomiVersion="v$(yq r $clustersPath clouds.${cloud}.clusters.${cluster}.otomiVersion)"
    template_drone_config $targetPath $tpl $cloud $cluster $otomiVersion
  done
done
