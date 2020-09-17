#!/usr/bin/env bash
helmfile -e $CLOUD-$CLUSTER template -f helmfile.tpl/helmfile-init.yaml
helmfile -e $CLOUD-$CLUSTER template
helmfile -e $CLOUD-$CLUSTER diff --skip-deps

