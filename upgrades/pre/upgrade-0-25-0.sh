#!/bin/bash

set -eu

kubectl get certificate -n istio-system -o name | while read -r cert; do kubectl annotate "$cert" -n istio-system helm.sh/resource-policy='keep' deprecated=true; done
kubectl annotate -n keycloak sts/keycloak-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n keycloak pvc/data-keycloak-postgresql-0 helm.sh/resource-policy='keep' deprecated=true