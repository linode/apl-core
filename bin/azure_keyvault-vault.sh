#!/usr/bin/env bash
set -uex
# . ./bin/common.sh

cluster="otomi-vault-dev"
resourceGroup='otomi-vault'
location='westeurope'
keyName="vault-1"
saKeyFile="$cluster-key.json"

function create_keyvault() {
  # https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest#az_keyvault_create
  az keyvault create \
    --location $location \
    --name $cluster \
    --resource-group $resourceGroup
}
function create_key() {
  az keyvault key create --vault-name $cluster --name $keyName
}
function create_sp_and_token() {
  # https://docs.microsoft.com/en-us/azure/developer/go/azure-sdk-authorization#use-file-based-authentication
  az ad sp create-for-rbac --name $cluster --sdk-auth >"$saKeyFile"
}

function assign_role_to_sp() {
  az keyvault set-policy --name $cluster --object-id $spObjectId
}

# create_sp_and_token
# create_keyvault
create_key
echo "
resourceGroup: $resourceGroup
location: $location
key_name: $keyName
vault_name: $cluster
"
