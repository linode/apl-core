#!/usr/bin/env bash
. bin/common.sh
. bin/colors.sh

readonly target_path="$ENV_DIR/.sops.yaml"
[ -f $target_path ] && exit

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
