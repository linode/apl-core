#! /bin/bash
# This script is used to deploy the latest changes merged on main to the dev environment.

set -e

echo "Decode and set the Kubernetes configuration for the dev environment"
if [ -z "$KUBECONFIG" ]; then
  echo $DEV_KUBECONFIG_64 | base64 -d >.kubeconfig
  export KUBECONFIG=$(pwd)/.kubeconfig
fi

echo "Restart platform deployments"
kubectl -n otomi rollout restart deployment/otomi-api
kubectl -n otomi rollout restart deployment/otomi-console
kubectl rollout restart deployment -n apl-harbor-operator apl-harbor-operator
kubectl rollout restart deployment -n apl-keycloak-operator apl-keycloak-operator
kubectl rollout restart deployment -n apl-gitea-operator apl-gitea-operator
kubectl rollout restart deployment -n otomi-operator otomi-operator
kubectl rollout restart deployment -n apl-operator apl-operator
