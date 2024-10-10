#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io gitea-operator-gitea-operator -n argocd 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io gitea-operator-gitea-operator -n argocd
fi

if [[ $(kubectl get applications.argoproj.io gitea-operator-gitea-operator -n argocd 2>/dev/null) ]]; then
    echo "Found old knative CRDS. Will remove them now"
    kubectl delete crd clustercompliancereports.aquasecurity.github.io
    kubectl delete crd clusterconfigauditreports.aquasecurity.github.io
    kubectl delete crd clusterinfraassessmentreports.aquasecurity.github.io
    kubectl delete crd clusterrbacassessmentreports.aquasecurity.github.io
    kubectl delete crd configauditreports.aquasecurity.github.io
    kubectl delete crd exposedsecretreports.aquasecurity.github.io
    kubectl delete crd infraassessmentreports.aquasecurity.github.io
    kubectl delete crd rbacassessmentreports.aquasecurity.github.io
    kubectl delete crd vulnerabilityreports.aquasecurity.github.io
    kubectl patch crd/routes.serving.knative.dev  -p '{"metadata":{"finalizers":[]}}' --type=merge
else
    echo "Trivy Operator helm release not found"
fi