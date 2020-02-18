#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases

set -e
kcu $K8S_CONTEXT
kkc
