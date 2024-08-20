#!/bin/bash
set -ue

# Usage: bin/compare.sh -l name=loki

export ENV_DIR=$PWD/tests/fixtures

readonly templateArgs="$@"
readonly currentBranch=$(git rev-parse --abbrev-ref HEAD)
readonly compareBranch='main'

targetDirA="tmp/${currentBranch}"
targetDirB="tmp/${compareBranch}"

export NODE_ENV=test
helmfile template $templateArgs --output-dir-template="../$targetDirA/{{.Release.Namespace}}-{{.Release.Name }}"

git checkout $compareBranch
helmfile template $templateArgs --output-dir-template="../$targetDirB/{{.Release.Namespace}}-{{.Release.Name}}"
git checkout $currentBranch

bin/dyff.sh $targetDirA $targetDirB

echo "#########################################################"
echo "#"
echo "# Above YAML documents diff produced by dyff tool."
echo "# You can also select two directories in VSCode $targetDirA and $targetDirB and right click and select the 'Compare selected folders' option"
echo "#"
echo "#########################################################"
