#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases
. bin/colors.sh
set -e
ENV_DIR=${ENV_DIR:-./env}

customer_name=$(customer_name)
receiver=$(cat $ENV_DIR/settings.yaml | yq r - alerts.receiver)
if [ "$receiver" = "slack" ]; then
  key="url"
else
  key="lowPrio"
fi
webhook=$(cat $ENV_DIR/settings.secrets.yaml | yq r - alerts.$receiver.$key)

tpl=$ENV_DIR/.drone.tpl.$receiver.yml
cd $ENV_DIR/clouds >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in */; do
    CLUSTER=$(echo $c | sed -e 's/\///g')
    eval "STACK_VERSION=\$${CLUSTER}Version"
    printf "${COLOR_LIGHT_PURPLE}Creating clusters/$CLOUD/$CLUSTER/.drone.yml${COLOR_NC}\n"
    cat $tpl | sed -e "s/__CLOUD/${CLOUD}/g" -e "s/__CLUSTER/${CLUSTER}/g" \
      -e "s/__STACK_VERSION/${STACK_VERSION}/g" -e "s|__WEBHOOK|${webhook}|g" \
      -e "s/__CUSTOMER/$customer_name/g" \
      >$CLUSTER/.drone.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
