#!/bin/bash

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
