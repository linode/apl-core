#!/usr/bin/env bash
. bin/common.sh

function yqr_chart() {
  local ret=$(cat $OTOMI_VALUES_INPUT | yq r - "$@")
  [ -z "$ret" ] && return 1
  echo $ret
}

readonly gitea_enabled=$(yqr_chart charts.gitea.enabled || echo 'true')
readonly stage=$(yqr_chart charts.cert-manager.stage || echo 'production')
readonly cluster_domain=$(yqr_chart cluster.domainSuffix)

if [ "$stage" = "staging" ]; then
  export GIT_SSL_NO_VERIFY=true
fi

# only for devving, since this chart starts with an empty ENV_DIR anyway:
rm -rf $ENV_DIR/.git
rm -rf $ENV_DIR/.vscode
rm -rf $ENV_DIR/*

# init git setup pointing to repo
pushd $ENV_DIR
git init
byor=false
yqr_chart charts.otomi-api.git && byor=true

if [ "$gitea_enabled" != "true" ] && ! $byor; then
  echo "Gitea was disabled but no charts.otomi-api.git config was given."
  exit 1
fi
if [ "$gitea_enabled" != "true" ]; then
  echo "Gitea is disabled. Using external git provider from config."
  readonly username=$(yqr_chart charts.otomi-api.git.user)
  readonly password=$(yqr_chart charts.otomi-api.git.password)
  readonly email=$(yqr_chart charts.otomi-api.git.email || echo "otomi-admin@$cluster_domain")
  readonly repo_url=$(yqr_chart charts.otomi-api.git.repoUrl)
  readonly branch=$(yqr_chart charts.otomi-api.git.branch || echo 'main')
  git config user.name "$username"
  git config user.password "$password"
  git config user.email "$email"
  git remote add origin $repo_url
else
  echo "Gitea is enabled."
  readonly gitea_url="gitea.$cluster_domain"
  readonly gitea_password=$(yqr_chart charts.gitea.adminPassword || yqr_chart otomi.adminPassword)
  readonly gitea_user='otomi-admin'
  readonly gitea_org='otomi'
  readonly gitea_repo='values'
  readonly branch='main'
  git config user.name 'Otomi Admin'
  git config user.email "otomi-admin@$cluster_domain"
  git remote add origin "https://$gitea_user:$gitea_password@$gitea_url/$gitea_org/$gitea_repo.git"
  echo 'Added gitea as a remote origin'
fi

echo 'Trying to do a git pull...'
set +e
git checkout -b $branch #&>/dev/null
git pull origin $branch #&>/dev/null
set -e
popd

bin/bootstrap.sh

crypt dec

# lastly copy the schema file
cp values-schema.yaml $ENV_DIR/

chmod a+w -R $ENV_DIR/env || exit 0
