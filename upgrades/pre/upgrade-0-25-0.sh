#!/bin/bash

set -eu

kubectl annotate -n istio-system certificate helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n keycloak sts/keycloak-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n keycloak pvc/data-keycloak-postgresql-0 helm.sh/resource-policy='keep' deprecated=true
