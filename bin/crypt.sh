#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}
source $ENV_DIR/env.ini
mode=$1
if [ "$mode" != "dec" ] && [ "$mode" != "enc" ]; then
  echo "Invalid mode: $1. Should be one of: dec|enc"
  exit 1
fi

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
  find . -name '*.secrets.yaml' -exec bash -c "helm secrets $mode {}" \;
  cd - >/dev/null
}

printf "${COLOR_LIGHT_PURPLE}${mode}rypting secrets...${COLOR_NC}\n"
auth_${kmsProvider}
crypt

printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
