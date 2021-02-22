#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -o pipefail

. bin/common.sh

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
  [ "$CI" = 'true' ] && [ $exitcode -ne 0 ] && exit $exitcode
  return 0
}

if [ -n "$1" ]; then
  validate_values
else
  for_each_cluster validate_values
fi
