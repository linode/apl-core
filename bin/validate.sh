#!/usr/bin/env bash

set -e
set -o pipefail

values_path="/tmp/values-$CLOUD-$CLUSTER.yaml"

function cleanup {
  [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -f $values_path
  return 0;
}



trap cleanup EXIT
. bin/common.sh

prepare_crypt
helmfileOutputHide="(^\W+$|skipping|basePath=|Decrypting)"
helmfileOutputHideTpl="(^[\W^-]+$|skipping|basePath=|Decrypting)"

helmfile -e $CLOUD-$CLUSTER -f helmfile.tpl/helmfile-dump.yaml build | grep -Ev $helmfileOutputHide | sed -e 's@../env@'"${ENV_DIR}"'@g' | \
  yq read -P - 'releases[0].values[0]' > $values_path
ajv validate -s './values-schema.yaml' -d $values_path
