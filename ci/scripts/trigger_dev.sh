#! /bin/bash
# This script is used to deploy the latest changes merged on main to the dev environment.

set -e

echo "Decode and set the Kubernetes configuration for the dev environment"
if [ -z "$KUBECONFIG" ]; then
  echo $DEV_KUBECONFIG_64 | base64 -d >.kubeconfig
  export KUBECONFIG=$(pwd)/.kubeconfig
fi

echo "Restart deployments platform deployments"
kubectl -n otomi rollout restart deployment/otomi-api
kubectl -n otomi rollout restart deployment/otomi-console
kubectl rollout restart deployment -n apl-harbor-operator apl-harbor-operator
kubectl rollout restart deployment -n apl-keycloak-operator apl-keycloak-operator
kubectl rollout restart deployment -n apl-gitea-operator apl-gitea-operator
kubectl rollout restart deployment -n otomi-operator otomi-operator

echo "Extract Gitea username, password, and values repo git url"
export USERNAME=$(kubectl get secret -n otomi-pipelines gitea-credentials -ojsonpath='{.data.username}' | base64 -d)
export PASSWORD=$(kubectl get secret -n otomi-pipelines gitea-credentials -ojsonpath='{.data.password}' | base64 -d)
export URL=$(kubectl get ingress nginx-team-admin-platform-public-open -n istio-system -o json | jq -r '.spec.rules[] | select(.host | startswith("gitea")) | .host')

if [ -n "$BOT_USERNAME" ] && [ -n "$BOT_EMAIL" ]; then
  echo "Configure Git user details for committing changes"
  git config --global user.name "$BOT_USERNAME"
  git config --global user.email "$BOT_EMAIL"
fi

echo "Clone the values repository using the decoded credentials"
git clone --depth 2 https://$USERNAME:$PASSWORD@$URL/otomi/values.git dev-values 2>/dev/null
cd dev-values

echo "Create an empty commit to trigger the pipeline and push it to the main branch"
git commit --allow-empty -m "Triggering pipeline for ${COMMIT_SHA}"
git push origin main
echo "Successfully triggered the pipeline for the dev environment"
