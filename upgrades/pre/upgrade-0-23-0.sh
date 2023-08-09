#!/bin/bash

set -eu

if [[ $(helm status -n istio-system oauth2-proxy 2>/dev/null) ]]; then
  helm uninstall -n istio-system oauth2-proxy
else
  echo "The old oauth2-proxy release does not exists. Skipping"
fi

if [[ $(helm status -n istio-system oauth2-proxy-redis 2>/dev/null) ]]; then
  helm uninstall -n istio-system oauth2-proxy-redis
else
  echo "The old oauth2-proxy-redis release does not exists. Skipping"
fi

if [[ $(helm status -n cert-manager cert-manager 2>/dev/null) ]]; then
  kubectl delete -n cert-manager deployment cert-manager-cainjector cert-manager-webhook cert-manager
else
  echo "The old cert-manager release does not exists. Skipping"
fi

kubectl annotate -n keycloak sts/keycloak-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n keycloak pvc/data-keycloak-postgresql-0 helm.sh/resource-policy='keep' deprecated=true
