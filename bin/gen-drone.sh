#!/usr/bin/env bash
. bin/colors.sh
set -e
ENV_DIR=${ENV_DIR:-./env}

tpl="$PWD/tpl/.drone.tpl.yaml"
source ${ENV_DIR}/env.ini
cd ${ENV_DIR}/env >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in *.sh; do
    CLUSTER=$(echo $c | sed -e 's/\.sh//g')
    eval "STACK_VERSION=\$${CLUSTER}Version"
    printf "${COLOR_LIGHT_PURPLE}Creating $CLOUD/.drone.$CLUSTER.yml${COLOR_NC}\n"
    cat $tpl | sed -e "s/__CLOUD/${CLOUD}/g" -e "s/__CLUSTER/${CLUSTER}/g" \
      -e "s/__STACK_VERSION/${STACK_VERSION}/g" -e "s|__WEBHOOK_ID|${webhookID}|g" \
      -e "s/__CUSTOMER/${customer}/g" \
      >.drone.${CLUSTER}.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
