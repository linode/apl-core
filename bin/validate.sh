#!/usr/bin/env bash

set -e
set -o pipefail

values_path="/tmp/values-$CLOUD-$CLUSTER.yaml"

function cleanup {
  local exitcode=$?
  [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -f $values_path
  return $exitcode;
}

trap cleanup EXIT
. bin/common.sh

[ "$VERBOSE" == "0" ] && quiet='--quiet'
prepare_crypt
helmfileOutputHide="(^\W+$|skipping|basePath=|Decrypting)"
helmfileOutputHideTpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"

helmfile $quiet -e $CLOUD-$CLUSTER -f helmfile.tpl/helmfile-dump.yaml build | grep -Ev $helmfileOutputHide | sed -e 's@../env@'"${ENV_DIR}"'@g' | \
  yq read -P - 'releases[0].values[0]' > $values_path
ajv validate -s './values-schema.yaml' -d $values_path
