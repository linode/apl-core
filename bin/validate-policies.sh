#!/usr/bin/env bash

set -uo pipefail

EXIT_FAST=${EXIT_FAST:-"true"}
[[ $EXIT_FAST == "true" ]] && set -e

. bin/common.sh

readonly k8sResourcesPath="/tmp/otomi/conftest-fixtures"
readonly policiesFile="$ENV_DIR/env/policies.yaml"
readonly policiesPath="policies"
readonly constraintsFile=$(mktemp -u)
readonly parametersFile=$(mktemp -u)
exitcode=0
validationResult=0

cleanup() {
  [[ $validationResult -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
  [[ ${DEBUG-'false'} != "true" ]] && rm -rf $k8sResourcesPath
  rm -f $constraintsFile $parametersFile
  exit $validationResult
}
trap cleanup EXIT

run_setup() {
  rm -rf $k8sResourcesPath $constraintsFile $parametersFile && mkdir -p $k8sResourcesPath
  ((validationResult += $exitcode))
  exitcode=1
}

validate_policies() {

  run_setup
  # generate_manifests
  echo "Generating manifests for $(cluster_env) cluster."
  hf template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null
  hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

  # generate parameter constraints file from values
  local parseConstraintsExpression='.policies as $constraints | $constraints | keys[] | {(.): $constraints[.]}'
  policies=$(yq r $policiesFile -j | jq --raw-output -S -c "$parseConstraintsExpression")
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraintsFile
  done
  yq r -j $constraintsFile | jq '{parameters: .}' | yq r -P - >$parametersFile

  # validate_resources
  echo "Validating manifests against cluster policies for ${CLOUD}-${CLUSTER} cluster."
  conftest test --fail-on-warn --all-namespaces -d "$parametersFile" -p $policiesPath $k8sResourcesPath
  exitcode=$?
}

conftest_enabled() {
  $(yq r $otomiSettings "otomi.addons.conftest.enabled")
}

if [ "${1-}" != "" ]; then
  conftest_enabled && validate_policies || echo "skipping"
else
  conftest_enabled && for_each_cluster validate_policies || echo "skipping"
fi
