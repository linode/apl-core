#!/usr/bin/env bash
set -e

run_from_hook=$1
[ -n "$run_from_hook" ] && cd ..

. ./bin/common.sh

readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly output_path="/tmp/otomi/constraints"
readonly compiled_schema_path="/tmp/otomi/compiled-schema.json"
readonly crd_artifacts_path="$PWD/charts/gatekeeper-artifacts/crds"

# hardcoded workaround for Disallowed data.X References
# disable after upstream OPA issue is resolved
# https://github.com/open-policy-agent/gatekeeper/issues/1046
function clear_disallowed_refs() {
  echo "Clearing disallowed refs"
  for file in $(find $output_path -name "template_*" -exec bash -c "ls {}" \;); do
    local tmp_file=$(mktemp -u)
    sed -e '/opa_upstream_bug_1046 /{N;N;N;N;N;d;}' $file >$tmp_file
    mv -f $tmp_file $file
  done
}

# build yaml resources from policy files
function build() {
  echo "Building constraints artifacts from policies."
  local policies_path="./policies"
  mkdir -p $output_path $crd_artifacts_path
  rm -f $output_path/*
  konstraint create $policies_path -o $output_path
  json-dereference -s values-schema.yaml -o $compiled_schema_path
}

# decorate resources with parameters schema
function decorate() {
  echo "Decorating template/constraints files with properties."
  local map_constraints_expr='.policies as $constraints |  $constraints | keys[] | {(.): $constraints[.]}'
  for constraint in $(yq r $policies_file -j | jq --raw-output -S -c "$map_constraints_expr"); do
    local key=$(echo $constraint | jq --raw-output '. | keys[0]')
    # NOTE:
    # Konstraint library is generating filenames from folder names using the dash symbol "-" as uppercase markup. Example:  file-name => FileName
    # Policy names can be defined using dashes, so we need to strip dashes from filenames expression
    local filename=$(sed s/-//g <<<$key)
    # decorate constraints with parameters
    local constraints_file=$(ls $output_path/constraint_* | grep -i "$filename.yaml")
    local parameters=$(echo $constraint | jq --raw-output -c "{"spec":{"parameters": {\"${key}\"} }}")
    local constraints=$(yq r -P -j $constraints_file | jq --raw-output -c '.')
    jq -n --argjson constraints $constraints --argjson parameters $parameters '$constraints * $parameters | .' | yq r -P - >$constraints_file
    # decorate constraint templates with openAPI schema properties
    local map_properties_expr='. as $properties | {"spec":{"crd":{"spec":{"validation": {"openAPIV3Schema": $properties }}}}} | .'
    local policy_json_path="properties.policies.properties[${key}]"
    local properties=$(yq -j r $compiled_schema_path $policy_json_path | yq d - '**.required.' | yq d - '**.default.' | yq d - '**.additionalProperties.' | jq -c --raw-output "$map_properties_expr")
    local ctemplates_file=$(ls $output_path/template_* | grep -i "$filename.yaml")
    local template=$(yq r -P -j $ctemplates_file | jq --raw-output -c '.')
    jq -n --argjson template "$template" --argjson properties "$properties" '$template * $properties | .' | yq r -P - >$ctemplates_file
  done
  clear_disallowed_refs
  mv -f $output_path/template_* $crd_artifacts_path
}

build && decorate
echo "Done"
