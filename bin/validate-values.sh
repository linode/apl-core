#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -o pipefail

. bin/common.sh

readonly tmp_path="/tmp/validate-values"
script_message="Values validation"
exitcode=0
abort=false

function cleanup() {
  [ $? -ne 0 ] && exitcode=$?
  ! $abort && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  if [ -z "$DEBUG" ]; then
    rm -rf $tmp_path
  fi
  exit $exitcode
}
trap cleanup EXIT ERR
function abort() {
  abort=true
  cleanup
}
trap abort SIGINT

mkdir -p $tmp_path >/dev/null

validate_values() {
  local values_path="$tmp_path/$CLOUD-$CLUSTER.yaml"
  hf_values >$values_path
  ajv test -s './values-schema.yaml' -d $values_path --all-errors --extend-refs=fail --valid || exitcode=1
}
if [ -n "$1" ]; then
  validate_values
else
  for_each_cluster validate_values
fi
