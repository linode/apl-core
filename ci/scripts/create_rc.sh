#!/bin/bash
set -euo pipefail

# This script creates a release candidate tag for a given commit.
# Input:
# - COMMIT_SHA: The commit SHA to create the release candidate tag for.
# - DRY_RUN: If set to true, the script will not create the tag, but will print the commands that would be executed.
# - GITHUB_TOKEN: The GitHub token to use for authentication.
# - BOT_EMAIL: The email address to use for the git commit.
# - BOT_USERNAME: The username to use for the git commit.

# Validate required environment variables
: "${COMMIT_SHA:?COMMIT_SHA is required}"
: "${BOT_EMAIL:?BOT_EMAIL is required}"
: "${BOT_USERNAME:?BOT_USERNAME is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

# Configure Git
echo "Configuring Git..."
git config --global user.email "$BOT_EMAIL"
git config --global user.name "$BOT_USERNAME"

# Reset to the specified commit
echo "Resetting to commit $COMMIT_SHA..."
git reset --hard "$COMMIT_SHA"

# Determine the next version
echo "Determining the next version..."
npm run release -- --skip.commit --skip.tag --skip.changelog
new_version=$(jq -r '.version' package.json)
branch_name="rc/v${new_version%.*}"
release_branch_name="${branch_name//rc/release}"
echo "$branch_name" >> rc_branch_name.txt
git reset --hard "$COMMIT_SHA"

echo "Creating branch $branch_name..."
git checkout -b "$branch_name"

# Dry run or actual execution
if [ "$DRY_RUN" == "true" ]; then
    echo -e "Running in dry run mode. No changes will be pushed."
    npm run release -- --prerelease rc --skip.changelog
else
    npm run release -- --prerelease rc --skip.changelog
    git push -u origin "$branch_name" --follow-tags
    git fetch --tags origin
    echo "Creating GitHub release..."
    gh release create "$new_version" --verify-tag --title="Release Candidate: $new_version" --notes="Automated release for $new_version" --latest=false -p
fi

echo "Script completed successfully."