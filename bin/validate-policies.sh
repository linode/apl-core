#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -uo pipefail

. bin/common.sh

readonly k8s_resources_path="/tmp/otomi/conftest-fixtures"
readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly policies_path="policies"
readonly constraints_file=$(mktemp -u)
readonly parameters_file=$(mktemp -u)

exitcode=1
validationResult=0 # using $validationResult as final exit code result (assuming there is an error prior to finishing all policy chcking, the script should exit with an error)

cleanup() {
  validationResult=$((($validationResult + $exitcode)))
  [ $validationResult -eq 0 ] && echo "Policy checks SUCCESS" || echo "Policy checks FAILED"
  [ "${DEBUG-}" = '' ] && rm -rf $k8s_resources_path
  rm -f $constraints_file $parameters_file
  exit $validationResult
}
trap cleanup EXIT

run_setup() {
  exitcode=1
  rm -rf $k8s_resources_path $constraints_file $parameters_file && mkdir -p $k8s_resources_path
}

validate_policies() {

  local k8s_version="v$(get_k8s_version)"
  local cluster_env=$(cluster_env)
  run_setup
  # generate_manifests
  echo "Generating k8s $k8s_version manifests for cluster '$cluster_env'"
  hf_templates $k8s_resources_path

  echo "Processing templates"
  # generate parameter constraints file from values
  local parse_constraints_expression='.policies as $constraints | $constraints | keys[] | {(.): $constraints[.]}'
  local policies=$(yq r $policies_file -j | jq --raw-output -S -c "$parse_constraints_expression")
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraints_file
  done
  yq r -j $constraints_file | jq '{parameters: .}' | yq r -P - >$parameters_file

  # validate_resources
  echo "Validating manifests against policies for $cluster_env cluster."
  conftest test --fail-on-warn --all-namespaces -d "$parameters_file" -p $policies_path $k8s_resources_path
  [ $? -eq 0 ] && exitcode=0
  validationResult=$((($validationResult + $exitcode)))
}

! $(yq r $otomi_settings "otomi.addons.conftest.enabled") && echo "skipping" && exit 0

if [ "${1-}" != "" ]; then
  echo "Checking policies for cluster '$(cluster_env)'"
  validate_policies
else
  echo "Checking policies for all clusters"
  for_each_cluster validate_policies
fi
