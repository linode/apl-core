#!/bin/bash

set -eu

if [[ $(kubectl get applications.argoproj.io monitoring-prometheus-operator -n argocd 2>/dev/null) ]]; then
  kubectl delete applications.argoproj.io monitoring-prometheus-operator -n argocd
  kubectl delete crd alertmanagerconfigs.monitoring.coreos.com
  kubectl delete crd alertmanagers.monitoring.coreos.com
  kubectl delete crd podmonitors.monitoring.coreos.com
  kubectl delete crd probes.monitoring.coreos.com
  kubectl delete crd prometheusagents.monitoring.coreos.com
  kubectl delete crd prometheuses.monitoring.coreos.com
  kubectl delete crd prometheusrules.monitoring.coreos.com
  kubectl delete crd scrapeconfigs.monitoring.coreos.com
  kubectl delete crd servicemonitors.monitoring.coreos.com
  kubectl delete crd thanosrulers.monitoring.coreos.com 
else
    echo "Prometheus Operator not found"
fi

