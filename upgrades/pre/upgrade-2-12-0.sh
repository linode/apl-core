#!/bin/bash

set -eu

if [[ $(helm status -n external-secrets external-secrets-artifacts 2>/dev/null) ]]; then
  helm uninstall -n external-secrets external-secrets-artifacts
fi