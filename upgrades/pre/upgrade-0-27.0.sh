#!/bin/bash

set -eu

if [[ $(helm status -n keycloak keycloak 2>/dev/null) ]]; then
    echo "Found old keycloak release. Will uninstall it..."
    helm uninstall -n keycloak keycloak
else
    echo "Keycloak helm release not found"
fi