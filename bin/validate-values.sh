#!/usr/bin/env bash

set -eo pipefail

. bin/common.sh
. bin/common-modules.sh

run_crypt

readonly k8s_resources_path="/tmp/otomi/values"
readonly script_message="Values validation"

function cleanup() {
  rm -rf $k8s_resources_path
}

function setup() {
  mkdir -p $k8s_resources_path >/dev/null
}

function validate_values() {
  [ -n "$LABEL_OPT" ] && err "Cannot pass option $LABEL_OPT." && exit 1
  setup
  local values_path="$k8s_resources_path/values.yaml"
  hf_values >$values_path
  [ -n "$VERBOSE" ] && v='--verbose'
  ajv test $v -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid
  return 0
}

function main() {
  echo $script_message STARTED
  validate_values "$@"
}

main "$@"
