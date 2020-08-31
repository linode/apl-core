#!/usr/bin/env bash

sleep 5 # needed otherwise we get connection refused on the k8s api
# read what we have in the system from configmap
runningCertDomains=$(kubectl get cm cert-arns -o json | jq -r '.data.domains')
runningCertArns=$(kubectl get cm cert-arns -o json | jq -r '.data.arns')
# set -e

# see if we have to import certs
for domain in $domainsWithoutArns; do
  # is this domain found in our registry?
  if [[ $runningCertDomains == *"$domain"* ]]; then
    # no, import into ACM
    certArn=$(
      aws acm import-certificate \
        --certificate \
        --private-key \
        --certificate-chain \
        --tags app=otomi | jq -r '.CertificateArn'
    )
    runningCertArns="$runningCertArns$([ \"$runningCertArns\" != \"\" ] && echo ',')$certArn"
    runningCertDomains="$runningCertDomains$([ \"$runningCertDomains\" != \"\" ] && echo ',')$domain"
  fi
done

# store the new arn list in configmap
kubectl apply cm cert-arns --from-literal=domains=$runningCertDomains --from-literal=certArns=$runningCertArns

# patch the aws ingress
kubectl -n ingress get ing aws-team-admin-external -o json | jq ".metadata.annotations[\"alb.ingress.kubernetes.io/certificate-arn\"] = \"$runningCertArns\"" | kubectl -n ingress apply -f -
