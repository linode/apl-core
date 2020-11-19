#!/usr/bin/env bash

set -uo pipefail

EXIT_FAST=${EXIT_FAST:-"true"}
[[ $EXIT_FAST == "true" ]] && set -e

k8sResourcesPath="/tmp/otomi/conftest-fixtures"
policiesPath="policies"
constraintsFile=$(mktemp -u)
parametersFile=$(mktemp -u)

. bin/common.sh

cleanup() {
  exitcode=$?
  [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
  [[ "${MOUNT_TMP_DIR-0}" != "1" ]] && rm -rf $k8sResourcesPath
  rm -f $constraintsFile $parametersFile
  exit $exitcode
}
trap cleanup EXIT

run_setup() {
  rm -rf $k8sResourcesPath $constraintsFile $parametersFile && mkdir -p $k8sResourcesPath
}

validate_policies() {
  local hf="helmfile -e $CLOUD-$CLUSTER"

  run_setup
  # generate_manifests
  echo "Generating manifests for ${CLOUD}-${CLUSTER} cluster."
  $hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null
  $hf -f helmfile.tpl/helmfile-init.yaml --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

  # generate parameter constraints file from values
  local parseConstraintsExpression='.constraints as $constraints | $constraints | keys[] | {(.): $constraints[.]}'
  policies=$(hf_values | yq r -j - 'charts.gatekeeper' | jq --raw-output -S -c "$parseConstraintsExpression")
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraintsFile
  done
  yq r -j $constraintsFile | jq '{parameters: .}' | yq r -P - >$parametersFile

  # validate_resources
  echo "Validating manifests against cluster policies for ${CLOUD}-${CLUSTER} cluster."
  conftest test --fail-on-warn --all-namespaces -d "$parametersFile" -p $policiesPath $k8sResourcesPath

}

conftest_enabled() {
  $(yq r $otomiSettings "otomi.addons.conftest.enabled") == "true"
}

if [ "${1-}" != "" ]; then
  conftest_enabled && validate_policies || echo "skipping"
else
  conftest_enabled && for_each_cluster validate_policies || echo "skipping"
fi
