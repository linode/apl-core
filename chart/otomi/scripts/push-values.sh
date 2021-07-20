. bin/common.sh

# Now that we have our file structure setup we can get the values and construct sops file
bin/gen-sops.sh

# And encrypt in case we have the sops config
[ -f $ENV_DIR/.sops.yaml ] && crypt enc

api_file=$ENV_DIR/env/charts/otomi-api.yaml
branch=$(cat $api_file | yq r - charts.otomi-api.git.branch)
[ -z "$branch" ] && branch='main'
echo $branch

echo 'Pushing the values...'

echo 'ENV_DIR: ' $ENV_DIR
cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"

function yqr_chart() {
  local ret=$(cat $OTOMI_VALUES_INPUT | yq r - "$@")
  [ -z "$ret" ] && return 1
  echo $ret
}

readonly stage=$(yqr_chart charts.cert-manager.stage || echo 'production')
if [ "$stage" = "staging" ]; then
  export GIT_SSL_NO_VERIFY=true
fi

set +e
git push --set-upstream origin $branch # &>/dev/null
echo 'Done.'

find $ENV_DIR/env -name 'secrets.*.yaml.dec' -exec rm {} \;
