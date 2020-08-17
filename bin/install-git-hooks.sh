#!/usr/bin/env bash

set -e
ENV_DIR=${ENV_DIR:-./env}
TARGET=${ENV_DIR}/.git/hooks/
echo "Installing git hooks at: $TARGET"
cp bin/git-hooks/* $TARGET
echo "SUCCESS: Installed git hooks at: $TARGET"
