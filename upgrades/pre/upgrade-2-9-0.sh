#!/bin/bash

set -eu

if [[ $(helm status -n argocd argocd-operator-cr 2>/dev/null) ]]; then
  helm uninstall argocd-operator-cr -n argocd
  helm uninstall argocd-operator-artifacts -n argocd
  helm uninstall argocd-operator -n argocd
else
  echo "The argocd-operator-cr helm release not found. Skipping."
fi
