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
tmpWorktreeA=
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

cleanup() {
  if [ -n "${tmpWorktreeA}" ] && [ -d "${tmpWorktreeA}" ]; then
    git -c core.hooksPath=/dev/null worktree remove --force "${tmpWorktreeA}" >/dev/null 2>&1 || true
    rm -rf "${tmpWorktreeA}" || true
  fi
}

trap cleanup EXIT

generate_helm_templates() {
  local target_dir="$1"
  local source_dir="$2"

  pushd "$source_dir" >/dev/null
  rm -rf "$target_dir"
  node --no-warnings --import tsx src/otomi.ts -- values
  helmfile template "${templateArgs[@]}" --output-dir-template="$target_dir/{{.Release.Namespace}}-{{.Release.Name}}"
  mv tests/fixtures/values-repo.yaml "$target_dir/values-repo.yaml"
  popd >/dev/null
}

export NODE_ENV=test
if [ -z "$srcDirA" ]; then
  branchA='main'
  # branchB current branch
  branchB=$(git rev-parse --abbrev-ref HEAD)
  if [ "$branchB" = "HEAD" ]; then
    branchB="detached-$(git rev-parse --short HEAD)"
  fi

  targetDirA="$PWD/tmp/${branchA}"
  targetDirB="$PWD/tmp/${branchB}"

  export ENV_DIR="$PWD/tests/fixtures"
  generate_helm_templates "$targetDirB" "$PWD"

  tmpWorktreeA="$PWD/tmp/worktree-${branchA}-$$"
  git -c core.hooksPath=/dev/null worktree add --detach "$tmpWorktreeA" "$branchA" >/dev/null
  export ENV_DIR="$tmpWorktreeA/tests/fixtures"
  generate_helm_templates "$targetDirA" "$tmpWorktreeA"
else
  if [ -z "$srcDirB" ]; then
    echo "Only one directory passed for comparison"
    exit 1
  fi
  startDir=$PWD
  export ENV_DIR="$srcDirB/tests/fixtures"
  branchB=$(git rev-parse --abbrev-ref HEAD)
  targetDirB="$startDir/tmp/${branchB}"
  generate_helm_templates "$targetDirB" "$srcDirB"

  export ENV_DIR="$srcDirA/tests/fixtures"
  branchA=$(git rev-parse --abbrev-ref HEAD)
  targetDirA="$startDir/tmp/${branchA}"
  generate_helm_templates "$targetDirA" "$srcDirA"
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
