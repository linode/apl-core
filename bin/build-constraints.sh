#!/usr/bin/env bash
set -eu

echo "Building constraints from local policies"
generatedArtifactsPath="../values/gatekeeper/artifacts/"

rm -f "$generatedArtifactsPath/*"
konstraint create ../policies -o $generatedArtifactsPath

echo "Done!"
