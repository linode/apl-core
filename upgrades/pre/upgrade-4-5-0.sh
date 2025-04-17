#!/bin/bash

set -eu

if [[ $(helm status -n keycloak keycloak-operator-cr 2>/dev/null) ]]; then
  helm uninstall -n keycloak keycloak-operator-cr
fi

if [[ $(helm status -n keycloak keycloak-operator 2>/dev/null) ]]; then
  helm uninstall -n keycloak keycloak-operator
fi
