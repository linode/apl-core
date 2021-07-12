#!/usr/bin/env bash
set -e

. bin/common.sh
crypt

export QUIET=1
hf lint
bin/validate-templates.sh
# bin/check-policies.sh
hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps | kubectl apply --dry-run -f -
hf diff --skip-deps | grep -Ev $helmfile_output_hide | sed -e $replace_paths_pattern
