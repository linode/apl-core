#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -o pipefail

source bin/common.sh
readonly schema_output_path="/tmp/otomi/kubernetes-json-schema"
readonly output_path="/tmp/otomi/generated-crd-schemas"
readonly schemas_bundle_file="$output_path/all.json"
readonly k8s_resources_path="/tmp/otomi/generated-manifests"
readonly jq_file=$(mktemp -u)
readonly script_message="Templates validation"

function cleanup() {
  if [ -z "$DEBUG" ]; then
    [ -n "$VERBOSE" ] && echo "custom cleanup called"
    rm -rf $jq_file $k8s_resources_path $output_path $schema_output_path >/dev/null 2>&1
  fi
}

function setup() {
  local k8s_version=$1
  mkdir -p $k8s_resources_path $output_path $schema_output_path
  touch $schemas_bundle_file
  # use standalone schemas
  if [ ! -d "$schema_output_path/$k8s_version-standalone" ]; then
    tar -xzf "schemas/$k8s_version-standalone.tar.gz" -C "$schema_output_path/"
    tar -xzf "schemas/generated-crd-schemas.tar.gz" -C "$schema_output_path/$k8s_version-standalone"
  fi

  # loop over .spec.versions[] and generate one file for each version
  cat <<'EOF' >$jq_file
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
  local targetYamlFiles="*.yaml"
  local kubevalSchemaLocation="file://${schemaOutputPath}"
  local skipKinds="CustomResourceDefinition"
  local skipFilenames="crd,knative-services"
  local tmp_out=$(mktemp -u)
  local label=$1

  if [ $# -eq 0 ]; then
    run_setup $k8s_version
    echo "Generating Kubernetes $k8s_version Manifests for ${CLOUD}-${CLUSTER}."

    hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$k8sResourcesPath" >/dev/null
    hf template ${label:+"-l" "$label"} --skip-deps --output-dir="$k8sResourcesPath" >/dev/null

    echo "Processing CRD files."
    # generate canonical schemas
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
      jq "select(.filename==\"$json\")" $schemasBundleFile | jq '.schema' >|"$schemaOutputPath/$k8s_version-standalone/$json"
    done

    echo "Validating resources against Kubernetes version: $k8s_version"

    kubeval --quiet --skip-kinds $skipKinds --ignored-filename-patterns $skipFilenames \
      --force-color -d $k8sResourcesPath --schema-location $kubevalSchemaLocation \
      --kubernetes-version $(echo $k8s_version | sed 's/v//') | tee $tmp_out | grep -Ev 'PASS\b'
    grep -q "ERROR" $tmp_out && exitcode=1
    rm $tmp_out
  else
    echo "Validating $label..."
    validate=
    if kubectl cluster-info >/dev/null 2>&1; then
      validate="true"
    fi
    helm template "$label" --output-dir="$k8sResourcesPath" >/dev/null
  fi
}

main() {
  if [[ "$*" != "" ]]; then
    ! getopt --test >/dev/null
    if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
      echo '`getopt --test` failed in this environment.'
      exit 1
    fi

    OPTIONS=l:
    LONGOPTS=label:

    ! PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
      exit 2
    fi
    eval set -- "$PARSED"

    while true; do
      case "$1" in
        -l | --label)
          validate_templates $2
          # helm lint $2
          shift 2
          ;;
        -A | --all)
          echo $2
          ;;
        --)
          shift
          break
          ;;
        *)
          echo "Programming error: expected '--' but got $1"
          exit 3
          ;;
      esac
    done
  else
    for_each_cluster validate_templates
    # for_each_cluster helmfile lint
  fi
}

######################################################################################################
# Some more context: https://stackoverflow.com/questions/35006457/choosing-between-0-and-bash-source #
######################################################################################################
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  if [ $? -gt 0 ]; then
    exit 1
  fi
fi
