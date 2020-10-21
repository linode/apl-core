#!/usr/bin/env bash
set -e

. bin/common.sh
prepare_crypt

command=$1

function rotate() {
  cd $ENV_DIR/env >/dev/null
  find . -type f -name '*.secrets.yaml.enc' -exec bash -c "sops --input-type=yaml --output-type yaml -r {} > {}" \;
  cd - >/dev/null
}

function crypt() {
  cd $ENV_DIR/env >/dev/null
  if [ "$command" == "encrypt" ]; then
    find . -type f -name 'secrets.*.yaml' -exec helm secrets enc {} \;
  else
    find . -type f -name 'secrets.*.yaml' -exec helm secrets dec {} \;
  fi
  cd - >/dev/null
}

case $command in
encrypt | decrypt)
  printf "${COLOR_LIGHT_PURPLE}${command}ing secrets...${COLOR_NC}\n"
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
