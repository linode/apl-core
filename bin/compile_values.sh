#!/usr/bin/env bash
[[ -z "$COMPILED_VALUES_PATH" ]] && echo "Error: Missing the COMPILED_VALUES_PATH environment variable" && exit 2

# shopt -s expand_aliases
# . bin/utils.sh

set -e
helmfile -f helmfile.tpl/helmfile-dump.yaml build | yq r - 'releases[0].values[0]' > $COMPILED_VALUES_PATH
