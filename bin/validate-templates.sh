#!/usr/bin/env bash

[ "$CI" != "" ] && set -e
set -uo pipefail

schemaOutputPath="/tmp/otomi/kubernetes-json-schema"
outputPath="/tmp/otomi/generated-crd-schemas"
schemasBundleFile="$outputPath/all.json"
k8sResourcesPath="/tmp/otomi/kubeval-fixtures"
extractCrdSchemaJQFile=$(mktemp -u)
exitcode=0

. bin/common.sh

cleanup() {
  [ $? -eq 0 ] && [ $exitcode -eq 0 ] && echo "Validation Success" || echo "Validation Failed"
  rm -rf $extractCrdSchemaJQFile
  rm -rf $k8sResourcesPath -rf $outputPath $schemaOutputPath
  exit $exitcode
}
trap cleanup EXIT ERR SIGINT

run_setup() {
  local k8s_version=$1
  rm -rf $k8sResourcesPath $outputPath $schemaOutputPath
  mkdir -p $k8sResourcesPath $outputPath $schemaOutputPath
  echo "" >$schemasBundleFile
  # use standalone schemas
  tar -xzf "schemas/$k8s_version-standalone.tar.gz" -C "$schemaOutputPath/"
  tar -xzf "schemas/generated-crd-schemas.tar.gz" -C "$schemaOutputPath/$k8s_version-standalone"

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
    [ "$CI" != "" ] && exit 1
  }
}

validate_templates() {

  local k8s_version="v$(get_k8s_version)"

  run_setup $k8s_version
  # generate_manifests
  echo "Generating Kubernetes $k8s_version Manifests for ${CLOUD}-${CLUSTER}."

  hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null
  hf template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

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
    jq "select(.filename==\"$json\")" $schemasBundleFile | jq '.schema' >"$schemaOutputPath/$k8s_version-standalone/$json"
  done

  # validate_resources
  echo "Validating resources against Kubernetes version: $k8s_version"
  local kubevalSchemaLocation="file://${schemaOutputPath}"
  local skipKinds="CustomResourceDefinition"
  local skipFilenames="crd,knative-services"
  local tmp_out=$(mktemp -u)
  set +o pipefail
  kubeval --quiet --skip-kinds $skipKinds --ignored-filename-patterns $skipFilenames \
    --force-color -d $k8sResourcesPath --schema-location $kubevalSchemaLocation \
    --kubernetes-version $(echo $k8s_version | sed 's/v//') | tee $tmp_out | grep -Ev 'PASS\b'
  set -o pipefail
  grep -q "ERROR" $tmp_out && exitcode=1
  rm $tmp_out
}

if [ "${1-}" != "" ]; then
  validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # hf lint
else
  for_each_cluster validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # for_each_cluster hf lint
fi
