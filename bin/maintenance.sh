#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh
set -e

printf "${COLOR_LIGHT_PURPLE}Killing istio-pilot pod...${COLOR_NC}\n"
kis delete po $(kis get po -l "istio=pilot,app=pilot" -ojsonpath='{.items[0].metadata.name}')
printf "${COLOR_LIGHT_PURPLE}DONE!\nKilling ingress-azure pod...${COLOR_NC}\n"
ki delete po $(ki get po -l "app=ingress-azure" -ojsonpath='{.items[0].metadata.name}')
# printf "${COLOR_LIGHT_PURPLE}DONE!\nKilling loki pod. This may take some time...${COLOR_NC}\n"
# km delete po $(km get po -l "app=loki" -ojsonpath='{.items[0].metadata.name}')
