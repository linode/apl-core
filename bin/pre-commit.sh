#!/usr/bin/env bash
. bin/common.sh
set -e

ENV_DIR=${ENV_DIR:-./env}

RECEIVER=get_receiver
match=".drone.tpl.$RECEIVER.yaml\|clusters.yaml"
set -o pipefail
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
fi
