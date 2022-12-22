#! /bin/bash -e
KES_NAMESPACE="vault"
ESO_NAMESPACE="external-secrets"

echo "Upgrade from KES to ESO"
[[ $(helm status -n external-secrets external-secrets) && ! $(helm status -n vault external-secrets) ]] && echo "Skipping"

# mkdir -p eso_files

# echo "Scaling down ESO"
# kubectl scale deployment -n $ESO_NAMESPACE external-secrets --replicas=0
# Generate ESO files and apply them
# ./kestoeso generate -i kes_files -o eso_files -n $KES_NAMESPACE
# kubectl apply -f eso_files

echo "Scaling down KES"
kubectl scale deployment -n $KES_NAMESPACE kubernetes-external-secrets --replicas=0

# Update Ownership references
echo "Updating secrets ownership"
./kestoeso apply --all-secrets --all-namespaces
# echo "Scaling up ESO"
# kubectl scale deployment -n $ESO_NAMESPACE external-secrets --replicas=1
echo "Uninstalling KES"
helm uninstall -n vault external-secrets

echo "External secrets upgrade succeeded"
