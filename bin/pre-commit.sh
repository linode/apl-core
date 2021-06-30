#!/usr/bin/env bash
set -ex
set -o pipefail

ENV_DIR=${ENV_DIR:-./env}

changes=$(git -C $ENV_DIR diff env/settings.yaml | grep '^+    version:.*$')
[ "$changes" = "" ] && echo "No otomi version changes detected. Skipping." && exit
bin/gen-drone.sh
