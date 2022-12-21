#! /bin/bash -e
ESO_NAMESPACE="vault"
# Have KES and ESO both installed
#Step 0  manual step to get .yaml files for KES External Secrets
## can be done with:
mkdir -p kes_files
mkdir -p eso_files
bash -c "$(kubectl get externalsecrets.kubernetes-client.io -A -o=jsonpath='{range .items[*]}{"kubectl get externalsecrets.kubernetes-client.io -o yaml -n "}{.metadata.namespace}{" "}{.metadata.name}{" >> kes_files/"}{.metadata.namespace}{"-"}{.metadata.name}{".yaml; "}{end}')"
