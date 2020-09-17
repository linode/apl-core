#!/usr/bin/env bash
set -e
hf="helmfile -e $CLOUD-$CLUSTER"

$hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps
$hf template --skip-deps
$hf diff --skip-deps
