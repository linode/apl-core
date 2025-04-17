#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io -n argocd keycloak-keycloak-operator-cr 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd keycloak-keycloak-operator-cr
  kubectl delete --ignore-not-found -n keycloak keycloak keycloak
fi

if [[ $(kubectl get applications.argoproj.io -n argocd keycloak-keycloak-operator 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io -n argocd keycloak-keycloak-operator
  kubectl delete --ignore-not-found -n keycloak deployment keycloak-operator
  kubectl delete --ignore-not-found -n keycloak serviceaccount keycloak-operator
  kubectl delete --ignore-not-found -n keycloak service keycloak-operator
  kubectl delete --ignore-not-found -n keycloak rolebinding keycloak-operator-view
  kubectl delete --ignore-not-found -n keycloak rolebinding keycloakcontroller-role-binding
  kubectl delete --ignore-not-found -n keycloak rolebinding keycloakrealmimportcontroller-role-binding
  kubectl delete --ignore-not-found -n keycloak rolebinding keycloak-operator-role-binding
  kubectl delete --ignore-not-found -n keycloak role keycloak-operator-role
  kubectl delete --ignore-not-found clusterrole keycloakcontroller-cluster-role
  kubectl delete --ignore-not-found clusterrole keycloakrealmimportcontroller-cluster-role
  kubectl delete --ignore-not-found crd keycloakrealmimports.k8s.keycloak.org
  kubectl delete --ignore-not-found crd keycloaks.k8s.keycloak.org
fi
