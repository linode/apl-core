#!/bin/bash

set -eu

kubectl annotate -n gitea secret/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea sts/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n gitea svc/gitea-postgresql helm.sh/resource-policy='keep' deprecated=true
