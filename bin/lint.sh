#!/usr/bin/env bash

# checks current context for kuberntes version to check against
# example:~$ otomi lint

set -e
tmp_validation_dir=/tmp/kubeval-fixtures
exitcode=1
hf="helmfile -e $CLOUD-$CLUSTER"
ENV_DIR=${ENV_DIR:-$PWD}

. bin/common.sh

declare -a allowed_versions=(
    v1.16.0
    v1.17.0
    v1.18.0
)

function crd2jsonschema() {
    set -e
    local xkgroup="x-kubernetes-group-version-kind"
    local document="$1"
    local openAPIV3Schema=$(mktemp -u)
    local baseSchema=$(mktemp -u)
    local jsonSchema=$(mktemp -u)
    # clean on exit
    trap 'rm -f -- "$baseSchema" "$openAPIV3Schema" "$jsonSchema"' INT TERM HUP ERR EXIT

    # extract openapi schema from crd
    yq r -j $document 'spec.validation.openAPIV3Schema' >$openAPIV3Schema

    # check if openAPIV3Schema
    if [[ -n $(jq -r .properties $openAPIV3Schema) ]]; then

        # create initial schema file
        cat <<'EOF' >$baseSchema
"$schema": "http://json-schema.org/draft/2019-09/schema#"
type: object
EOF

        # add canonical properties to schema
        yq w $baseSchema 'title' $(yq r $document 'metadata.name') |
            yq w - --tag='!!map' 'properties' |
            yq w - "${xkgroup}.group" $(yq r $document 'spec.group') |
            yq w - "${xkgroup}.kind" $(yq r $document 'spec.names.kind') |
            yq w -j - "${xkgroup}.version" $(yq r $document 'spec.version') >$jsonSchema

        # merge files into expected openapi jsonschema
        echo "$(cat $jsonSchema) $(cat $openAPIV3Schema)" | jq -S -n '[inputs]| add'
    fi

}

cleanup() {
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    rm -rf $tmp_validation_dir
    exit $exitcode
}
trap cleanup EXIT

generate_manifests() {
    echo "Generating Manifests in tmp location."
    # using OUTPUT-DIR parameter because kubeval is not accepting multiple resources per file
    $hf --quiet template --skip-deps --output-dir=$tmp_validation_dir >/dev/null
}

validate_resources() {
    local version=$1
    generate_manifests
    echo "Validating Otomi Stack against Kubernetes Version: $version"
    kubeval --force-color -d $tmp_validation_dir --strict --ignore-missing-schemas --kubernetes-version $version && exitcode=0
}

version_allowed() {
    for e in "${allowed_versions[@]}"; do [[ "$e" == "$1" ]] && exit 0; done
    exit 1
}

validate_versions() {
    local version=$1
    (
        version_allowed v"$version"
    ) && echo "Version $version allowed" && exit 0 || echo "Version $version Not Found" && exit 1

}

version="$(otomi_cluster_info k8sVersion).0"
(validate_versions $version) && (validate_resources $version)
