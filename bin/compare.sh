#!/bin/bash
set -ue

# Usage: bin/compare.sh -l name=loki

export ENV_DIR=$PWD/tests/fixtures

readonly templateArgs="$@"
readonly branchA='main'
# branchB current branch
readonly branchB=$(git rev-parse --abbrev-ref HEAD)

targetDirA="tmp/${branchA}"
targetDirB="tmp/${branchB}"

export NODE_ENV=test
helmfile template $templateArgs --output-dir-template="../$targetDirB/{{.Release.Namespace}}-{{.Release.Name }}"

git checkout $branchA
# we remove previously rendered manifests so they are not mixed up with newly rendered
rm -rf $targetDirA
helmfile template $templateArgs --output-dir-template="../$targetDirA/{{.Release.Namespace}}-{{.Release.Name}}"
git checkout $branchB

# order of arguments matters so new chanages are green color
echo "Comparing $targetDirB with $targetDirA"
bin/dyff.sh $targetDirB $targetDirA

echo "#########################################################"
echo "#"
echo "# Above YAML documents diff produced by dyff tool."
echo "# You can also select two directories in VSCode $targetDirB and $targetDirA and right click and select the 'Compare selected folders' option"
echo "#"
echo "#########################################################"
