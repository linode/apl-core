#!/usr/bin/env bash

cluster=${1:-'otomi-control'}

# create bigquery dataset to keep billing tables for 10 years
bq --location=EU mk -d \
--default_table_expiration 315360000 \
--description "Contains billing records based on labels." \
otomi_billing

gcloud beta container --project "otomi-247314" clusters create "$cluster" --zone "europe-west1-b" --no-enable-basic-auth --cluster-version "1.13.7-gke.8" --machine-type "n1-standard-1" --image-type "COS" --disk-type "pd-standard" --disk-size "100" --node-labels environment=dev --metadata disable-legacy-endpoints=true --scopes "https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append" --num-nodes "1" --no-enable-cloud-logging --no-enable-cloud-monitoring --enable-ip-alias --network "projects/otomi-247314/global/networks/default" --subnetwork "projects/otomi-247314/regions/europe-west1/subnetworks/default" --default-max-pods-per-node "110" --additional-zones "europe-west1-b","europe-west1-c","europe-west1-d" --enable-autoscaling --min-nodes "0" --max-nodes "1" --enable-network-policy --addons HorizontalPodAutoscaling,HttpLoadBalancing --enable-autoupgrade --enable-autorepair --maintenance-window "01:00" --labels org=otomi --resource-usage-bigquery-dataset "otomi" --enable-network-egress-metering --enable-resource-consumption-metering --identity-namespace "otomi-247314.svc.id.goog"
