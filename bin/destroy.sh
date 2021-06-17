#!/usr/bin/env bash
. bin/common.sh

run_crypt

k -n olm delete deploy --all

hf destroy

# hf -f helmfile.tpl/helmfile-init.yaml template | kubectl delete -f -

# delete all crds installed by us
crds="(appgw.ingress.k8s.io|cert-manager.io|externalsecrets.kubernetes-client.io|istio.io|kubeapps.com|monitoring.coreos.com|monitoring.kiali.io|operators.coreos.com|vault.banzaicloud.com)"
k get crd | grep -E $crds | awk '{ print $1 }' | awk '(NR>1)' | xargs kubectl delete crd

# and to finally remove all hanging namespaces which are stuck on:
k delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com
