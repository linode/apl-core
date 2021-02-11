#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -uo pipefail

. bin/common.sh

readonly k8s_resources_path="/tmp/otomi/conftest-fixtures"
readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly policies_path="policies"
readonly constraints_file=$(mktemp -u)
readonly parameters_file=$(mktemp -u)
script_message="Values validation"
exitcode=0
abort=false

function cleanup() {
  [ $? -ne 0 ] && exitcode=$?
  ! $abort && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  if [ -z "$DEBUG" ]; then
    rm -rf $constraints_file $parameters_file $k8s_resources_path
  fi
  exit $exitcode
}
trap cleanup EXIT ERR
function abort() {
  abort=true
  cleanup
}
trap abort SIGINT

function setup() {
  rm -rf $k8s_resources_path $constraints_file $parameters_file && mkdir -p $k8s_resources_path
}

validate_policies() {

  local k8s_version="v$(get_k8s_version)"
  local cluster_env=$(cluster_env)
  run_setup
  # generate_manifests
  echo "Generating k8s $k8s_version manifests for cluster '$cluster_env'"
  hf_templates_init $k8s_resources_path "$@" >/dev/null

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
  conftest test --fail-on-warn --all-namespaces -d "$parameters_file" -p $policies_path $k8s_resources_path || exitcode=1
}

! $(yq r $otomi_settings "otomi.addons.conftest.enabled") && echo "skipping" && exit 0

if [ "${1-}" != "" ]; then
  echo "Checking policies for cluster '$(cluster_env)'"
  shift
  validate_policies "$@"
else
  echo "Checking policies for all clusters"
  for_each_cluster validate_policies
fi
