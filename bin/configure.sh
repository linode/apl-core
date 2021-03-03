#!/usr/bin/env bash

function otomi_cfg_if_not_exists() {
  local otomi_cfg_location="$ENV_DIR/otomi.cfg"
  [ ! -f "$otomi_cfg_location/otomi.cfg" ] && touch $otomi_cfg_location
  return 0
}

main() {
  otomi_cfg_if_not_exists
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
