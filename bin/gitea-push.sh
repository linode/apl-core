#!/usr/bin/env bash

. bin/common.sh

set -eo pipefail
prepare_crypt
readonly values=$(hf_values)
readonly gitea_url=$(echo "$values" | yq r - 'cluster.domain')
readonly gitea_password=$(echo "$values" | yq r - 'charts.gitea.admin.password')
readonly gitea_user='otomi'
readonly gitea_repo='values'

readonly remote_name='gitea'

if [ ! -d $ENV_DIR/.git ]; then
  git -C $ENV_DIR init
fi


if ! git -C $ENV_DIR config remote.$remote_name.url > /dev/null; then
    git -C $ENV_DIR remote add $remote_name "https://$gitea_user:$gitea_password@gitea.$gitea_url/$gitea_user/$gitea_repo.git"
fi
readonly commit_count=$(git -C $ENV_DIR rev-list --count --remotes=$remote_name)

if [ $commit_count -eq 0 ]; then
    git -C $ENV_DIR config user.name "Otomi"
    git -C $ENV_DIR config user.email "otomi@$gitea_url"
    git -C $ENV_DIR add -A
    
    set +e
    readonly currentOrigin=$(git -C $ENV_DIR for-each-ref --format='%(upstream:short)' $(git -C $ENV_DIR symbolic-ref -q HEAD)|cut -d/ -f1)
    git -C $ENV_DIR push -u $remote_name master

    readonly uncommited=$(git diff --cached --numstat | wc -l)
    if [ $uncommited -ne 0 ]; then
      git -C $ENV_DIR commit --no-verify -m "Initial commit of otomi-values"
      git -C $ENV_DIR push -u $remote_name master
    fi
    git -C $ENV_DIR branch -u $currentOrigin
fi
