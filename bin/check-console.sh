#!/usr/bin/env bash
set -e
ENV_DIR=${ENV_DIR:-$PWD/env}
[ ! -d "$ENV_DIR/.git" ] && "$ENV_DIR is not an initialized git repository. Please follow the README and run 'git init' first." >&2 && exit 1
. $ENV_DIR/.secrets
. bin/common.sh

# do some checks to see if the repo contains all needed values
settings="$ENV_DIR/env/settings.yaml"
settings_secrets="$ENV_DIR/env/secrets.settings.yaml"
api_settings="$ENV_DIR/env/charts/otomi-api.yaml"
api_secrets="$ENV_DIR/env/charts/secrets.otomi-api.yaml"

# decrypt secrets if needed
if [ -f "$ENV_DIR/.sops.yaml" ]; then
  set +e
  helm secrets dec $api_secrets >/dev/null
  helm secrets dec $settings_secrets >/dev/null
  set -e
fi
[ -f "$api_secrets.dec" ] && api_secrets="$api_secrets.dec"
[ -f "$settings_secrets.dec" ] && settings_secrets="$settings_secrets.dec"
repo_url=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.repoUrl')
branch=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.branch')
email=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.email')
user=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.user')
password=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.password')

# all present?
[ "$repo_url" = "" ] || [ "$repo_url" = "github.com/redkubes/otomi-values-demo.git" ] && error="\nrepoUrl: $repo_url "
[ "$email" = "" ] || [ "$email" = "some@secret.value" ] && error="$error\nemail: $email"
[ "$user" = "" ] || [ "$user" = "somesecretvalue" ] && error="$error\nuser: $user"
[ "$password" = "" ] || [ "$password" = "somesecretvalue" ] && error="$error\npassword: $password"
[ "$error" != '' ] && printf "Error: Make sure the git details are correctly added to 'charts/*otomi-api.yaml'. Incorrect values found for git: $error\n" >&2
[ "$err" != '' ] || [ "$error" != '' ] && exit 1

echo "export GIT_REPO_URL=$repo_url" >>/tmp/otomi-env
echo "export GIT_BRANCH=$branch" >>/tmp/otomi-env
echo "export GIT_EMAIL=$email" >>/tmp/otomi-env
echo "export GIT_PASSWORD=$password" >>/tmp/otomi-env
