#!/usr/bin/env bash
. bin/common.sh

readonly gitea_enabled=$(yqr charts.gitea.enabled || echo 'true')
readonly stage=$(yqr charts.cert-manager.stage || echo 'production')
readonly cluster_domain=$(yqr cluster.domainSuffix)

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
yqr charts.otomi-api.git && byor=true

if [ "$gitea_enabled" != "true" ] && ! $byor; then
  echo "Gitea was disabled but no charts.otomi-api.git config was given."
  exit 1
fi
if [ "$gitea_enabled" != "true" ]; then
  echo "Gitea is disabled. Using external git provider from config."
  readonly username=$(yqr charts.otomi-api.git.user)
  readonly password=$(yqr charts.otomi-api.git.password)
  readonly email=$(yqr charts.otomi-api.git.email || echo "otomi-admin@$cluster_domain")
  readonly repo_url=$(yqr charts.otomi-api.git.repoUrl)
  readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')
  git config user.name "$username"
  git config user.password "$password"
  git config user.email "$email"
  git remote add origin $repo_url
  git checkout -b $branch &>/dev/null
else
  echo "Gitea is enabled."
  readonly gitea_url="gitea.$cluster_domain"
  readonly gitea_password=$(yqr charts.gitea.adminPassword || yqr otomi.adminPassword)
  readonly gitea_user='otomi-admin'
  readonly gitea_org='otomi'
  readonly gitea_repo='values'
  git config user.name 'Otomi Admin'
  git config user.email "otomi-admin@$cluster_domain"
  echo "remote url:"
  git remote add origin "https://$gitea_user:$gitea_password@$gitea_url/$gitea_org/$gitea_repo.git"
  echo 'Added gitea as a remote origin'
  git checkout -b main &>/dev/null
fi

echo 'Trying to do a git pull...'
set +e
git pull &>/dev/null
set -e
popd

bin/bootstrap.sh

run_crypt dec

found=$(find $ENV_DIR -type f -name 'secrets.*.yaml.dec')

if [ "$found" == "" ]; then
  # no decryptable files found, so encrypt and decrypt
  run_crypt enc
  run_crypt dec
fi

# lastly copy the schema file
cp values-schema.yaml $ENV_DIR/
