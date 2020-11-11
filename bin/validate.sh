#!/usr/bin/env bash

set -e
set -o pipefail

readonly values_path="/tmp/values-$CLOUD-$CLUSTER.yaml"

function cleanup {
  local exitcode=$?
  [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -f $values_path
  return $exitcode;
}

trap cleanup EXIT
. bin/common.sh

hf_values  > $values_path
ajv validate -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail > /dev/null
