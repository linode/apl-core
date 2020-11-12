#!/usr/bin/env bash
set -eu

runFromHook=$1
[[ $runFromHook == "true" ]] && cd ..

. ./bin/common.sh

gatekeeperArtifactsPath="./values/gatekeeper/constraints"
function build() {
  echo "Building constraints artifacts from stack policies."
  local policiesPath="./policies"
  rm -f "$gatekeeperArtifactsPath/*"
  konstraint create $policiesPath -o $gatekeeperArtifactsPath
}

function decorate() {
  echo "Decorating constraints files with parameters."
  for constraint in $(hf_values | yq r -j - 'charts.gatekeeper' | jq --raw-output -S -c '.constraints[]  | {(.policyName):.parameters}'); do
    local key=$(echo $constraint | jq '. | keys[0]' | sed 's/"//g')
    local constraintsFile=$(ls $gatekeeperArtifactsPath/constraint_* | grep -i "$key.yaml")
    local parameters=$(echo $constraint | jq --raw-output -c "{"spec":{"parameters": {"${key}"} }}")
    local constraints=$(yq r -P -j $constraintsFile | jq --raw-output -c '.')
    jq -n --argjson constraints $constraints --argjson parameters $parameters '$constraints * $parameters | .' | yq r -P - >$constraintsFile
  done
}

build && decorate
echo "Done"
