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

set +e
diff_output=$(diff -q -r $targetDirA $targetDirB)
set -e
# Process each line of diff output

echo "$diff_output" | while read -r line; do
  # Check if the line indicates a difference
  if [[ $line == *" and "* ]]; then
    # Extract the paths using cut
    first_path=$(echo $line | cut -d' ' -f2)
    second_path=$(echo $line | cut -d' ' -f4)

    # Use dyff to compare the files
    dyff between "$first_path" "$second_path"
  fi
done

echo "#########################################################"
echo "#"
echo "#  Above YAML documents comparison produced by dyff tool."
echo "# You can also select two directories in VSCode $targetDirA and $targetDirB and right click and select the 'Compare selected folders' option"
echo "#"
echo "#########################################################"
