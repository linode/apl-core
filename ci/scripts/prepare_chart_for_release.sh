#!/bin/bash
set -euo pipefail

# This script prepares the helm chart for release.
# Input:
# - BOT_EMAIL: The email address to use for the git commit.
# - BOT_USERNAME: The username to use for the git commit.

# Validate required environment variables
: "${BOT_EMAIL:?BOT_EMAIL is required}"
: "${BOT_USERNAME:?BOT_USERNAME is required}"

# Retrieve the app version from package.json
app_version=$(jq -r '.version' package.json)

# Update Chart.yaml and values.yaml with the new app version
sed -i "s/0.0.0-chart-version/$app_version/g" chart/apl/Chart.yaml
sed -i "s/APP_VERSION_PLACEHOLDER/v$app_version/g" chart/apl/Chart.yaml

echo "Chart and values files updated successfully with version $app_version"

# Copy readme from repo into the charts and add tpl/chart-values.md
cp README.md chart/apl/
printf "\n\n" >>chart/apl/README.md
cat tpl/chart-values.md >>chart/apl/README.md

# Generate schema
npx js-yaml values-schema.yaml > chart/apl/values.schema.json

# Set the global id for git as it seems needed by the next step when a custom image is used
git config --global user.email $BOT_EMAIL
git config --global user.name $BOT_USERNAME