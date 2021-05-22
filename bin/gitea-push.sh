#!/usr/bin/env bash

. bin/common.sh
[ -n "$CI" ] && exit 1

run_crypt

readonly gitea_enabled=$(yqr charts.gitea.enabled)
readonly stage=$(yqr charts.cert-manager.stage)
[ "$gitea_enabled" != "true" ] && echo "Gitea is disabled" && exit 0
if [ "$stage" = "staging" ]; then
  function git() {
    command git -c http.sslVerify=false "$@"
  }
fi

readonly cluster_domain=$(yqr dns.domain)
readonly gitea_url="gitea.$cluster_domain"
readonly gitea_password=$(yqr charts.gitea.adminPassword | yqr otomi.adminPassword)
readonly gitea_user='otomi-admin'
readonly gitea_org='otomi'
readonly gitea_repo='values'
cd $ENV_DIR
# Initialize as clean slate
if [ ! -d .git ]; then
  git init
  git checkout -b main
fi

tmp_remote_name=$(git remote -v | grep "$gitea_url" | grep "push" | cut -f1)
remote_name=${tmp_remote_name:-origin}

if [ $(git config remote.$remote_name.url) ] && [ $gitea_url != $(git config remote.$remote_name.url | cut -d@ -f2 | cut -d/ -f1 | cut -d: -f1) ]; then
  read -p "Another origin already exists, do you want to add Gitea as a remote? [y/N]" add_remote
  if [ "${add_remote:-n}" = 'y' ] || [ "${add_remote:-n}" = 'Y' ]; then
    remote_name='otomi-values'
  else
    exit 0
  fi
fi
if [ ! $(git config remote.$remote_name.url) ]; then
  git remote add $remote_name "https://$gitea_user:$gitea_password@$gitea_url/$gitea_org/$gitea_repo.git"
  echo "Added gitea as a remote origin"
  echo "You can push using: \`git push main $remote_name\`"
fi

# Try to pull, if repo is not new, it will get data
git fetch $remote_name main || true
# Which will show how many commits are there.
readonly commit_count=$(git rev-list --count --remotes=$remote_name)

if [ "$commit_count" -eq "0" ]; then
  git config user.name "Otomi Admin"
  git config user.email "otomi-admin@$cluster_domain"
  git add -A

  git commit --no-verify -m "Initial commit of otomi-values"
  git push -u $remote_name main
  echo "Otomi-values has been pushed to gitea"
else
  err "There is already data in gitea, manual intervention necessary"
fi
