#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh
set -e

if [ "$CLOUD" = "azure" ]; then
  printf "${COLOR_LIGHT_PURPLE}DONE!\nKilling ingress-azure pod...${COLOR_NC}\n"
  ki delete po $(ki get po -l "app=ingress-azure" -ojsonpath='{.items[0].metadata.name}')
fi
