#!/usr/bin/env bash
set -uex
# . ./bin/common.sh

projectId="otomi-cloud"
cluster="otomi-eks-dev"
keyRing="$cluster"
keyName="$cluster-vault"
# https://cloud.google.com/kms/docs/locations
location='europe-west4'
saKeyFile="$cluster-key.json"

function create_keyring() {
  gcloud kms keyrings create $keyRing \
    --location $location
}

function create_kms_key() {
  gcloud kms keys create $keyName \
    --keyring $keyRing \
    --location $location \
    --purpose "encryption"
}

function create_sa() {
  # https://cloud.google.com/iam/docs/creating-managing-service-accounts#iam-service-accounts-create-gcloud
  gcloud iam service-accounts create $cluster \
    --description="Manage resources for $cluster cluster" \
    --display-name="$cluster"
}

function add_role() {
  # https://cloud.google.com/iam/docs/understanding-roles#cloud-kms-roles
  gcloud projects add-iam-policy-binding "$projectId" \
    --member="serviceAccount:${cluster}@${projectId}.iam.gserviceaccount.com" \
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
}

function generate_sa_key() {
  # https://cloud.google.com/iam/docs/creating-managing-service-account-keys
  gcloud iam service-accounts keys create ${saKeyFile} \
    --iam-account ${cluster}@${projectId}.iam.gserviceaccount.com
}

# create_keyring
create_kms_key
# create_sa
# add_role
# generate_sa_key
# projects/otomi-cloud/locations/europe-west4/keyRings/otomi-eks-dev/cryptoKeys/otomi-eks-dev-vault
# projects/otomi-cloud/locations/europe-west4/keyRings/otomi-eks-dev/cryptoKeys/otomi-eks-dev-vault
echo "
project: $projectId
region: $location
key_ring: $keyRing
crypto_key: $keyName
"
