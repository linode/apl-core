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

cd $ENV_DIR

# Restore backup to original state.
function gitea_push_cleanup() {
  if [ -d .gitbak ]; then
    rm -rf .git/
    mv .gitbak .git
  fi
  # If gitea remote is not yet set, set it
  if ! git config remote.$remote_name.url > /dev/null; then
    git remote add $remote_name "https://$gitea_user:$gitea_password@gitea.$gitea_url/$gitea_user/$gitea_repo.git"
    git pull $remote_name master || true
  fi
}

exitcode=0
function gitea_push_exit_handler() {
  local x=$?
  [ $x -ne 0 ] && exitcode=$x
  [ $exitcode -eq 0 ] && echo "Gitea Push SUCCESS" || err "Gitea Push FAILED"
  cleanup
  gitea_push_cleanup
  trap "exit $exitcode" EXIT ERR
  exit $exitcode
}
trap gitea_push_exit_handler EXIT ERR

# If git folder exists, back it up
if [ -d .git ]; then
  mv .git .gitbak
fi
# Initialize as clean slate
git init
set -x
git remote add $remote_name "https://$gitea_user:$gitea_password@gitea.$gitea_url/$gitea_user/$gitea_repo.git"
# Try to pull, if repo is not new, it will get data
git fetch $remote_name master || true
# Which will show how many commits are there.
readonly commit_count=$(git rev-list --count --remotes=$remote_name)

if [ "$commit_count" -eq "0" ]; then
    git config user.name "Otomi"
    git config user.email "otomi@$gitea_url"
    git add -- . ':!.gitbak'

    git commit --no-verify -m "Initial commit of otomi-values"
    git push -u $remote_name master
fi
# If there are some uncommited files (because of changes), commit these.
readonly uncommited=$(git diff --numstat gitea/master -- ':!.gitbak' | wc -l)
if [ "$uncommited" -ne "0" ]; then
  git add -- . ':!.gitbak'
  git commit --no-verify -m "Commit #${commit_count} commit of otomi-values"
  git push -u $remote_name master
fi
