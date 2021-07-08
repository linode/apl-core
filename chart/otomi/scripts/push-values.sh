. bin/common.sh

# Now that we have our file structure setup we can get the values and construct sops file
bin/gen-sops.sh

# And encrypt in case we have the sops config
[ -f $ENV_DIR/.sops.yaml ] && crypt enc

readonly branch=$(yqr charts.otomi-api.git.branch || echo 'main')
echo $branch

echo 'Pushing the values...'

cd $ENV_DIR
git add -A
git commit --no-verify -m "automated commit of otomi-values"

set +e
git push --set-upstream origin $branch # &>/dev/null
echo 'Done.'
