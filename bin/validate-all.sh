#!/usr/bin/env bash

set -e
set -o pipefail
. bin/common.sh
for_each_cluster "./bin/validate.sh"
