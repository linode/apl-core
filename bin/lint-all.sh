#!/usr/bin/env bash

ENV_DIR=${ENV_DIR:-./env}
. bin/common.sh
for_each_cluster "./bin/lint.sh"
