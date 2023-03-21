#!/bin/bash

set -eu

# bump Istio annotations so old release and new release are compatible
kubectl annotate --overwrite deployment,replicaset,service,serviceaccount,clusterrole,clusterrolebinding istio-operator -n istio-operator meta.helm.sh/release-namespace=istio-operator
