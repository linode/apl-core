#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}
RECEIVER=$(cat $ENV_DIR/settings.yaml | yq r - alerts.receiver)

export RECEIVER
match=".drone.tpl.$receiver.yaml\|clusters.yaml"
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
fi
bin/crypt.sh encrypt
