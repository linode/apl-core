#!/usr/bin/env bash
set -eu

runFromHook=$1
[[ $runFromHook == "true" ]] && cd ..

. ./bin/common.sh

gatekeeperArtifactsPath="./values/gatekeeper/constraints"
function build() {
  echo "Building constraints artifacts from policies."
  local policiesPath="./policies"
  rm -f "$gatekeeperArtifactsPath/*"
  konstraint create $policiesPath -o $gatekeeperArtifactsPath
}

function decorate() {
  echo "Decorating constraints files with parameters."
  local parseConstraintsExpression='.constraints as $constraints |  $constraints | keys[] | {(.): $constraints[.]}'
  for constraint in $(hf_values | yq r -j - 'charts.gatekeeper' | jq --raw-output -S -c "$parseConstraintsExpression"); do
    local key=$(echo $constraint | jq --raw-output '. | keys[0]')
    local constraintsFile=$(ls $gatekeeperArtifactsPath/constraint_* | grep -i "$key.yaml")
    local parameters=$(echo $constraint | jq --raw-output -c "{"spec":{"parameters": {"${key}"} }}")
    local constraints=$(yq r -P -j $constraintsFile | jq --raw-output -c '.')
    jq -n --argjson constraints $constraints --argjson parameters $parameters '$constraints * $parameters | .' | yq r -P - >$constraintsFile
  done
}

build && decorate
echo "Done"
