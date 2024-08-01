set -ue

# Usage: bin/compare.sh -l name=loki

export ENV_DIR=$PWD/tests/fixtures

readonly templateArgs="$@"
readonly currentBranch=$(git rev-parse --abbrev-ref HEAD)
readonly compareBranch='main'

targetDirA="tmp/${currentBranch}"
targetDirB="tmp/${compareBranch}"

# mkdir -p "${targetDirA}"
# mkdir -p "${targetDirB}"

export NODE_ENV=test
helmfile template $templateArgs --output-dir-template="../$targetDirA/{{.Release.Namespace}}-{{.Release.Name }}"

git checkout $compareBranch
helmfile template $templateArgs --output-dir-template="../$targetDirB/{{.Release.Namespace}}-{{.Release.Name}}"
git checkout $currentBranch

echo "###########################################################################################################################################"
echo "#"
echo "#  In VSCode select two directories $targetDirA and $targetDirB and right click and select the 'Compare selected folders' option"
echo "#"
echo "###########################################################################################################################################"

# compare
# dyff between helmfile.d/loki-main/helmfile-10.monitoring-65f7013d-loki/loki-distributed/templates/configmap.yaml helmfile.d/loki-sr-fix-loki-auth-1/helmfile-10.monitoring-65f7013d-loki/loki-distributed/templates/configmap.yaml --omit-header --ignore-order-changes
