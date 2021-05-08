#!/usr/bin/env bash
. bin/common.sh

set +e

k -n olm delete deploy --all

hf destroy

# install some stuff that we never want to end up as charts
hf -f helmfile.tpl/helmfile-init.yaml template | kubectl delete -f -

# delete all crds
k get crd | awk '{ print $1 }' | awk '(NR>1)' | xargs kubectl delete crd

# and to finally remove all hanging namespaces which are stuck on:
k delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com
