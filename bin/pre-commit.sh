#!/usr/bin/env bash
ENV_DIR=${ENV_DIR:-$PWD/env}

version_changes=$(git -C $ENV_DIR diff env/settings.yaml | grep '^+    version:.*$')
secret_changes=$(git -C $ENV_DIR diff env/secrets.settings.yaml | grep '^+        url: https://hooks.slack.com/.*$')
{ [ "$version_changes" != "" ] || [ "$secret_changes" != "" ]; } && bin/gen-drone.sh

exit 0
