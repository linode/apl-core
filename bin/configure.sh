#!/usr/bin/env bash

main() {
  [ ! -f "$ENV_DIR/otomi.cfg" ] && echo "NO"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
