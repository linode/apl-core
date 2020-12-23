#!/usr/bin/env bash
set -eu

run_from_hook=${1:-''}
[ "$run_from_hook" != '' ] && cd ..

. ./bin/common.sh

readonly policies_file="$ENV_DIR/env/policies.yaml"
readonly output_path="/tmp/otomi/constraints"
readonly artifacts_path="charts/gatekeeper"

function build() {
  echo "Building constraints artifacts from policies."
  which konstraint
  local policies_path="./policies"
  rm -f $output_path/* $artifacts_path/{crds,templates}/*
  konstraint create $policies_path -o $output_path
}
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
    local properties=$(yq -j r values-schema.yaml $policy_json_path | yq d - '**.required.' | yq d - '**.additionalProperties.' | jq -c --raw-output "$map_properties_expr")

    local ctemplates_file=$(ls $output_path/template_* | grep -i "$filename.yaml")
    local template=$(yq r -P -j $ctemplates_file | jq --raw-output -c '.')
    jq -n --argjson template "$template" --argjson properties "$properties" '$template * $properties | .' | yq r -P - >$ctemplates_file
  done
  mv -f $output_path/template_* $artifacts_path/crds
  mv -f $output_path/constraint_* $artifacts_path/templates
}

build && decorate
echo "Done"
