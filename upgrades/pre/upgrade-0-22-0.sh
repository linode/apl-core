#!/bin/bash

set -eu

[[ $(helm status -n kube-system kured) ]] && helm uninstall -n kube-system kured || echo "The old kured release does not exists. Skipping" 
# It is safe to uninstall the release as it is stateless app.


[[ $(helm status -n monitoring prometheus-operator) ]] && helm uninstall -n monitoring prometheus-operator || echo "The old prometheus-operator release does not exists. Skipping"
# It is safe to uninstall the release as it is stateless app.