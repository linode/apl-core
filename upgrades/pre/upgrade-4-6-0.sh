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

if [[ $(kubectl get deployment -n istio-operator istio-operator 2>/dev/null) ]]; then
  kubectl patch application -n argocd istio-operator-istio-operator --patch '[{"op": "remove", "path": "/spec/syncPolicy/automated"}]' --type=json
  kubectl scale deployment -n istio-operator istio-operator --replicas=0

  for crd in $(kubectl get crds -l chart=istio -o name && kubectl get crds -l app.kubernetes.io/part-of=istio -o name)
  do
     kubectl label "$crd" "app.kubernetes.io/managed-by=Helm" || true
     kubectl annotate "$crd" "meta.helm.sh/release-name=istio-base" || true
     kubectl annotate "$crd" "meta.helm.sh/release-namespace=istio-system" || true
  done

  for res in serviceaccount/istio-reader-service-account validatingwebhookconfiguration.admissionregistration.k8s.io/istiod-default-validator
  do
     kubectl label -n istio-system "$res" "app.kubernetes.io/managed-by=Helm" || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-name=istio-base" || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-namespace=istio-system" || true
  done

  for res in poddisruptionbudgets.policy/istiod serviceaccount/istiod configmap/istio configmap/values configmap/istio-sidecar-injector role/istiod rolebinding/istiod service/istiod deployment/istiod horizontalpodautoscaler.autoscaling/istiod mutatingwebhookconfiguration.admissionregistration.k8s.io/istio-sidecar-injector validatingwebhookconfiguration.admissionregistration.k8s.io/istio-validator-istio-system
  do
     kubectl label -n istio-system "$res" "app.kubernetes.io/managed-by=Helm" || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-name=istiod" --overwrite || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-namespace=istio-system" || true
  done
  for res in clusterrole/istiod-clusterrole-istio-system clusterrole/istiod-gateway-controller-istio-system clusterrole/istio-reader-clusterrole-istio-system clusterrolebinding/istiod-clusterrole-istio-system clusterrolebinding/istiod-gateway-controller-istio-system clusterrolebinding/istio-reader-clusterrole-istio-system
  do
     kubectl label "$res" "app.kubernetes.io/managed-by=Helm" || true
     kubectl annotate "$res" "meta.helm.sh/release-name=istiod" || true
     kubectl annotate "$res" "meta.helm.sh/release-namespace=istio-system" || true
  done

  for res in service/istio-ingressgateway-public serviceaccount/istio-ingressgateway-public role/istio-ingressgateway-public rolebinding/istio-ingressgateway-public deployment/istio-ingressgateway-public horizontalpodautoscaler.autoscaling/istio-ingressgateway-public
  do
     kubectl label -n istio-system "$res" "app.kubernetes.io/managed-by=Helm" || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-name=istio-ingressgateway-public" || true
     kubectl annotate -n istio-system "$res" "meta.helm.sh/release-namespace=istio-system" || true
  done
fi
