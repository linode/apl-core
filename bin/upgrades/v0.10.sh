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
# for KIND in namespace clusterrolebinding clusterrole sa deployment; do
#   . bin/upgrades/adopt-by-helm.sh
# done
# KIND=crd
# for NAME in $(k get crd | grep istio-operator | awk '{print $1}'); do
#   . bin/upgrades/adopt-by-helm.sh
# done

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
# gatekeeper-operator-config
RELEASE=gatekeeper-operator-config
NAMESPACE=gatekeeper-system
KIND=constrainttemplates.templates.gatekeeper.sh
for NAME in k8sallowedrepos k8sbannedimagetags k8scontainerlimits k8spspallowedusers k8spsphostfilesystem k8spsphostnetworkingports k8spsprivilegedcontainer k8srequiredlabels; do
  . bin/upgrades/adopt-by-helm.sh 1
done

# cert-manager
KIND=crd
RELEASE=cert-manager
NAMESPACE=ingress
for NAME in $(k get crd | grep cert-manager | awk '{print $1}'); do
  . bin/upgrades/adopt-by-helm.sh 1
done

# nginx-ingress
RELEASE=nginx-ingress
NAME=nginx-ingress
NAMESPACE=ingress
for KIND in "clusterrolebinding" "clusterrole" "rolebinding" "role"; do
  . bin/upgrades/adopt-by-helm.sh 1
done


# Now force some charts
hfd -l name=nginx-ingress apply --args=force=true
hfd -l name=cert-manager apply --args=force=true