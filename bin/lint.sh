#!/usr/bin/env bash

set -eu
set -o pipefail

schemaOutputPath="/tmp/kubernetes-json-schema/master"
outputPath="/tmp/generated-crd-schemas"
schemasBundleFile="$outputPath/all.json"
k8sResourcesPath="/tmp/kubeval-fixtures"
extractCrdSchemaJQFile=$(mktemp -u)
hf="helmfile -e $CLOUD-$CLUSTER"

. bin/common.sh

version="v$(get_k8s_version).0"

cleanup() {
    exitcode=$?
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    rm -rf $extractCrdSchemaJQFile
    [[ "$MOUNT_TMP_DIR" != "1" ]] && rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
    exit $exitcode
}
trap cleanup EXIT

run_setup() {
    rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
    mkdir -p $k8sResourcesPath $outputPath $schemaOutputPath
    echo "" >$schemasBundleFile
    tar -xzf ".schemas/${version}-standalone.tar.gz" -C $schemaOutputPath
    # loop over .spec.versions[] and generate one file for each version
    cat <<'EOF' >$extractCrdSchemaJQFile
    . as $obj | if $obj.spec.versions then $obj.spec.versions[] else {name: $obj.spec.version} end | 
    {
        filename: ( ($obj.spec.names.kind | ascii_downcase) +"-"+  ($obj.spec.group | split(".")[0]) +"-"+ ( .name // $obj.spec.version ) + ".json" ),
        schema: {
            properties: $obj.spec.validation.openAPIV3Schema.properties,
            description: ($obj.spec.validation.openAPIV3Schema.description // ""),
            required: ($obj.spec.validation.openAPIV3Schema.required // []),
            title: $obj.metadata.name,
            type: "object",
            "$schema": "http://json-schema.org/draft/2019-09/schema#",
            "x-kubernetes-group-version-kind.group": $obj.spec.group,
            "x-kubernetes-group-version-kind.kind": $obj.spec.names.kind,
            "x-kubernetes-group-version-kind.version": .name 
        }
    } 
EOF
}

process_crd() {
    local document="$1"
    local filterCRDExpr='select(.kind=="CustomResourceDefinition" and .spec.validation.openAPIV3Schema.properties != null)'
    # echo "Processing: $document"
    {
        yq r -d'*' -j "$document" |
            jq -c "$filterCRDExpr" |
            jq -S -c --raw-output -f "$extractCrdSchemaJQFile" >>"$schemasBundleFile"
    } || {
        echo "ERROR Processing: $document"
    }
}

run_setup

# generate_manifests
echo "Generating Kubernetes ${version} Manifests for ${CLOUD}-${CLUSTER}."
$hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

echo "Processing CRD files."
# generate canonical schemas
targetYamlFiles="*.yaml"
# schemas for otomi templates
for file in $(find "$k8sResourcesPath" -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
done
# schemas for chart crds
for file in $(find charts/**/crds -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
done
# create schema in canonical format for each extracted file
# echo "Compiling all json schemas from: $schemasBundleFile"
for json in $(jq -s -r '.[] | .filename' $schemasBundleFile); do
    jq "select(.filename==\"$json\")" $schemasBundleFile | jq '.schema' >"$schemaOutputPath/$version-standalone/$json"
done

# validate_resources
echo "Validating resources against Kubernetes version: $version"
kubevalSchemaLocation="file://${schemaOutputPath}"
kubeval --force-color -d "$k8sResourcesPath" --schema-location $kubevalSchemaLocation --kubernetes-version $(echo $version | sed 's/v//') | grep -Ev 'PASS'
