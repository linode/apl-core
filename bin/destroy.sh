#!/usr/bin/env bash
. bin/common.sh

crypt

k -n olm delete deploy --all

hf destroy

hf -f helmfile.tpl/helmfile-init.yaml template | kubectl delete -f -

# delete all crds installed by us
crds="(appgw.ingress.k8s.io|cert-manager.io|externalsecrets.kubernetes-client.io|gatekeeper.sh|istio.io|jaegertracing.io|kiali.io|knative.dev|kubeapps.com|coreos.com|vault.banzaicloud.com)"
k get crd --no-headers -o custom-columns=":metadata.name" | grep -E $crds | xargs kubectl delete crd

# and to finally remove all hanging namespaces which are stuck on:
k delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com

echo "The following PVCs remain in the cluster:"
k get pvc -A
