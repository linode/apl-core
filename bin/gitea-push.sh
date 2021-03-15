#!/usr/bin/env bash

. bin/common.sh
[ -n "$CI" ] && exit 1
set -eo pipefail
prepare_crypt
readonly values=$(hf_values)
readonly gitea_enabled=$(echo "$values" | yq r - 'charts.gitea.enabled')
[ "$gitea_enabled" != "true" ] && err "Gitea is disabled" && exit 0

readonly cluster_domain=$(echo "$values" | yq r - 'cluster.domain')
readonly gitea_url="gitea.$cluster_domain"
readonly gitea_password=$(echo "$values" | yq r - 'charts.gitea.admin.password')
readonly gitea_user='otomi'
readonly gitea_repo='values'
readonly remote_name='origin'

cd $ENV_DIR

# Initialize as clean slate
if [ ! -d .git ]; then
  git init
fi
# Check if gitea is origin, otherwise stop
if [ $(git config remote.$remote_name.url) ] && [ $gitea_url != $(git config remote.$remote_name.url | cut -d@ -f2 | cut -d/ -f1 | cut -d: -f1) ]; then
  err "Another origin already exists, not using gitea"
  exit 0
else
  git remote add $remote_name "https://$gitea_user:$gitea_password@$gitea_url/$gitea_user/$gitea_repo.git"
  echo "Added gitea as a remote origin"
fi

# Try to pull, if repo is not new, it will get data
git fetch $remote_name master || true
# Which will show how many commits are there.
readonly commit_count=$(git rev-list --count --remotes=$remote_name)

if [ "$commit_count" -eq "0" ]; then
    git config user.name "Otomi"
    git config user.email "otomi@$cluster_domain"
    git add -A

    git commit --no-verify -m "Initial commit of otomi-values"
    git push -u $remote_name master
    echo "Otomi-values has been pushed to gitea"
else
  err "There is already data in gitea, manual intervention necessary"
fi
