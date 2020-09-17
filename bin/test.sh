#!/usr/bin/env bash
hf="helmfile -e $CLOUD-$CLUSTER"

$hf template -f helmfile.tpl/helmfile-init.yaml
$hf template
$hf diff --skip-deps
