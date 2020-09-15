#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}

match=".drone.tpl.yaml\|env.ini"
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
fi
bin/crypt.sh encrypt
