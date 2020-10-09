#!/usr/bin/env bash

# checks current context for kuberntes version to check against
# example:~$ otomi lint
set -e
set -o pipefail
k8sResourcesPath="/tmp/kubeval-fixtures"
# schemaOutputPath="/tmp/generated-crd-schemas/schemas"
outputPath="/tmp/generated-crd-schemas"
destinationFile="$outputPath/all.json"

queryExpression=$(mktemp -u)
trap 'rm -f -- "$queryExpression"' INT TERM HUP ERR EXIT
exitcode=1
hf="helmfile -e $CLOUD-$CLUSTER"
ENV_DIR=${ENV_DIR:-$PWD}

. bin/common.sh

declare -a allowedVersions=(
    v1.16.0
    v1.17.0
    v1.18.0
)

cleanup() {
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    # rm -rf $k8sResourcesPath $outputPath
    exit $exitcode
}
trap cleanup EXIT

run_setup() {
    mkdir -p $outputPath $schemaOutputPath $k8sResourcesPath
    cat <<'EOF' >$queryExpression
    {
        properties: .spec.validation.openAPIV3Schema.properties,
        description: .spec.validation.openAPIV3Schema.description,
        required: .spec.validation.openAPIV3Schema.required,
        title: .metadata.name,
        type: "object",
        "$schema": "http://json-schema.org/draft/2019-09/schema#",
        "x-kubernetes-group-version-kind.group": .spec.group,
        "x-kubernetes-group-version-kind.kind": .spec.names.kind,
        "x-kubernetes-group-version-kind.version": .spec.version
    }
EOF
}

filter_crds() {
    local document="$1"
    local filterExpr='select(.kind=="CustomResourceDefinition" and .spec.validation.openAPIV3Schema.properties != null)'
    echo "$(date --utc) Processing: $document"

    yq r -d'*' -j "$document" |
        jq -c "$filterExpr" |
        jq -S -c --raw-output -f "$queryExpression" >>"$destinationFile"
}

generate_canonical_schemas() {
    echo "$(date --utc) Compiling all json-schemas from: $destinationFile"

    # @TODO

    # for crd in "$jsonCRDS"; do
    #     echo "DE~bug crd: $crd "
    # done

}

generate_schemas() {
    local targetYamlFiles="*crd*.yaml"
    for file in $(find "$k8sResourcesPath" -name "$targetYamlFiles" -exec bash -c 'ls "{}"' \;); do
        filter_crds $file
    done
    generate_canonical_schemas

}

generate_manifests() {
    echo "Generating Manifests in tmp location."
    # using OUTPUT-DIR parameter because kubeval is not accepting multiple resources per file
    $hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null
}

validate_resources() {
    local version=$1
    echo "Validating Otomi Stack against Kubernetes Version: $version"
    export KUBEVAL_SCHEMA_LOCATION="$destinationFile"
    kubeval --force-color -d "$k8sResourcesPath" --exit-on-error --strict --kubernetes-version "$version"
}

version_allowed() {
    for e in "${allowedVersions[@]}"; do [[ "$e" == "$1" ]] && exit 0; done
    exit 1
}

validate_version() {
    local version=$1
    (
        version_allowed "$version"
    ) && echo "Version $version allowed" && exit 0 || echo "Version $version Not Found" && exit 1

}

version="v$(get_k8s_version).0"

# version="v1.16.0"

(validate_version $version) && versionValid=0
if [[ $versionValid == 0 ]]; then
    run_setup
    generate_manifests
    generate_schemas
    validate_resources $version
    exit 0
else
    exit 1
fi

# ERR - raw/templates/resources.yaml: Failed initializing schema /tmp/generated-crd-schemas/all.json/vv1.16.0-standalone-strict/configmap-v1.json: Reference /tmp/generated-crd-schemas/all.json/vv1.16.0-standalone-strict/configmap-v1.json must be canonical
# Validation Failed
