#!/usr/bin/env bash
. bin/common.sh
. bin/colors.sh

readonly target_path="$ENV_DIR/.sops.yaml"

declare -A map=(["aws"]="kms" ["azure"]="azure_keyvault" ["google"]="gcp_kms" ["vault"]="hc_vault_transit_uri")

readonly provider=$(yqr kms.sops.provider)
readonly template_path="$PWD/tpl/.sops.yaml"
readonly kmsProvider="${map[$provider]}"
readonly kmsKeys=$(yqr kms.sops.$provider.keys)

echo "Creating sops file for provider $provider"
function create_from_template() {
  printf "${COLOR_LIGHT_PURPLE}Creating $target_path ${COLOR_NC}\n"
  local target=$target_path
  [ "${DRY_RUN-'false'}" = 'false' ] && target="/dev/stdout"
  cat "$template_path" | sed \
    -e "s@__PROVIDER@${kmsProvider}@g" \
    -e "s@__KEYS@${kmsKeys}@g" \
    >$target
}
create_from_template

echo "Creating and sourcing sops env file for vscode"
set -o pipefail
hf -f helmfile.tpl/helmfile-sops.yaml template | yq d - 'metadata' | yq r -j - | jq -r "with_entries( select( .value != null ) ) | to_entries|map(\"export \(.key)='\(.value|tostring)'\")|.[]" >$ENV_DIR/.sops-creds.env
source $ENV_DIR/.sops-creds.env

if [ "$kmsProvider" = "google" ]; then
  # we create gcp-key.json with the google creds for the vscode SOPS plugin,
  # which has been configured to also read credentials from that file
  echo "Also creating gcp-key.json for vscode"
  accountJson=$(yqr kms.sops.google.accountJson)
  cat $accountJson >$ENV_DIR/gcp-key.json
fi
