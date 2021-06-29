#!/usr/bin/env bash
. bin/common.sh
. bin/colors.sh

readonly target_path="$ENV_DIR/.sops.yaml"

declare -A map=(["aws"]="kms" ["azure"]="azure_keyvault" ["google"]="gcp_kms" ["vault"]="hc_vault_transit_uri")

readonly provider=$(yqr kms.sops.provider)
[ "$provider" = '' ] && echo "No sops information given. Assuming no sops enc/decryption needed." && exit

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

if [ -z "$CI" ]; then
  # we know we are in dev/ops mode and need to read the credentials for SOPS. We provide a location to
  # provide those to this context: $ENV_DIR/.secrets (gitignored)
  [ ! -f $ENV_DIR/.secrets ] && err "Expecting $ENV_DIR/.secrets to exist and hold credentials for SOPS." && exit 1
  . $ENV_DIR/.secrets
  if [ "$provider" = "google" ]; then
    # we create gcp-key.json with the google creds for the vscode SOPS plugin,
    # which has been configured to also read credentials from that file
    echo "Creating gcp-key.json for vscode."
    echo $GCLOUD_SERVICE_KEY >$ENV_DIR/gcp-key.json
  fi
fi
