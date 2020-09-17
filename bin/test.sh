#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases

otomi template -f helmfile.tpl/helmfile-init.yaml
otomi template

otomi diff
