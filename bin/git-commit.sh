#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}

match=".drone.tpl.yaml\|env.ini"
if git -C $ENV_DIR diff --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
  git -C $ENV_DIR add $ENV_DIR/*/.drone.*.yml
  git -C $ENV_DIR add env.ini
fi
bin/crypt.sh enc
git -C $ENV_DIR add $ENV_DIR/*.yaml
git -C $ENV_DIR commit -m 'Manual commit'
