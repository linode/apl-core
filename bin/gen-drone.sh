#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases
. bin/colors.sh
set -e

ENV_DIR=${ENV_DIR:-./env}
RECEIVER=$(cat $ENV_DIR/env/settings.yaml | yq r - alerts.receiver)

customer_name=$(customer_name)
echo "customer_name: $customer_name"

otomi_image_tag=$(otomi_image_tag)
if [ "$RECEIVER" = "slack" ]; then
  key="url"
else
  key="lowPrio"
fi
webhook=$(cat $ENV_DIR/env/settings.secrets.yaml | yq r - alerts.$RECEIVER.$key)

tpl=$PWD/tpl/.drone.tpl.$RECEIVER.yml
cd $ENV_DIR/env/clouds >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in */; do
    CLUSTER=$(echo $c | sed -e 's/\///g')
    printf "${COLOR_LIGHT_PURPLE}Creating clusters/$CLOUD/$CLUSTER/.drone.yml${COLOR_NC}\n"
    cat $tpl | sed -e "s/__CLOUD/${CLOUD}/g" -e "s/__CLUSTER/${CLUSTER}/g" \
      -e "s/__IMAGE_TAG/${otomi_image_tag}/g" -e "s|__WEBHOOK|${webhook}|g" \
      -e "s/__CUSTOMER/${customer_name}/g" \
      >$CLUSTER/.drone.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
