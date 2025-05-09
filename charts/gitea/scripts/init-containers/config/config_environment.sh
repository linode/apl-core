#!/usr/bin/env bash
set -euo pipefail

function env2ini::log() {
  printf "${1}\n"
}

function env2ini::read_config_to_env() {
  local section="${1}"
  local line="${2}"

  if [[ -z "${line}" ]]; then
    # skip empty line
    return
  fi

  # 'xargs echo -n' trims all leading/trailing whitespaces and a trailing new line
  local setting="$(awk -F '=' '{print $1}' <<< "${line}" | xargs echo -n)"

  if [[ -z "${setting}" ]]; then
    env2ini::log '  ! invalid setting'
    exit 1
  fi

  local value=''
  local regex="^${setting}(\s*)=(\s*)(.*)"
  if [[ $line =~ $regex ]]; then
    value="${BASH_REMATCH[3]}"
  else
    env2ini::log '  ! invalid setting'
    exit 1
  fi

  env2ini::log "    + '${setting}'"

  if [[ -z "${section}" ]]; then
    export "GITEA____${setting^^}=${value}"                           # '^^' makes the variable content uppercase
    return
  fi

  local masked_section="${section//./_0X2E_}"                            # '//' instructs to replace all matches
  masked_section="${masked_section//-/_0X2D_}"

  export "GITEA__${masked_section^^}__${setting^^}=${value}"        # '^^' makes the variable content uppercase
}

function env2ini::reload_preset_envs() {
  env2ini::log "Reloading preset envs..."

  while read -r line; do
    if [[ -z "${line}" ]]; then
      # skip empty line
      return
    fi

    # 'xargs echo -n' trims all leading/trailing whitespaces and a trailing new line
    local setting="$(awk -F '=' '{print $1}' <<< "${line}" | xargs echo -n)"

    if [[ -z "${setting}" ]]; then
      env2ini::log '  ! invalid setting'
      exit 1
    fi

    local value=''
    local regex="^${setting}(\s*)=(\s*)(.*)"
    if [[ $line =~ $regex ]]; then
      value="${BASH_REMATCH[3]}"
    else
      env2ini::log '  ! invalid setting'
      exit 1
    fi

    env2ini::log "  + '${setting}'"

    export "${setting^^}=${value}"                           # '^^' makes the variable content uppercase
  done < "$TMP_EXISTING_ENVS_FILE"

  rm $TMP_EXISTING_ENVS_FILE
}


function env2ini::process_config_file() {
  local config_file="${1}"
  local section="$(basename "${config_file}")"

  if [[ $section == '_generals_' ]]; then
    env2ini::log "  [ini root]"
    section=''
  else
    env2ini::log "  ${section}"
  fi

  while read -r line; do
    env2ini::read_config_to_env "${section}" "${line}"
  done < <(awk 1 "${config_file}")                             # Helm .toYaml trims the trailing new line which breaks line processing; awk 1 ... adds it back while reading
}

function env2ini::load_config_sources() {
  local path="${1}"

  if [[ -d "${path}" ]]; then
    env2ini::log "Processing $(basename "${path}")..."

    while read -d '' configFile; do
      env2ini::process_config_file "${configFile}"
    done < <(find "${path}" -type l -not -name '..data' -print0)

    env2ini::log "\n"
  fi
}

function env2ini::generate_initial_secrets() {
  # These environment variables will either be
  #   - overwritten with user defined values,
  #   - initially used to set up Gitea
  # Anyway, they won't harm existing app.ini files

  export GITEA__SECURITY__INTERNAL_TOKEN=$(gitea generate secret INTERNAL_TOKEN)
  export GITEA__SECURITY__SECRET_KEY=$(gitea generate secret SECRET_KEY)
  export GITEA__OAUTH2__JWT_SECRET=$(gitea generate secret JWT_SECRET)
  export GITEA__SERVER__LFS_JWT_SECRET=$(gitea generate secret LFS_JWT_SECRET)

  env2ini::log "...Initial secrets generated\n"
}

# save existing envs prior to script execution. Necessary to keep order of preexisting and custom envs
env | (grep -e '^GITEA__' || [[ $? == 1 ]]) > $TMP_EXISTING_ENVS_FILE

# MUST BE CALLED BEFORE OTHER CONFIGURATION
env2ini::generate_initial_secrets

env2ini::load_config_sources "$ENV_TO_INI_MOUNT_POINT/inlines/"
env2ini::load_config_sources "$ENV_TO_INI_MOUNT_POINT/additionals/"

# load existing envs to override auto generated envs
env2ini::reload_preset_envs

env2ini::log "=== All configuration sources loaded ===\n"

# safety to prevent rewrite of secret keys if an app.ini already exists
if [ -f ${GITEA_APP_INI} ]; then
  env2ini::log 'An app.ini file already exists. To prevent overwriting secret keys, these settings are dropped and remain unchanged:'
  env2ini::log '  - security.INTERNAL_TOKEN'
  env2ini::log '  - security.SECRET_KEY'
  env2ini::log '  - oauth2.JWT_SECRET'
  env2ini::log '  - server.LFS_JWT_SECRET'

  unset GITEA__SECURITY__INTERNAL_TOKEN
  unset GITEA__SECURITY__SECRET_KEY
  unset GITEA__OAUTH2__JWT_SECRET
  unset GITEA__SERVER__LFS_JWT_SECRET
fi

environment-to-ini -o $GITEA_APP_INI
