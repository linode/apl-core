#!/usr/bin/env bash

set -e
[[ -z "$ENV_DIR"]] && echo "Error<$0>: Missing ENV_DIR environment variable" && exit 2

TARGET=${ENV_DIR}/.git/hooks/
echo "Installing git hooks at: $TARGET"
cp bin/values.git-hooks/* $TARGET
echo "SUCCESS: Installed git hooks at: $TARGET"
