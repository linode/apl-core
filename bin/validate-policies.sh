#!/usr/bin/env bash

set -uo pipefail

EXIT_FAST=${EXIT_FAST:-"1"}
[[ $EXIT_FAST == "1" ]] && set -e

k8sResourcesPath="/tmp/otomi/conftest-fixtures"
policiesPath="policies"
constraintsFile=$(mktemp -u)
parametersFile=$(mktemp -u)

. bin/common.sh

cleanup() {
  exitcode=$?
  [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
  [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -rf $k8sResourcesPath $constraintsFile $parametersFile
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
  echo "Generating Kubernetes Manifests for ${CLOUD}-${CLUSTER}."
  $hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

  # generate parameter constraints file from values
  policies=$(hf_values | yq r -j - 'charts.gatekeeper' | jq --raw-output -S -c '.constraints[] | {(.policyName):.parameters}')
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraintsFile
  done
  yq r -j $constraintsFile | jq '{parameters: .}' | yq r -P - >$parametersFile

  # validate_resources
  echo "Run Policy validation for ${CLOUD}-${CLUSTER} template resources"
  conftest test --fail-on-warn --all-namespaces -d "$parametersFile" -p "$policiesPath/lib/core.rego" -p $policiesPath $k8sResourcesPath

}

for_each_cluster validate_policies
