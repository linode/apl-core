#!/bin/bash

set -e
KES_NAMESPACE="vault"

scriptDir="$(dirname -- "$0")"

echo "Upgrade from KES to ESO"
[[ ! $(helm status -n external-secrets external-secrets) ]] && echo "The external-secrets release does not exists. Skipping" && exit 0
[[ ! $(helm status -n vault external-secrets) ]] && echo "The external-secrets release has already been migrated. Skipping" && exit 0

echo "Scaling down KES"
kubectl scale deployment -n $KES_NAMESPACE external-secrets --replicas=0

# kestoeso requires kube config
cat >"$HOME"/.kube/config <<EOF
apiVersion: v1
clusters:
- cluster:
    server: "https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT_HTTPS"
    certificate-authority-data: "$(cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt | base64 -w0)"
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
users:
- name: default
  user:
    token: $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
EOF

chmod 600 "$HOME"/.kube/config

# Update Ownership references
echo "Patching secrets ownership KES to ESO"
./"${scriptDir}"/kestoeso apply --all-secrets --all-namespaces

echo "Removing KES CR"
kubectl delete externalsecrets.kubernetes-client.io -A --all
echo "Uninstalling KES"
helm uninstall -n vault external-secrets
echo "Removing KES CRD"
kubectl delete crd externalsecrets.kubernetes-client.io

echo "External secrets upgrade succeeded"
