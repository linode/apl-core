#!/usr/bin/env bash
set -e

match="clusters.yaml"
set -o pipefail
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
fi
