. bin/common.sh
run_crypt enc

echo 'Pushing the values...'

cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"
git push
