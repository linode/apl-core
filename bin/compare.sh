#!/bin/bash
set -ue

# Usage: bin/compare.sh -l name=loki
# Alternative: bin/compare.sh base-branch-copy feat-branch-copy -l name=loki
# Optional: --diff-output <filename> writes the final diff to a file and skips common chart version information
# Deps: dyff, helmfile
# brew install homeport/tap/dyff
# brew install helmfile

diffOutput=
templateArgs=
srcDirA=
srcDirB=
targetDirA=
targetDirB=
# Process arguments
while [ $# -ne 0 ]; do
  case "$1" in
    --diff-output)
      diffOutput="$2"
      shift
      ;;
    -*)
      # Forward other options to the template command
      templateArgs=("${templateArgs[@]}" "$1")
      ;;
    *)
      # Process first two positional arguments as potential working directories
      if [ -z "$srcDirA" ]; then
        srcDirA=$(realpath "$1")
      elif [ -z "$srcDirB" ]; then
        srcDirB=$(realpath "$1")
      else
        # Forward everything else to the template command
        templateArgs=("${templateArgs[@]}" "$1")
      fi
      ;;
  esac
  shift
done

readonly script_dir=$(dirname "$0")

generate_helm_templates() {
  local target_dir="$1"
  rm -rf "$target_dir"
  node --no-warnings --import tsx src/otomi.ts -- values
  helmfile template "${templateArgs[@]}" --output-dir-template="$target_dir/{{.Release.Namespace}}-{{.Release.Name}}"
  mv tests/fixtures/values-repo.yaml "$target_dir/values-repo.yaml"
}

export NODE_ENV=test
if [ -z "$srcDirA" ]; then
  branchA='main'
  # branchB current branch
  branchB=$(git rev-parse --abbrev-ref HEAD)

  targetDirA="$PWD/tmp/${branchA}"
  targetDirB="$PWD/tmp/${branchB}"
  export ENV_DIR="$PWD/tests/fixtures"
  generate_helm_templates "$targetDirB"
  git -c core.hooksPath=/dev/null checkout -f $branchA
  generate_helm_templates "$targetDirA"
  git -c core.hooksPath=/dev/null checkout -f $branchB
else
  if [ -z "$srcDirB" ]; then
    echo "Only one directory passed for comparison"
    exit 1
  fi
  startDir=$PWD
  pushd "$srcDirB"
  export ENV_DIR="$srcDirB/tests/fixtures"
  branchB=$(git rev-parse --abbrev-ref HEAD)
  targetDirB="$startDir/tmp/${branchB}"
  generate_helm_templates "$targetDirB"
  popd
  pushd "$srcDirA"
  export ENV_DIR="$srcDirA/tests/fixtures"
  branchA=$(git rev-parse --abbrev-ref HEAD)
  targetDirA="$startDir/tmp/${branchA}"
  generate_helm_templates "$targetDirA"
  popd
fi

# order of arguments matters so new changes are green color
echo "Comparing $targetDirB with $targetDirA"
if [ -n "$diffOutput" ]; then
  "${script_dir}/dyff.sh" "$targetDirB" "$targetDirA" --exclude-chart-versions > "$diffOutput"
  cat "$diffOutput"
else
  "${script_dir}/dyff.sh" "$targetDirB" "$targetDirA"
fi

echo "#########################################################"
echo "#"
echo "# Above YAML documents diff produced by dyff tool."
echo "# You can also select two directories in VSCode $targetDirB and $targetDirA and right click and select the 'Compare selected folders' option"
echo "#"
echo "#########################################################"
