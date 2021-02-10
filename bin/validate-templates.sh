#!/usr/bin/env bash

[ -n "$CI" ] && set -e
set -o pipefail

. bin/common.sh

schema_output_path="/tmp/otomi/kubernetes-json-schema"
output_path="/tmp/otomi/generated-crd-schemas"
schemas_bundle_file="$output_path/all.json"
k8s_resources_path="/tmp/otomi/kubeval-fixtures"
extract_crd_schema_jqfile=$(mktemp -u)
script_message="Templates validation"
exitcode=0
abort=false

function cleanup() {
  [ $? -ne 0 ] && exitcode=$?
  ! $abort && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  if [ -z "$DEBUG" ]; then
    rm -rf $extract_crd_schema_jqfile
    rm -rf $k8s_resources_path -rf $output_path $schema_output_path
  fi
  exit $exitcode
}
trap cleanup EXIT ERR
function abort() {
  abort=true
  cleanup
}
trap abort SIGINT

run_setup() {
  local k8s_version=$1
  rm -rf $k8s_resources_path $output_path $schema_output_path
  mkdir -p $k8s_resources_path $output_path $schema_output_path
  echo "" >$schemas_bundle_file
  # use standalone schemas
  tar -xzf "schemas/$k8s_version-standalone.tar.gz" -C "$schema_output_path/"
  tar -xzf "schemas/generated-crd-schemas.tar.gz" -C "$schema_output_path/$k8s_version-standalone"

  # loop over .spec.versions[] and generate one file for each version
  cat <<'EOF' >$extract_crd_schema_jqfile
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
      jq -S -c --raw-output -f "$extract_crd_schema_jqfile" >>"$schemas_bundle_file"
  } || {
    err "Processing: $document"
    [ "$CI" != "" ] && exit 1
  }
}

validate_templates() {

  local k8s_version="v$(get_k8s_version)"

  run_setup $k8s_version
  # generate_manifests
  echo "Generating Kubernetes $k8s_version Manifests for ${CLOUD}-${CLUSTER}."

  hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$k8s_resources_path" >/dev/null
  hf template --skip-deps --output-dir="$k8s_resources_path" >/dev/null

  echo "Processing CRD files."
  # generate canonical schemas
  local targetYamlFiles="*.yaml"
  # schemas for otomi templates
  for file in $(find "$k8s_resources_path" -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # schemas for chart crds
  for file in $(find charts/**/crds -name "$targetYamlFiles" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # create schema in canonical format for each extracted file
  for json in $(jq -s -r '.[] | .filename' $schemas_bundle_file); do
    jq "select(.filename==\"$json\")" $schemas_bundle_file | jq '.schema' >"$schema_output_path/$k8s_version-standalone/$json"
  done

  # validate_resources
  echo "Validating resources against Kubernetes version: $k8s_version"
  local kubevalSchemaLocation="file://${schema_output_path}"
  local skipKinds="CustomResourceDefinition"
  local skipFilenames="crd,knative-services"
  local tmp_out=$(mktemp -u)
  set +o pipefail
  kubeval --quiet --skip-kinds $skipKinds --ignored-filename-patterns $skipFilenames \
    --force-color -d $k8s_resources_path --schema-location $kubevalSchemaLocation \
    --kubernetes-version $(echo $k8s_version | sed 's/v//') | tee $tmp_out | grep -Ev 'PASS\b'
  set -o pipefail
  grep -q "ERROR" $tmp_out && exitcode=1
  rm $tmp_out
}

if [ -n "$1" ]; then
  [ -n "$VERBOSE" ] && echo "Running validate-templates for target cluster only"
  validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # hf lint
else
  set -x
  [ -n "$VERBOSE" ] && echo "Running validate-templates for all clusters"
  for_each_cluster validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # for_each_cluster hf lint
fi
