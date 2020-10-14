#!/usr/bin/env bash

# checks current context for kuberntes version to check against
# example:~$ otomi lint
set -e
set -o pipefail

schemaOutputPath="/tmp/kubernetes-json-schema/master"
outputPath="/tmp/generated-crd-schemas"
schemasBundleFile="$outputPath/all.json"
k8sResourcesPath="/tmp/kubeval-fixtures"
extractCrdSchemaJQFile=$(mktemp -u)
trap 'rm -f -- "$extractCrdSchemaJQFile" ' INT TERM HUP ERR EXIT
hf="helmfile -e $CLOUD-$CLUSTER"
ENV_DIR=${ENV_DIR:-$PWD}
exitcode=1

. bin/common.sh

version="v$(otomi_cluster_info k8sVersion).0"

cleanup() {
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
    exit $exitcode
}
trap cleanup EXIT

run_setup() {
    mkdir -p $outputPath $schemaOutputPath $k8sResourcesPath
    echo "" >$schemasBundleFile
    tar -xzf ".schemas/${version}-standalone.tar.gz" -C $schemaOutputPath

    # @TODO  for loop over .spec.versions[] and generate one file for each version
    cat <<'EOF' >$extractCrdSchemaJQFile
    {
        filename: ( (.spec.names.kind | ascii_downcase) +"-"+  (.spec.group | split(".")[0]) +"-"+ ( .spec.versions[0].name // .spec.version ) + ".json" ),
        schema: {
            properties: .spec.validation.openAPIV3Schema.properties,
            description: (.spec.validation.openAPIV3Schema.description // ""),
            required: (.spec.validation.openAPIV3Schema.required // []),
            title: .metadata.name,
            type: "object",
            "$schema": "http://json-schema.org/draft/2019-09/schema#",
            "x-kubernetes-group-version-kind.group": .spec.group,
            "x-kubernetes-group-version-kind.kind": .spec.names.kind,
            "x-kubernetes-group-version-kind.version": ( .spec.versions[0].name // .spec.version )
        }
    }
EOF
}

process_crd() {
    local document="$1"
    local filterCRDExpr='select(.kind=="CustomResourceDefinition" and .spec.validation.openAPIV3Schema.properties != null)'
    echo "$(date --utc) Processing: $document"
    {
        yq r -d'*' -j "$document" |
            jq -c "$filterCRDExpr" |
            jq -S -c --raw-output -f "$extractCrdSchemaJQFile" >>"$schemasBundleFile"
    } || {
        echo "$(date --utc) ERROR Processing: $document"
    }
}

run_setup

# generate_manifests
echo "Generating Kubernetes Manifests."
$hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

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
echo "$(date --utc) Compiling all json schemas from: $schemasBundleFile"
for json in $(jq -s -r '.[] | .filename' $schemasBundleFile); do
    jq "select(.filename==\"$json\")" $schemasBundleFile | jq '.schema' >"$schemaOutputPath/$version-standalone/$json"
done

# validate_resources
echo "Validating resources against Kubernetes version: $version"
KUBEVAL_SCHEMA_LOCATION="file://./kubernetes-json-schema/master"
kubeval --force-color -d "$k8sResourcesPath" --schema-location $KUBEVAL_SCHEMA_LOCATION --kubernetes-version $(echo $version | sed 's/v//') && exitcode=0
