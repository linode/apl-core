#!/usr/bin/env bash
set -ex
ENV_DIR=${ENV_DIR:-./env}

git -C $ENV_DIR pull
bin/crypt.sh dec
