#!/bin/bash

set -eu

kubectl annotate -n harbor secret/gitea-database helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n harbor sts/gitea-database helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n harbor svc/gitea-database helm.sh/resource-policy='keep' deprecated=true
