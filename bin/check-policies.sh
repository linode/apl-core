#!/usr/bin/env bash

set -e

. bin/common.sh
. bin/common-modules.sh

readonly k8s_resources_path="/tmp/otomi/templates"
readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly policies_path="policies"
readonly constraints_file=$(mktemp -u)
readonly parameters_file=$(mktemp -u)
readonly script_message="Policy checking"

function cleanup() {
  rm -rf $k8s_resources_path $constraints_file $parameters_file
}

check_policies() {

  local k8s_version="v$(get_k8s_version)"
  mkdir -p $k8s_resources_path
  # generate_manifests
  echo "Generating k8s $k8s_version manifests for cluster"
  hf_template "$k8s_resources_path/$k8s_version"

  echo "Processing templates..."
  # generate parameter constraints file from values
  local parse_constraints_expression='.policies as $constraints | $constraints | keys[] | {(.): $constraints[.]}'
  local policies=$(yq r $policies_file -j | jq --raw-output -S -c "$parse_constraints_expression")
  for policy in $policies; do
    echo $policy | yq r -P - >>$constraints_file
  done
  yq r -j $constraints_file | jq '{parameters: .}' | yq r -P - >$parameters_file

  echo "Checking manifests against policies"
  local tmp_out=$(mktemp -u)
  [ -n "$TRACE" ] && trace='--trace'
  set -o pipefail
  set -x
  conftest test $([ -n "$CI" ] && echo '--no-color') $trace --fail-on-warn --all-namespaces -d "$parameters_file" -p $policies_path "$k8s_resources_path/$k8s_version" 2>&1 | tee $tmp_out | grep -v 'TRAC' | grep -v 'PASS' | grep -v 'no policies found'
  grep "FAIL" $tmp_out >/dev/null && return 1
  return 0
}

[ -f $otomi_settings ] && ! $(yq r $otomi_settings "otomi.addons.conftest.enabled") && echo "skipping" && exit 0

function main() {
  check_policies "$@"
}

main "$@"
