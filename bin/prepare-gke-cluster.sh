#/usr/bin/env bash

# prerequites:
# gcloud auth login
. ./.gce

# create a metering table that will store records for 10 years
bq --location=EU mk -d --default_table_expiration 315360000 --description "Contains billing records based on labels." $METERING_SET

# create the project
gcloud projects create $GCP_PROJECT --organization=$ORG_ID --labels=customer=$CUSTOMER

#create the dns zone
gcloud dns --project=$GCP_PROJECT managed-zones create $DNS_ZONE --description= --dns-name=$DNS_NAME

echo "Get the domain servers from the $DNS_ZONE dns zone by clicking here:"
echo "https://console.cloud.google.com/net-services/dns/zones/$DNS_ZONE/?project=$GCP_PROJECT&authuser=1&organizationId=$ORG_ID&orgonly=true"
echo "and make sure the domain registrar uses them, then continue here"

echo -n "Ready to proceed (y/n)? "
read answer
if [ "$answer" != "${answer#[Yy]}" ]; then
  exit
fi

# set up dns manager and letsencrypt access
mkdir letsencrypt >/dev/null
gcloud iam service-accounts create dnsmanager --display-name "dnsmanager" --project "$GCP_PROJECT"
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member serviceAccount:dnsmanager@$GCP_PROJECT.iam.gserviceaccount.com --role roles/dns.admin
gcloud iam service-accounts keys create ./letsencrypt/key.json --iam-account dnsmanager@$GCP_PROJECT.iam.gserviceaccount.com
