#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh

set -e
kcu $K8S_CONTEXT
kkc
