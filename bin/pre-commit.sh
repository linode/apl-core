#!/usr/bin/env bash
set -e
set -o pipefail

ENV_DIR=${ENV_DIR:-./env}

changes=$(git -C $ENV_DIR diff env/settings.yaml | grep '^+    version:.*$')
[ "$changes" != "" ] && bin/gen-drone.sh
