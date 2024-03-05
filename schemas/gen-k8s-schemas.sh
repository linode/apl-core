#!/usr/bin/env bash
set -ex

# This script uses openapi2jsonschema to generate a set of JSON schemas for
# the specified Kubernetes versions in different flavours:
#
#   X.Y.Z - URL referenced based on the specified GitHub repository
#   X.Y.Z-standalone - de-referenced schemas, more useful as standalone documents
#   X.Y.Z-standalone-strict - de-referenced schemas, more useful as standalone documents, additionalProperties disallowed
#   X.Y.Z-local - relative references, useful to avoid the network dependency

declare -a K8S_VERSIONS=(
  v1.28.3
  v1.27.4
  v1.26.7
  v1.25.8
  v1.24.12
  v1.23.17
  v1.22.17
  v1.21.13
)

pushd schemas

# OPENAPI2JSONSCHEMABIN="docker run -i -v ${PWD}:/out/schemas ghcr.io/yannh/openapi2jsonschema:latest"
OPENAPI2JSONSCHEMABIN="openapi2jsonschema"

if [ -n "${K8S_VERSION_PREFIX}" ]; then
  export K8S_VERSIONS=$(git ls-remote --refs --tags https://github.com/kubernetes/kubernetes.git | cut -d/ -f3 | grep -e '^'"${K8S_VERSION_PREFIX}" | grep -e '^v1\.[0-9]\{2\}\.[0-9]\{1,2\}$')
fi

for K8S_VERSION in "${K8S_VERSIONS[@]}"; do
  OUT_VERSION=${K8S_VERSION%.*}
  SCHEMA=https://raw.githubusercontent.com/kubernetes/kubernetes/${K8S_VERSION}/api/openapi-spec/swagger.json
  # PREFIX=https://kubernetesjsonschema.dev/${K8S_VERSION}/_definitions.json

  # if [ ! -f "${OUT_VERSION}-standalone-strict.tar.gz" ]; then
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-standalone-strict" --expanded --kubernetes --stand-alone --strict "${SCHEMA}"
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-standalone-strict" --kubernetes --stand-alone --strict "${SCHEMA}"
  #   tar -zcvf ${OUT_VERSION}-standalone-strict.tar.gz ${OUT_VERSION}-standalone-strict
  #   rm -rf ${OUT_VERSION}-standalone-strict
  # fi

  if [ ! -f "${OUT_VERSION}-standalone.tar.gz" ]; then
    $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-standalone" --expanded --kubernetes --stand-alone "${SCHEMA}"
    $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-standalone" --kubernetes --stand-alone "${SCHEMA}"
    tar -zcvf "${OUT_VERSION}"-standalone.tar.gz "${OUT_VERSION}"-standalone
    rm -rf "${OUT_VERSION}"-standalone
  fi

  # if [ ! -f "${OUT_VERSION}-local.tar.gz" ]; then
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-local" --expanded --kubernetes "${SCHEMA}"
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}-local" --kubernetes "${SCHEMA}"
  #   tar -zcvf ${OUT_VERSION}-local.tar.gz ${OUT_VERSION}-local
  #   rm -rf ${OUT_VERSION}-local
  # fi

  # if [ ! -f "${OUT_VERSION}.tar.gz" ]; then
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}" --expanded --kubernetes --prefix "${PREFIX}" "${SCHEMA}"
  #   $OPENAPI2JSONSCHEMABIN -o "${OUT_VERSION}" --kubernetes --prefix "${PREFIX}" "${SCHEMA}"
  #   tar -zcvf ${OUT_VERSION}.tar.gz ${OUT_VERSION}
  #   rm -rf ${OUT_VERSION}
  # fi

done

popd
