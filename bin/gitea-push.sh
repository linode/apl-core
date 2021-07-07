#!/usr/bin/env bash
. bin/common.sh

run_crypt

readonly gitea_enabled=$(yqr charts.gitea.enabled)
readonly stage=$(yqr charts.cert-manager.stage || echo 'production')
[ "$gitea_enabled" != "true" ] && echo "Gitea is disabled" && exit 0
if [ "$stage" = "staging" ]; then
  function git() {
    command git -c http.sslVerify=false "$@"
  }
fi

readonly cluster_domain=$(yqr cluster.domainSuffix)
readonly gitea_url="gitea.$cluster_domain"
readonly gitea_password=$(yqr charts.gitea.adminPassword || yqr otomi.adminPassword)
readonly gitea_user='otomi-admin'
readonly gitea_org='otomi'
readonly gitea_repo='values'
cd $ENV_DIR
# Initialize as clean slate
git_found=true
if [ ! -d .git ]; then
  git init
  git checkout -b main
fi

git config user.name "Otomi Admin"
git config user.email "otomi-admin@$cluster_domain"

if [ ! $(git config remote.origin.url) ]; then
  git remote add origin "https://$gitea_user:$gitea_password@$gitea_url/$gitea_org/$gitea_repo.git"
  echo "Added gitea as a remote origin"
  echo "You can push using: \`git push main origin\`"
fi

# Try to fetch to see if repo exists
if ! git fetch origin main >/dev/null; then
  # no, commit new values
  set +e
  git add -A
  git commit --no-verify -m "automated commit of otomi-values"
  git push -u origin main -f
  git branch --set-upstream-to=origin/main main
  set -e
  echo "Otomi-values has been pushed to gitea"
else
  echo "There is already data in gitea."
fi
