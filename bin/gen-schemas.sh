#!/usr/bin/env bash
set -e

# This script uses openapi2jsonschema to generate a set of JSON schemas for
# the specified Kubernetes versions in different flavours:
#
#   X.Y.Z - URL referenced based on the specified GitHub repository
#   X.Y.Z-standalone - de-referenced schemas, more useful as standalone documents
#   X.Y.Z-standalone-strict - de-referenced schemas, more useful as standalone documents, additionalProperties disallowed
#   X.Y.Z-local - relative references, useful to avoid the network dependency

declare -a arr=(
  v1.19.10
  v1.18.18
  v1.17.17
)

readonly tmp_path=$(mktemp -d)
readonly schemas_path=$PWD/schemas

cd $tmp_path
for version in "${arr[@]}"; do
  schema=https://raw.githubusercontent.com/kubernetes/kubernetes/${version}/api/openapi-spec/swagger.json
  prefix=https://kubernetesjsonschema.dev/${version}/_definitions.JSON
  out_version=${version%.*}

  # openapi2jsonschema -o "${out_version}-standalone-strict" --expanded --kubernetes --stand-alone --strict "${schema}"
  openapi2jsonschema -o "${out_version}-standalone" --expanded --kubernetes --stand-alone "${schema}"
  # openapi2jsonschema -o "${out_version}-local" --expanded --kubernetes "${schema}"
  # openapi2jsonschema -o "${out_version}" --expanded --kubernetes --prefix "${prefix}" "${schema}"
  # openapi2jsonschema -o "${out_version}-standalone-strict" --kubernetes --stand-alone --strict "${schema}"
  openapi2jsonschema -o "${out_version}-standalone" --kubernetes --stand-alone "${schema}"
  # openapi2jsonschema -o "${out_version}-local" --kubernetes "${schema}"
  # openapi2jsonschema -o "${out_version}" --kubernetes --prefix "${prefix}" "${schema}"

  tar -zcvf ${out_version}-standalone.tar.gz ${out_version}-standalone
  mv *.tar.gz $schemas_path/
  rm -rf ${out_version}*
done
cd -
