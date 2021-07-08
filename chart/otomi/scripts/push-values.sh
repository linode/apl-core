. bin/common.sh
run_crypt enc

pwd
ls -ahls

readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')
echo $branch

echo 'Pushing the values...'

cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"

set +e
git push --set-upstream origin $branch # &>/dev/null
echo 'Done.'
