#!/usr/bin/env bash
ENV_DIR=${ENV_DIR:-'./env'}
. bin/colors.sh

cd $ENV_DIR/clouds >/dev/null
c=(*/)
cd - >/dev/null
clouds="${c[@]%/}"
if [[ ! $clouds == *$CLOUD* ]]; then
  printf "${COLOR_RED}ERROR: The value of CLOUD env must be one of the following: ${COLOR_YELLOW}$clouds${COLOR_NC}\n"
else
  cd $ENV_DIR/clouds/$CLOUD >/dev/null
  c=(*/)
  cd - >/dev/null
  clusters="${c[@]%/}"
  if [[ ! $clusters == *$CLUSTER* ]]; then
    printf "${COLOR_RED}ERROR: The value of CLUSTER env must be one of the following: ${COLOR_YELLOW}$clusters${COLOR_NC}\n"
  fi
fi
# source dependent env vars
. $ENV_DIR/clouds/$CLOUD/$CLUSTER/.env
