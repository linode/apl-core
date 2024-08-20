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
# we remove previously rendered manifests so they are not mixed up with newly rendered
rm -rf $targetDirB
helmfile template $templateArgs --output-dir-template="../$targetDirB/{{.Release.Namespace}}-{{.Release.Name}}"
git checkout $currentBranch

# order of arguments matters so new chanages are green color
bin/dyff.sh $targetDirB $targetDirA

echo "#########################################################"
echo "#"
echo "# Above YAML documents diff produced by dyff tool."
echo "# You can also select two directories in VSCode $targetDirA and $targetDirB and right click and select the 'Compare selected folders' option"
echo "#"
echo "#########################################################"
