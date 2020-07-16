#!/usr/bin/env sh
shopt -s expand_aliases
. bin/utils.sh
# set -e

# pre update steps:

# Now able to tag old resources to be adopted by helm 3.20, yay!
# https://github.com/helm/helm/issues/7697#issuecomment-613535044

# istio-operator
NAME=istio-operator
RELEASE=istio-operator
NAMESPACE=default
RUNNING_NS=istio-operator
for KIND in namespace clusterrolebinding clusterrole sa deployment; do
  . bin/upgrades/adopt-by-helm.sh
done
KIND=crd
for NAME in $(k get crd | grep istio-operator | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh
done

# gatekeeper-operator
NAME=gatekeeper-system
RELEASE=gatekeeper-operator
NAMESPACE=default
RUNNING_NS=gatekeeper-system
KIND=crd
for NAME in $(k get crd | grep gatekeeper | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh
done
NAME=gatekeeper-system
for KIND in namespace clusterrolebinding clusterrole ValidatingWebhookConfiguration; do
  [ "$KIND" = "clusterrole" ] && NAME=gatekeeper-manager-role
  [ "$KIND" = "clusterrolebinding" ] && NAME=gatekeeper-manager-rolebinding
  [ "$KIND" = "ValidatingWebhookConfiguration" ] && NAME=gatekeeper-validating-webhook-configuration
  [ "$KIND" = "sa" ] && NAME=gatekeeper-admin && RUNNING_NS=gatekeeper-system
  [ "$KIND" = "role" ] && NAME=gatekeeper-manager-role && RUNNING_NS=gatekeeper-system
  [ "$KIND" = "rolebinding" ] && NAME=gatekeeper-manager-rolebinding && RUNNING_NS=gatekeeper-system
  . bin/upgrades/adopt-by-helm.sh
done

# # gatekeeper-operator-config
RUNNING_NS=gatekeeper-system
RELEASE=gatekeeper-operator-config
NAMESPACE=gatekeeper-system
KIND=constrainttemplates.templates.gatekeeper.sh
for NAME in k8sallowedrepos k8sbannedimagetags k8scontainerlimits k8spspallowedusers k8spsphostfilesystem k8spsphostnetworkingports k8spsprivilegedcontainer k8srequiredlabels; do
  . bin/upgrades/adopt-by-helm.sh 1
done

# prometheus-operator
RUNNING_NS=ingress
KIND=crd
RELEASE=prometheus-operator-crds
NAMESPACE=monitoring
for NAME in $(k get crd | grep coreos | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh 1
done

# cert-manager
RUNNING_NS=ingress
KIND=crd
RELEASE=cert-manager
NAMESPACE=ingress
for NAME in $(k get crd | grep cert-manager | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh 1
done

# nginx-ingress
RUNNING_NS=ingress
RELEASE=nginx-ingress
NAME=nginx-ingress
NAMESPACE=ingress
for KIND in "clusterrolebinding" "clusterrole" "rolebinding" "role"; do
  . bin/upgrades/adopt-by-helm.sh
done

# post steps

# 1. delete resources that are blocking (immutability errors) and safe to delete
# 1.1 delete all po-grafana deployments for monitoring and each team and sync their prometheus charts
km delete deploy po-grafana
for team in "dev" "acc" "test"; do
  k -n team-$team delete deploy ${team}-po-grafana
done

# 2. Alternating deployments
# Some charts need defaults.yaml/helmDefaults.force=true (resulting in kubectl replace) while others need force=false
# so now deploy with defaults.yaml/helmDefaults.force=true and set back to false afterwards
# then deploy again keep and keep alternating until all charts pass
