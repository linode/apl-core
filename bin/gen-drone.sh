#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases
. bin/colors.sh
set -e

ENV_DIR=${ENV_DIR:-./env}
RECEIVER=$(cat $ENV_DIR/settings.yaml | yq r - alerts.receiver)

customer_name=$(customer_name)
echo "customer_name: $customer_name"

otomi_version=$(otomi_version)
if [ "$RECEIVER" = "slack" ]; then
  key="url"
else
  key="lowPrio"
fi
webhook=$(cat $ENV_DIR/settings.secrets.yaml | yq r - alerts.$RECEIVER.$key)

tpl=$PWD/tpl/.drone.tpl.$RECEIVER.yml
cd $ENV_DIR/clouds >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in */; do
    CLUSTER=$(echo $c | sed -e 's/\///g')
    printf "${COLOR_LIGHT_PURPLE}Creating clusters/$CLOUD/$CLUSTER/.drone.yml${COLOR_NC}\n"
    cat $tpl | sed -e "s/__CLOUD/${CLOUD}/g" -e "s/__CLUSTER/${CLUSTER}/g" \
      -e "s/__STACK_VERSION/${otomi_version}/g" -e "s|__WEBHOOK|${webhook}|g" \
      -e "s/__CUSTOMER/${customer_name}/g" \
      >$CLUSTER/.drone.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
