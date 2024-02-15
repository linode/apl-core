#!/bin/bash

set -eu

if [[ $(helm status -n trivy-operator trivy-operator 2>/dev/null) ]]; then
    echo "Found old trivy-operator release. Will uninstall it..."
    helm uninstall -n trivy-operator trivy-operator
    kubectl delete crd clustercompliancereports.aquasecurity.github.io
    kubectl delete crd clusterconfigauditreports.aquasecurity.github.io
    kubectl delete crd clusterinfraassessmentreports.aquasecurity.github.io
    kubectl delete crd clusterrbacassessmentreports.aquasecurity.github.io
    kubectl delete crd configauditreports.aquasecurity.github.io
    kubectl delete crd exposedsecretreports.aquasecurity.github.io
    kubectl delete crd infraassessmentreports.aquasecurity.github.io
    kubectl delete crd rbacassessmentreports.aquasecurity.github.io
    kubectl delete crd vulnerabilityreports.aquasecurity.github.io
else
    echo "Trivy Operator helm release not found"
fi

