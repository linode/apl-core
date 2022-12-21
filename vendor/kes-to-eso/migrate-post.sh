#! /bin/bash -e
KES_NAMESPACE="vault"

mkdir -p eso_files

# Generate ESO files and apply them
./kes-to-eso generate -i kes_files -o eso_files -n $KES_NAMESPACE
kubectl apply -f eso_files

# Update Ownership references
./kes-to-eso apply --all-secrets --all-namespaces
