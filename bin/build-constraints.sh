#!/usr/bin/env bash
set -eu

runFromHook=$1
[[ $runFromHook == "true" ]] && cd ..

. ./bin/common.sh

function build() {
  echo "Building constraints artifacts from local policies."
  local generatedArtifactsPath="./values/gatekeeper/constraints/"
  rm -f "$generatedArtifactsPath/*"
  konstraint create ./policies -o $generatedArtifactsPath
}

function decorate() {
  for constraint in $(hf_values | yq r -j - 'charts.gatekeeper' | jq --raw-output -S -c '.constraints[]  | {(.policyName):.parameters}'); do
    local key=$(echo $constraint | jq '. | keys[0]' | sed 's/"//g')
    local constraintsFile=$(ls ./values/gatekeeper/constraints/constraint_* | grep -i "$key.yaml")
    local parameters=$(echo $constraint | jq --raw-output -c "{"spec":{"parameteres": .${key} }}")
    local constraints=$(yq r -P -j $constraintsFile | jq --raw-output -c '.')
    echo "Decorating $constraintsFile with parameters policy $key."
    jq -n --argjson constraints $constraints --argjson parameters $parameters '$constraints * $parameters | .' | yq r -P - >$constraintsFile
  done
}

build
decorate
echo "Done"
