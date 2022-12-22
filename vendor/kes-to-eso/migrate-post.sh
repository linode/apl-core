#! /bin/bash -e
KES_NAMESPACE="vault"

mkdir -p eso_files

# Generate ESO files and apply them
./kestoeso generate -i kes_files -o eso_files -n $KES_NAMESPACE
kubectl apply -f eso_files

# Update Ownership references
./kestoeso apply --all-secrets --all-namespaces

[[ $(helm status -n vault external-secrets) ]] && helm uninstall -n vault external-secrets
