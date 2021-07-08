. bin/common.sh
run_crypt enc

readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')

echo 'Pushing the values...'

cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"

set +e
git push --set-upstream origin $branch # &>/dev/null
echo 'Done.'
