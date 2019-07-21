# /bin/bash
shopt -s expand_aliases
. bin/aliases
set -e

# cert-manager stuff
k label ns cert-manager certmanager.k8s.io/disable-validation=true

# uncomment if errors occur because we are not working under admin role:
# kubectl create clusterrolebinding cluster-admin-binding \
#   --clusterrole=cluster-admin \
#   --user=$(gcloud config get-value core/account)