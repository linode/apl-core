#!/usr/bin/env bash
set -e
set -o pipefail

ENV_DIR=${ENV_DIR:-./env}

match="clusters.yaml"
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
fi
