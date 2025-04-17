# This script creates a release candidate tag for commit set as COMMIT_SHA env var.
# Input:
# - COMMIT_SHA: The commit SHA to create the release candidate tag for.
# - DRY_RUN: If set to true, the script will not create the tag, but will print the commands that would be executed.
# - GITHUB_TOKEN: The GitHub token to use for authentication.
# - BOT_EMAIL: The email address to use for the git commit.
# - BOT_USERNAME: The username to use for the git commit.

git config --global user.email $BOT_EMAIL
git config --global user.name $BOT_USERNAME

git reset --hard $COMMIT_SHA

# Use standard-version to determine the next version
npm run release -- --skip.commit --skip.tag --skip.changelog
new_version=$(jq -r '.version' package.json)
branch_name=rc/v${new_version%.*}
echo "$branch_name" >> rc_branch_name.txt
release_branch_name=${branch_name//rc/release}

git reset --hard $COMMIT_SHA

if [ "$DRY_RUN" == "true" ]; then
    echo "Dry run enabled. The following commands would be executed:"
    echo "git checkout -b $branch_name"
    echo "npm run release -- --prerelease rc --skip.changelog --dry-run"
    npm run release -- --prerelease rc --skip.changelog --dry-run
    echo "git push -u origin $branch_name --follow-tags"
else
    git checkout -b $branch_name
    npm run release -- --prerelease rc --skip.changelog
    git push -u origin $branch_name --follow-tags
fi

tag=$(jq -r '.version' package.json)

if [ "$DRY_RUN" == "true" ]; then
    echo "Dry run enabled. The following commands would be executed otherwise:"
    echo gh release create "$tag" --title="Release Candidate: $tag" --notes="Automated release for $tag" --latest=false -p
else
    gh release create "$tag" --title="Release Candidate: $tag" --notes="Automated release for $tag" --latest=false -p
fi