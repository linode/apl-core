#!/usr/bin/env sh
set -e

echo KIND=$KIND
echo NAME=$NAME
echo RELEASE=$RELEASE
echo NAMESPACE=$NAMESPACE

kubectl -n $NAMESPACE annotate --overwrite $KIND $NAME meta.helm.sh/release-name=$RELEASE
kubectl -n $NAMESPACE annotate --overwrite $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE
kubectl -n $NAMESPACE label --overwrite $KIND $NAME app.kubernetes.io/managed-by=Helm
