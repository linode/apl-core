#!/bin/bash
set -e ;

issuer_file=$1
namespace={{ .Release.Namespace }}

echo "Creating the certmanager issuer..."
set +e ; # The CRD may not exist yet. We need to retry until this passes
while ! kubectl --namespace=$namespace apply -f ${issuer_file:=issuer.yml}; do
  sleep 1;
done ;
set -e ; # reset `e` as active
