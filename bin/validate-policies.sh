#!/usr/bin/env bash

set -uo pipefail

EXIT_FAST=${EXIT_FAST:-"1"}
[[ $EXIT_FAST == "1" ]] && set -e

k8sResourcesPath="/tmp/otomi/conftest-fixtures"
# policiesPath="policies-bck"
policiesPath="values/gatekeeper-operator/policies"
exitcode=1

. bin/common.sh

cleanup() {
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -rf $k8sResourcesPath
    exit $exitcode
}
trap cleanup EXIT

run_setup() {
    exitcode=1
    rm -rf $k8sResourcesPath && mkdir -p $k8sResourcesPath
}

validate_policies() {
    local hf="helmfile -e $CLOUD-$CLUSTER"

    run_setup
    # generate_manifests
    echo "Generating Kubernetes Manifests for ${CLOUD}-${CLUSTER}."
    $hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

    # validate_resources
    echo "Run Policy validation for ${CLOUD}-${CLUSTER} template resources"
    {
        conftest test --fail-on-warn --all-namespaces -d "$policiesPath/lib/constraints.yaml" -p "$policiesPath/lib/helpers.rego" -p $policiesPath $k8sResourcesPath
    } && exitcode=0

}

for_each_cluster validate_policies
