#!/usr/bin/env bash

[ -n "$CI" ] && set -e
set -o pipefail

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
  local values_path="$k8s_resources_path/$CLOUD-$CLUSTER.yaml"
  hf_values >$values_path
  ajv test -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid || exitcode=1
  [ -n "$CI" ] && [ $exitcode -ne 0 ] && exit $exitcode
  return 0
}

function main() {
  validate_resources validate_values "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
