#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -uo pipefail

. bin/common.sh

readonly tmp_path="/tmp/validate-values"
mkdir -p $tmp_path >/dev/null

cleanup() {
  local exitcode=$?
  [ $exitcode -eq 0 ] && echo "Values validation SUCCESS" || echo "Values validation FAILED"
  rm -rf $tmp_path
  return $exitcode
}
trap cleanup EXIT ERR

validate_values() {
  local values_path="$tmp_path/$CLOUD-$CLUSTER.yaml"
  hf_values >$values_path
  ajv test -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid
}

for_each_cluster validate_values
