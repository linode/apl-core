#!/usr/bin/env bash

set -e

. bin/common.sh
. bin/common-modules.sh

crypt

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
  cat $policies_file | sed -e 's/policies:/parameters/' >$parameters_file
  echo "Checking manifests against policies"
  local tmp_out=$(mktemp -u)
  [ -n "$TRACE" ] && trace='--trace'
  set -o pipefail
  conftest test $([ -n "$CI" ] && echo '--no-color') $trace --fail-on-warn --all-namespaces -d "$parameters_file" -p $policies_path "$k8s_resources_path/$k8s_version" 2>&1 | tee $tmp_out | grep -v 'TRAC' | grep -v 'PASS' | grep -v 'no policies found'
  ret=$?
  [ -n "$TRACE" ] && return $ret
  grep "FAIL" $tmp_out >/dev/null && return 1
  return $ret
}

function main() {
  echo $script_message STARTED
  check_policies "$@"
}

main "$@"
