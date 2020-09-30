#!/bin/bash

function otomi_cluster() {
    local clusters_file="$ENV_DIR/clusters.yaml"
    echo "$CLOUD $CLUSTER"
    if [[ -f $clusters_file && (! -z "$CLOUD" || -z "$CLUSTER") ]]; then
        cat $clusters_file | yq r - clouds.$CLOUD.clusters.$CLUSTER
    else
        exit 1
    fi
}

function otomi_cluster_info() {
    subpath="${@:1}"
    otomi_cluster | yq r - $subpath
}

function otomi_settings() {
    cat $ENV_DIR/settings.yaml | yq r - $1
}

function get_otomi_version() {
    otomi_cluster_info "otomiVersion"
}

function get_customer_name() {
    otomi_settings "customer.name"
}

function get_otomi_image_tag() {
    if [[ -n $(get_otomi_version) ]]; then
        echo "v$(get_otomi_version)"
    else
        echo 'latest'
    fi
}
