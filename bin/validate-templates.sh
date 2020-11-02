#!/usr/bin/env bash

set -uo pipefail

EXIT_FAST=${EXIT_FAST:-"1"}
[[ $EXIT_FAST == "1" ]] && set -e

schemaOutputPath="/tmp/otomi/kubernetes-json-schema/master"
outputPath="/tmp/otomi/generated-crd-schemas"
schemasBundleFile="$outputPath/all.json"
k8sResourcesPath="/tmp/otomi/kubeval-fixtures"
extractCrdSchemaJQFile=$(mktemp -u)
exitcode=1

. bin/common.sh

cleanup() {
  [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
  rm -rf $extractCrdSchemaJQFile
  [[ "${MOUNT_TMP_DIR-0}" != "1" ]] && rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
  exit $exitcode
}
trap cleanup EXIT ERR

run_setup() {
  exitcode=1
  local version="v$(get_k8s_version).0"
  rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
  mkdir -p $k8sResourcesPath $outputPath $schemaOutputPath
  echo "" >$schemasBundleFile
  # use standalone schemas
  tar -xzf "schemas/${version}-standalone.tar.gz" -C $schemaOutputPath
  tar -xzf "schemas/generated-crd-schemas.tar.gz" -C "$schemaOutputPath/$version-standalone"

  # loop over .spec.versions[] and generate one file for each version
  cat <<'EOF' >$extractCrdSchemaJQFile
    . as $obj |
    if $obj.spec.versions then $obj.spec.versions[] else {name: $obj.spec.version} end | 
    if .schema then {version: .name, schema: .schema} else {version: .name, schema: $obj.spec.validation} end | 
    {
        filename: ( ($obj.spec.names.kind | ascii_downcase) +"-"+  ($obj.spec.group | split(".")[0]) +"-"+ ( .version  ) + ".json" ),
        schema: {
            properties: .schema.openAPIV3Schema.properties,
            description: (.schema.openAPIV3Schema.description // ""),
            required: (.schema.openAPIV3Schema.required // []),
            title: $obj.metadata.name,
            type: "object",
            "$schema": "http://json-schema.org/draft/2019-09/schema#",
            "x-kubernetes-group-version-kind.group": $obj.spec.group,
            "x-kubernetes-group-version-kind.kind": $obj.spec.names.kind,
            "x-kubernetes-group-version-kind.version": .version 
        }
    } 
EOF
}

process_crd() {
  local document="$1"
  local filterCRDExpr='select(.kind=="CustomResourceDefinition")'
  {
    yq r -d'*' -j "$document" |
      jq -c "$filterCRDExpr" |
      jq -S -c --raw-output -f "$extractCrdSchemaJQFile" >>"$schemasBundleFile"
  } || {
    echo "ERROR Processing: $document"
    [[ $EXIT_FAST == "1" ]] && exit 1
  }
}

validate_templates() {
  local hf="helmfile -e $CLOUD-$CLUSTER"
  local version="v$(get_k8s_version).0"

  run_setup
  # generate_manifests
  echo "Generating Kubernetes ${version} Manifests for ${CLOUD}-${CLUSTER}."
  $hf --quiet template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

  echo "Processing CRD files."
  # generate canonical schemas
  local targetYamlFiles="*.yaml"
  # schemas for otomi templates
  for file in $(find "$k8sResourcesPath" -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # schemas for chart crds
  for file in $(find charts/**/crds -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # create schema in canonical format for each extracted file
  for json in $(jq -s -r '.[] | .filename' $schemasBundleFile); do
    jq "select(.filename==\"$json\")" $schemasBundleFile | jq '.schema' >"$schemaOutputPath/$version-standalone/$json"
  done

  # validate_resources
  echo "Validating resources against Kubernetes version: $version"
  local kubevalSchemaLocation="file://${schemaOutputPath}"
  local skipKinds="CustomResourceDefinition"
  local skipFilenames="crd,knative-services"
  {
    kubeval --skip-kinds $skipKinds --ignored-filename-patterns $skipFilenames --force-color -d $k8sResourcesPath --schema-location $kubevalSchemaLocation --kubernetes-version $(echo $version | sed 's/v//') | grep -Ev 'PASS\b'
  } && exitcode=0

}

for_each_cluster validate_templates
