#!/bin/bash

set -eu

kubectl annotate -n harbor secret/harbor-database helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n harbor sts/harbor-database helm.sh/resource-policy='keep' deprecated=true
kubectl annotate -n harbor svc/harbor-database helm.sh/resource-policy='keep' deprecated=true
