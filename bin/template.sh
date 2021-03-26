#!/usr/bin/env bash
. bin/common.sh
. bin/common-modules.sh

set -e
parse_args "$@"
hf_templates
