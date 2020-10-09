#!/usr/bin/env bash

set -e
set -o pipefail
. bin/common.sh
ENV_DIR=${ENV_DIR:-./env}
for_each_cluster "./bin/lint.sh"
