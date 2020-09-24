#!/usr/bin/env bash
set -e
hf="helmfile -e $CLOUD-$CLUSTER"

$hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps >/dev/null # no sensitive output please
$hf diff --skip-deps
