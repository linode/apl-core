#!/usr/bin/env bash

[ "$CI" = 'true' ] && set -e
set -o pipefail

. bin/common.sh

readonly schema_output_path="schemas/"
readonly output_path="/tmp/otomi/generated-crd-schemas"
readonly schemas_bundle_file="$output_path/all.json"
readonly k8s_resources_path="/tmp/otomi/generated-manifests"
readonly jq_file=$(mktemp -u)
script_message="Templates validation"
exitcode=0
abort=false

function cleanup() {
  [ $? -ne 0 ] && exitcode=$?
  ! $abort && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  if [ -z "$DEBUG" ]; then
    rm -rf $jq_file $k8s_resources_path $output_path $schema_output_path
  fi
  exit $exitcode
}
# trap cleanup EXIT ERR
function abort() {
  abort=true
  cleanup
}
trap abort SIGINT

function setup() {
  local k8s_version=$1
  touch $schemas_bundle_file
  # use standalone schemas
  if [ ! -d "schemas/$k8s_version-standalone" ]; then
    tar -xzf "schemas/$k8s_version-standalone.tar.gz" -C "schemas/"
    tar -xzf "schemas/generated-crd-schemas.tar.gz" -C "schemas/$k8s_version-standalone"
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

function process_crd() {
  local document="$1"
  local filter_crd_expr='select(.kind=="CustomResourceDefinition")'
  {
    yq r -d'*' -j "$document" |
      jq -c "$filter_crd_expr" |
      jq -S -c --raw-output -f "$jq_file" >>"$schemas_bundle_file"
  } || {
    err "Processing: $document"
    [ "$CI" = 'true' ] && exit 1
  }
}

function validate_templates() {

  local k8s_version="v$(get_k8s_version)"
  local cluster_env=$(cluster_env)

  setup $k8s_version
  echo "Generating k8s $k8s_version manifests for cluster '$cluster_env'"
  # hf_templates_init $k8s_resources_path

  echo "Processing CRD files"
  # generate canonical schemas
  local target_yaml_files="*.yaml"
  # schemas for otomi templates
  for file in $(find "$k8s_resources_path" -name "$target_yaml_files" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # schemas for chart crds
  for file in $(find charts/**/crds -name "$target_yaml_files" -exec bash -c "ls {}" \;); do
    process_crd $file
  done
  # create schema in canonical format for each extracted file
  for json in $(jq -s -r '.[] | .filename' $schemas_bundle_file); do
    jq "select(.filename==\"$json\")" $schemas_bundle_file | jq '.schema' >"$schema_output_path/$k8s_version-standalone/$json"
  done

  # validate_resources
  echo "Validating resources for cluster '$cluster_env'"
  local kubeval_schema_location="file://$schema_output_path"
  local constraint_kinds="PspAllowedRepos,BannedImageTags,ContainerLimits,PspAllowedUsers,PspHostFilesystem,PspHostNetworkingPorts,PspPrivileged,PspApparmor,PspCapabilities,PspForbiddenSysctls,PspHostSecurity,PspSeccomp,PspSelinux"
  # TODO: revisit these excluded resources and see it they exist now
  local skip_kinds="CustomResourceDefinition,AppRepository,$constraint_kinds"
  local skip_filenames="crd,knative-services,constraint"
  local tmp_out=$(mktemp -u)
  set +o pipefail
  kubeval --quiet --skip-kinds $skip_kinds --ignored-filename-patterns $skip_filenames \
    --force-color -d $k8s_resources_path --schema-location $kubeval_schema_location \
    --kubernetes-version $(echo $k8s_version | sed 's/v//') | tee $tmp_out | grep -Ev 'PASS\b'
  set -o pipefail
  grep -e "ERR\b" $tmp_out && exitcode=1
}

if [ -n "$1" ]; then
  [ -n "$VERBOSE" ] && echo "Running validate-templates for target cluster only"
  validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # hf lint
else
  [ -n "$VERBOSE" ] && echo "Running validate-templates for all clusters"
  for_each_cluster validate_templates
  # re-enable next line after helm does not throw error any more: https://github.com/helm/helm/issues/8596
  # for_each_cluster hf lint
fi
