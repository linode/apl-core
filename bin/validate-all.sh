#!/usr/bin/env bash

set -ex
set -o pipefail
. bin/common.sh
ENV_DIR=${ENV_DIR:-./env}
for_each_cluster "./bin/validate.sh"
