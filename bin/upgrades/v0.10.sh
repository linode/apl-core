#!/usr/bin/env bash
shopt -s expand_aliases
. ../bin/utils.sh
set -e

# pre update steps:

# remove everything related to cert-manager
# charts
h -n ingress delete cert-manager
# delete all cert-manager stuff that was done outside of charts
k get crd G cert-manager A1 X kubectl delete

# remove everything related to cert-manager
# charts
h -n ingress delete cert-manager
# delete all cert-manager stuff that was done outside of charts
k get crd G cert-manager A1 X kubectl delete

# remove roles and bindings related to nginx-ingress
k delete clusterrolebinding nginx-ingress
k delete clusterrole nginx-ingress
ki delete rolebinding nginx-ingress
ki delete role nginx-ingress

