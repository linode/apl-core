#!/usr/bin/env bash
set -e

. bin/common.sh
prepare_crypt

bin/validate-templates.sh 1
hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps | kubectl apply --dry-run -f -
hf diff --skip-deps | grep -Ev $helmfile_output_hide | sed -e $replace_paths_pattern
