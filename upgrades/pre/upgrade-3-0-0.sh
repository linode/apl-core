#!/bin/bash

set -eu

kubectl annotate -n gitea secret/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea sts/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea svc/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true


if [[ $(helm status -n gatekeeper-system gatekeeper 2>/dev/null) ]]; then
  helm uninstall -n gatekeeper-system gatekeeper
  helm uninstall -n gatekeeper-system gatekeeper-artifacts
  helm uninstall -n gatekeeper-system gatekeeper-constraints
  helm uninstall -n gatekeeper-system opa-exporter-artifacts
  helm uninstall -n opa-exporter opa-exporter
fi