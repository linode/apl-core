#!/bin/bash

set -eu

[[ ! $(helm status -n harbor harbor) ]] && echo "Harbor doesn't exist. Skipping" && exit 0

kubectl -n harbor scale deploy/harbor-core --replicas 0
kubectl annotate -n harbor secret/harbor-database helm.sh/resource-policy='keep'
kubectl annotate -n harbor sts/harbor-database helm.sh/resource-policy='keep'
kubectl annotate -n harbor svc/harbor-database helm.sh/resource-policy='keep'