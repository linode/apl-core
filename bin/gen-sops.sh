#!/usr/bin/env bash
. bin/common.sh
. bin/colors.sh

declare -A map=(["aws"]="kms" ["azure"]="azure_keyvault" ["google"]="gcp_kms" ["vault"]="hc_vault_transit_uri")

settings_file=$ENV_DIR/env/settings.yaml
[ -f $settings_file ] && provider=$(cat $settings_file | yq r - kms.sops.provider)
[ "$provider" = '' ] && echo "No sops information given. Assuming no sops enc/decryption needed." && exit

readonly template_path="$PWD/tpl/.sops.yaml.gotmpl"
readonly target_path="$ENV_DIR/.sops.yaml"
readonly sops_provider="${map[$provider]}"
readonly keys=$(cat $settings_file | yq r - kms.sops.$provider.keys)

target=$target_path
[ -n "$DRY_RUN" ] && target="/dev/stdout"

printf "${COLOR_LIGHT_PURPLE}Creating sops file for provider $provider${COLOR_NC}\n"
cat "$template_path" | gucci \
  -s provider="$sops_provider" \
  -s keys="$keys" \
  >$target

if [ -z "$CI" ]; then
  # we know we are in dev/ops mode and need to read the credentials for SOPS. We know the location to
  # provide those to this context: $ENV_DIR/.secrets (gitignored)
  [ ! -f $ENV_DIR/.secrets ] && err "Expecting $ENV_DIR/.secrets to exist and hold credentials for SOPS." && exit 1
  . $ENV_DIR/.secrets
fi
if [ "$provider" = "google" ]; then
  # we create gcp-key.json with the google creds for the vscode SOPS plugin,
  # which has been configured to also read credentials from that file
  echo "Creating gcp-key.json for vscode."
  echo $GCLOUD_SERVICE_KEY >$ENV_DIR/gcp-key.json
fi
