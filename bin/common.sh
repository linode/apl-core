#!/bin/bash

function otomi_cluster() {
  local clusters_file="$ENV_DIR/env/clusters.yaml"
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
  cat $ENV_DIR/env/settings.yaml | yq r - $1
}

function get_otomi_version() {
  otomi_cluster_info "otomiVersion"
}

function otomi_image_tag() {
  [[ ("$CLOUD" == "" || "$CLUSTER" == "") ]] && echo 'latest' && exit
  if [[ -n $(get_otomi_version) ]]; then
    get_otomi_version
  else
    echo 'latest'
  fi
}

function customer_name() {
  otomi_settings "customer.name"
}

function get_receiver() {
  prepare_crypt
  file=$ENV_DIR/env/settings.yaml
  file_secrets=$ENV_DIR/env/secrets.settings.yaml
  if [ ! -f "$file_secrets.dec" ]; then
    set +e
    helm secrets dec $file_secrets >/dev/null
    set -e
  fi
  receiver=$(cat $file | yq r - alerts.receiver)
  [ "$receiver" == "" ] && receiver=$(cat $file_secrets.dec | yq r - alerts.receiver)
  [ "$receiver" == "" ] && exit 1
  if [ "$1" != "" ]; then
    val=$(cat $file_secrets.dec | yq r - alerts.$receiver.$@)
    [ "$val" == "" ] && exit 1
    echo $val
  else
    echo $receiver
  fi
}

function prepare_crypt() {
  [ "$GCLOUD_SERVICE_KEY" == "" ] && exit 1
  GOOGLE_APPLICATION_CREDENTIALS="/tmp/key.json"
  echo $GCLOUD_SERVICE_KEY >$GOOGLE_APPLICATION_CREDENTIALS
  export GOOGLE_APPLICATION_CREDENTIALS
}
