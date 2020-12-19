#!/bin/bash -xe

# This script uses openapi2jsonschema to generate a set of JSON schemas for
# the specified Kubernetes versions in different flavours:
#
#   X.Y.Z - URL referenced based on the specified GitHub repository
#   X.Y.Z-standalone - de-referenced schemas, more useful as standalone documents
#   X.Y.Z-standalone-strict - de-referenced schemas, more useful as standalone documents, additionalProperties disallowe
#   X.Y.Z-local - relative references, useful to avoid the network dependency

declare -a arr=(
  v1.19.6
  v1.18.14
  v1.17.16
)

for version in "${arr[@]}"; do
  schema=https://raw.githubusercontent.com/kubernetes/kubernetes/${version}/api/openapi-spec/swagger.json
  prefix=https://kubernetesjsonschema.dev/${version}/_definitions.json
  out_version="schemas/${version%.*}"

  # openapi2jsonschema -o "${out_version}-standalone-strict" --expanded --kubernetes --stand-alone --strict "${schema}"
  openapi2jsonschema -o "${out_version}-standalone" --expanded --kubernetes --stand-alone "${schema}"
  # openapi2jsonschema -o "${out_version}-local" --expanded --kubernetes "${schema}"
  # openapi2jsonschema -o "${out_version}" --expanded --kubernetes --prefix "${prefix}" "${schema}"
  # openapi2jsonschema -o "${out_version}-standalone-strict" --kubernetes --stand-alone --strict "${schema}"
  openapi2jsonschema -o "${out_version}-standalone" --kubernetes --stand-alone "${schema}"
  # openapi2jsonschema -o "${out_version}-local" --kubernetes "${schema}"
  # openapi2jsonschema -o "${out_version}" --kubernetes --prefix "${prefix}" "${schema}"

  tar -zcvf ${out_version}-standalone.tar.gz ${out_version}-standalone
  rm -rf ${out_version}-standalone
done
