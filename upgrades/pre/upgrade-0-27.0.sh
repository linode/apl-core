#!/bin/bash

set -eu

helm uninstall -n keycloak keycloak && sleep 30