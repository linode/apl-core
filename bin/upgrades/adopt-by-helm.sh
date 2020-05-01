#!/usr/bin/env sh
# set -e

echo KIND=$KIND
echo NAME=$NAME
echo RELEASE=$RELEASE
echo NAMESPACE=$NAMESPACE

useNS="-n $RUNNING_NS"
[ "$1" != "" ] && useNS=''
kubectl $useNS annotate --overwrite $KIND $NAME meta.helm.sh/release-name=$RELEASE
kubectl $useNS annotate --overwrite $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE
kubectl $useNS label --overwrite $KIND $NAME app.kubernetes.io/managed-by=Helm
