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