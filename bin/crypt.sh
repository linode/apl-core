#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}
command=$1

function rotate() {
  cd $ENV_DIR/env >/dev/null
  find . -type f -name '*.secrets.yaml.enc' -exec bash -c "sops --input-type=yaml --output-type yaml -r {} > {}" \;
  cd - >/dev/null
}

function crypt() {
  cd $ENV_DIR/env >/dev/null
  if [ "$command" == "encrypt" ]; then
    find . -name '*.secrets.yaml' -exec bash -c "sops -e {} > {}.enc" \;
  else
    find . -type f -name '*.secrets.yaml.enc' -exec sh -c 'sops --input-type=yaml --output-type yaml -d $1 > ${1%.enc}' sh {} \;
  fi
  cd - >/dev/null
}

case $command in
encrypt | decrypt)
  printf "${COLOR_LIGHT_PURPLE}${command}ing secrets...${COLOR_NC}\n"
  # we only need to cat $GCLOUD_SERVICE_KEY to GOOGLE_APPLICATION_CREDENTIALS, rest should exist
  echo "$GCLOUD_SERVICE_KEY" >/tmp/gcloud-service-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud-service-key.json
  crypt
  printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
  ;;
rotate)
  printf "${COLOR_LIGHT_PURPLE}rotating secrets...${COLOR_NC}\n"
  rotate
  printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
  ;;
*)
  echo "Invalid command: $command. Should be one of: decrypt|encrypt|rotate"
  exit 1
  ;;
esac
