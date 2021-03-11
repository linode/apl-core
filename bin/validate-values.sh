#!/usr/bin/env bash

set -eo pipefail

. bin/common.sh
. bin/common-modules.sh

readonly k8s_resources_path="/tmp/otomi/values"
readonly script_message="Values validation"

function cleanup() {
  if [ -z "$DEBUG" ]; then
    rm -rf $k8s_resources_path
  fi
}

mkdir -p $k8s_resources_path >/dev/null

function validate_values() {
  [ -n "$LABEL_OPT" ] && err "Cannot pass option $LABEL_OPT: please specify --all|-A or --cluster|-c" && exit 1
  local values_path="$k8s_resources_path/$(cluster_env).yaml"
  hf_values >$values_path
  ajv test -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid || exitcode=1
  [ -n "$CI" ] && [ $exitcode -ne 0 ] && exit $exitcode
  return 0
}

function main() {
  process_clusters validate_values "$@"
}

main "$@"
if [ $? -gt 0 ]; then
  exit 1
fi
