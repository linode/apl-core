#!/usr/bin/env bash

set -uo pipefail
EXIT_FAST=${EXIT_FAST:-"1"}
[[ $EXIT_FAST == "1" ]] && set -e

. bin/common.sh

readonly tmp_path="/tmp/validate-values"
mkdir -p $tmp_path >/dev/null

cleanup() {
  local exitcode=$?
  [[ "${MOUNT_TMP_DIR-0}" != "1" ]] && rm -rf $tmp_path
  return $exitcode
}
trap cleanup EXIT ERR

validate_values() {
  local values_path="$tmp_path/$CLOUD-$CLUSTER.yaml"

  hf_values >$values_path
  ajv validate -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail >/dev/null
}

for_each_cluster validate_values
