#! /bin/bash -e
mkdir -p kes_files

# Get the old secrets and store in folder
bash -c "$(kubectl get externalsecrets.kubernetes-client.io -A -o=jsonpath='{range .items[*]}{"kubectl get externalsecrets.kubernetes-client.io -o yaml -n "}{.metadata.namespace}{" "}{.metadata.name}{" >> kes_files/"}{.metadata.namespace}{"-"}{.metadata.name}{".yaml; "}{end}')"
