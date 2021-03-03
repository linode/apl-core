#!/usr/bin/env bash

. bin/common.sh
. bin/common-modules.sh

#####
# ini parsing might be nice with more vars: https://stackoverflow.com/a/37027274
#####
function main() {
  parse_args "$@"
  [ -n "$CLUSTER_OPT" ] && echo "export CLUSTER=$CLUSTER_OPT" >$ENV_DIR/otomi.cfg
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
