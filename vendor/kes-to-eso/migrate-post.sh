#! /bin/bash -e
KES_NAMESPACE="vault"
# ESO_NAMESPACE="external-secrets"

scriptDir="$(dirname -- "$0")"

echo "Upgrade from KES to ESO"
[[ $(helm status -n external-secrets external-secrets) && ! $(helm status -n vault external-secrets) ]] && echo "Skipping" && exit 0

# mkdir -p eso_files

# echo "Scaling down ESO"
# kubectl scale deployment -n $ESO_NAMESPACE external-secrets --replicas=0
# Generate ESO files and apply them
# ./kestoeso generate -i kes_files -o eso_files -n $KES_NAMESPACE
# kubectl apply -f eso_files

echo "Scaling down KES"
kubectl scale deployment -n $KES_NAMESPACE external-secrets --replicas=0

# Update Ownership references
echo "Patching secrets ownership KES to ESO"
./"${scriptDir}"/kestoeso apply --all-secrets --all-namespaces
# echo "Scaling up ESO"
# kubectl scale deployment -n $ESO_NAMESPACE external-secrets --replicas=1gps
echo "Removing KES CR"
kubectl delete externalsecrets.kubernetes-client.io -A --all
echo "Uninstalling KES"
helm uninstall -n vault external-secrets
echo "Removing KES CRD"
kubectl delete crd externalsecrets.kubernetes-client.io

echo "External secrets upgrade succeeded"
