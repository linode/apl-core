#!/usr/bin/env bash
set -e

ENV_DIR=${ENV_DIR:-./env}

match=".drone.tpl.yaml\|env.ini"
if git -C $ENV_DIR diff --cached --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
  git -C $ENV_DIR add */.drone.*.yml
fi
bin/crypt.sh enc
git -C $ENV_DIR add *.yaml
git -C $ENV_DIR commit -m 'Manual commit'
