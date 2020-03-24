#!/usr/bin/env bash

# prerequites:
# gcloud auth login
. bin/env.sh
set -e
# expects $CUSTOMER to be set !!
PROJECT="otomi-cloud"
ROLE="objectViewer"
NAME="gcr-auth-ro-$CUSTOMER"
# ROLE="admin"
# NAME="gcr-auth-rw-$CUSTOMER"
FILE="$NAME.json"

# create a GCP service account; format of account is email address
SA_EMAIL=$(gcloud iam service-accounts --format='value(email)' create $NAME)
# create the json key file and associate it with the service account
gcloud iam service-accounts keys create $FILE --iam-account=$SA_EMAIL
# get the project id
# add the IAM policy binding for the defined project and service account
gcloud projects add-iam-policy-binding $PROJECT --member serviceAccount:$SA_EMAIL --role roles/storage.$ROLE
# apply to the cluster:
secret=$(kubectl -n drone-pipelines create secret docker-registry gcr-json-key --dry-run \
  --docker-server=eu.gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat ./$FILE)" \
  --docker-email=not@val.id \
  -ojsonpath='{.data.\.dockerconfigjson}')
echo "Now set the following string in the stack's env/cluster.yaml pullSecret:"
echo ""
echo $secret
