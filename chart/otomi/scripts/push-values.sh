. bin/common.sh
run_crypt enc

function yqr() {
  local ret=$(cat $OTOMI_VALUES_INPUT | yq r - "$@")
  [ -z "$ret" ] && return 1
  echo $ret
}

readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')

echo 'Pushing the values...'

cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"

set +e
git push --set-upstream origin $branch # &>/dev/null
echo 'Done.'
