#! /bin/bash -e
KES_NAMESPACE="vault"

mkdir -p eso_files

#Step 2 Generate ESO files and apply them
./kes-to-eso generate -i kes_files -o eso_files -n $KES_NAMESPACE

kubectl apply -f eso_files

# Step 4 - Update Ownership references
./kes-to-eso apply --all-secrets --all-namespaces #
# kestoeso apply -n changeme-my-target-ns -s my-secret-1,my-secret-2 # Alternative for people that want to do a step-by-step migration
