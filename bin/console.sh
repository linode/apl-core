#!/usr/bin/env bash
set -e
[ "$1" != "" ] && docker-compose down --remove-orphans && exit
[ "$ENV_DIR" == "" ] && [ "$(basename "$PWD")" == "otomi-core" ] && echo "ENV_DIR not known!" && exit 1
ENV_DIR=${ENV_DIR:-$PWD}
. $ENV_DIR/.secrets
[ "$OTOMI_PULLSECRET" == "" ] && echo "OTOMI_PULLSECRET not given!" && exit 1
[ ! -d "$ENV_DIR/.git" ] && "$ENV_DIR is not an initialized git repository. Please follow the README and run 'git init' first." && exit 1

# do a check to see if the repo contains new correct values for the api to work with
api_settings="$ENV_DIR/env/charts/otomi-api.yaml"
api_secrets="$ENV_DIR/env/charts/secrets.otomi-api.yaml"
helm secrets dec $api_secrets >/dev/null
[ -f "$api_secrets.dec" ] && api_secrets="$api_secrets.dec"
api_git="$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api]')"
repo_url=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.repoUrl')
email=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.email')
user=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.user')
password=$(yq m $api_secrets $api_settings | yq r - 'charts[otomi-api].git.password')
[ "$repo_url" == "" ] || [ "$repo_url" == "github.com/redkubes/otomi-values-demo.git" ] && error="$error repoUrl=$repo_url "
[ "$email" == "" ] || [ "$email" == "some@secret.value" ] && error="$error email=$email "
[ "$user" == "" ] || [ "$user" == "somesecretvalue" ] && error="$error user=$user "
[ "$password" == "" ] || [ "$password" == "somesecretvalue" ] && error="$error password=$password "
[ "$error" != "" ] && echo "Make sure the git details are correctly added to 'charts/*otomi-api.yaml'. Incorrect values found for git: $error" && exit 1

# try to login with the pull secret
repo="eu.gcr.io"
pass=$(echo $OTOMI_PULLSECRET | base64 -d | jq '.auths["eu.gcr.io"].password|fromjson')
docker login -u _json_key -p "$pass" $repo

# start console with docker compose
docker-compose up -d
sleep 7
echo "Starting Otomi Console at http://127.0.0.1:3000"
open "http://127.0.0.1:3000"
