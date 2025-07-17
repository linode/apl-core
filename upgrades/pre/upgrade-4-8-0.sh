#!/bin/bash

# Set namespace and name of KnativeServing CR
NAMESPACE="knative-serving"
NAME="knative-serving"

# Check if the KnativeServing CR exists
if ! kubectl get knativeserving "$NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "KnativeServing CR not found, exiting."
  exit 0
fi

# Function to patch and wait
upgrade_version() {
  local version=$1
  echo "Upgrading to version $version..."

  kubectl patch knativeserving "$NAME" -n "$NAMESPACE" --type='merge' -p \
    "{\"spec\": {\"version\": \"$version\"}}"

  echo "Waiting for KnativeServing to be Ready..."
  until kubectl get knativeserving "$NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | grep -q "True"; do
    echo -n "."
    sleep 5
  done
  echo -e "\nUpgrade to $version completed."
}

# Run upgrades step-by-step
upgrade_version "v1.16.0"
upgrade_version "v1.17.0"
upgrade_version "v1.18.0"
