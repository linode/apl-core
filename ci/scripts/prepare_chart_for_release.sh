#!/bin/bash
set -euo pipefail

# Retrieve the app version from the RELEASE_TAG env var (e.g. v6.0.0-rc.9 → 6.0.0-rc.9)
app_version="${RELEASE_TAG#v}"

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
