#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh
set -e

source $ENV_DIR/env.ini
ENV_DIR=${ENV_DIR:-./env}
mode=dec
[ "$1" != "" ] && mode=enc
# .kms-dec should of course not exist in value repo but is used for otomi demo
[ -f $ENV_DIR/.kms-${mode}.json ] && GCLOUD_SERVICE_KEY=$(cat $ENV_DIR/.kms-${mode}.json)

auth_google() {
  echo "Authenticating with Google KMS with: GCLOUD_SERVICE_KEY > GOOGLE_APPLICATION_CREDENTIALS"
  echo "$GCLOUD_SERVICE_KEY" >/tmp/gcloud-service-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud-service-key.json
}

auth_aws() {
  echo "Authenticating with Amazon KMS with: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
}

auth_azure() {
  echo "Authenticating with Azure Key Vault with: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
}

crypt() {
  cd $ENV_DIR >/dev/null
  find ./env -name '*.yaml' -exec bash -c "h secrets $mode {}" \;
  cd - >/dev/null
}

# access to functions needed in child processes:
export -f h

printf "${COLOR_LIGHT_PURPLE}${mode}rypting secrets...${COLOR_NC}\n"
auth_${kmsProvider}
crypt

printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
