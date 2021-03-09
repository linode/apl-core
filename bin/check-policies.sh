#!/usr/bin/env bash

[ -n "$CI" ] && set -e
set -o pipefail

. bin/common.sh
. bin/common-modules.sh

readonly k8s_resources_path="/tmp/otomi/templates"
readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly policies_path="policies"
readonly constraints_file=$(mktemp -u)
readonly parameters_file=$(mktemp -u)
readonly script_message="Policy checking"

function cleanup() {
  if [ -z "$DEBUG" ]; then
    rm -rf $k8s_resources_path $constraints_file $parameters_file
  fi
}

check_policies() {

  local k8s_version="v$(get_k8s_version)"
  local cluster_env=$(cluster_env)
  mkdir -p $k8s_resources_path
  # generate_manifests
  echo "Generating k8s $k8s_version manifests for cluster '$cluster_env'..."
  hf_templates_init "$k8s_resources_path/$k8s_version" "$@"

  echo "Processing templates..."
  # generate parameter constraints file from values
  local parse_constraints_expression='.policies as $constraints | $constraints | keys[] | {(.): $constraints[.]}'
  local policies=$(yq r $policies_file -j | jq --raw-output -S -c "$parse_constraints_expression")
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraints_file
  done
  yq r -j $constraints_file | jq '{parameters: .}' | yq r -P - >$parameters_file

  echo "Checking manifests against policies for $cluster_env cluster."
  conftest test --fail-on-warn --all-namespaces -d "$parameters_file" -p $policies_path "$k8s_resources_path/$k8s_version" || exitcode=1
  [ -n "$CI" ] && [ $exitcode -ne 0 ] && exit $exitcode
  return 0
}

! $(yq r $otomi_settings "otomi.addons.conftest.enabled") && echo "skipping" && exit 0

function main() {
  process_clusters check_policies "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
