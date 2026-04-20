#! /bin/bash
# This script is used to deploy the latest changes merged on main to the dev environment.

set -euo pipefail

echo "Fetch the Kubernetes configuration for the dev environment"
export KUBECONFIG=$(mktemp -d)/.kubeconfig
linode-cli get-kubeconfig --id "$DEV_CLUSTER_ID" --kubeconfig "$KUBECONFIG"

CURRENT_IP=$(curl -sS https://ipv4.whatismyip.akamai.com/)
echo "Current IP: $CURRENT_IP"
update_args=("$DEV_CLUSTER_ID" --control_plane.acl.enabled true)
if [[ -n "${LKE_CP_ACL_IPV4}" ]]; then
  IFS=',' read -ra acl_ips <<< "${LKE_CP_ACL_IPV4}"
  for acl_ip in "${acl_ips[@]}"; do
    update_args+=(--control_plane.acl.addresses.ipv4 "$acl_ip")
  done
fi
reset_args=("${update_args[@]}")
update_args+=(--control_plane.acl.addresses.ipv4 "$CURRENT_IP")

echo "Updating ACL"
linode-cli lke cluster-update "${update_args[@]}"

echo "Waiting for ACL to apply..."
while true; do
    if kubectl get pods 2> /dev/null; then
       echo "Ok."
       break
    else
       echo "Retrying in 5 seconds"
       sleep 5
    fi
done

echo "Restart platform deployments"
set +e
kubectl -n otomi rollout restart deployment/otomi-api
kubectl -n otomi rollout restart deployment/otomi-console
kubectl rollout restart deployment -n apl-harbor-operator apl-harbor-operator
kubectl rollout restart deployment -n apl-keycloak-operator apl-keycloak-operator
kubectl rollout restart deployment -n apl-gitea-operator apl-gitea-operator
kubectl rollout restart deployment -n otomi-operator otomi-operator
kubectl rollout restart deployment -n apl-operator apl-operator

echo "Resetting ACL"
linode-cli lke cluster-update "${reset_args[@]}"
