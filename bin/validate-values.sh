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
  [ -n "$LABEL_OPT" ] && err "Cannot pass option $LABEL_OPT." && exit 1
  local values_path="$k8s_resources_path/values.yaml"
  hf_values >$values_path
  ajv test -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid
  return 0
}

function main() {
  validate_values "$@"
}

main "$@"
