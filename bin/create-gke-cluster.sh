#/usr/bin/env bash

. ./.gce

# create the cluster
gcloud beta container --project "$GCP_PROJECT" clusters create "$CLUSTER" --region "$REGION" \
  --no-enable-basic-auth --cluster-version "1.13.7-gke.8" --machine-type "n1-standard-4" \
  --image-type "COS" --disk-type "pd-standard" --disk-size "100" --node-labels customer=$CUSTOMER \
  --metadata disable-legacy-endpoints=true --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --max-pods-per-node "110" --num-nodes "1" --no-enable-cloud-logging --no-enable-cloud-monitoring \
  --enable-ip-alias --network "projects/$GCE_PROJECT/global/networks/default" \
  --subnetwork "projects/$GCE_PROJECT/regions/$REGION/subnetworks/default" \
  --default-max-pods-per-node "110" --enable-autoscaling --min-nodes "1" --max-nodes "10" \
  --enable-network-policy --addons HorizontalPodAutoscaling --enable-autoupgrade --enable-autorepair \
  --maintenance-window "01:00" --labels customer=$CUSTOMER --enable-tpu \
  --enable-autoprovisioning --min-cpu 1 --max-cpu 8 --min-memory 8 --max-memory 32 \
  --resource-usage-bigquery-dataset "$METERING_SET" --enable-network-egress-metering --enable-resource-consumption-metering

gcloud container clusters get-credentials $CLUSTER --region $REGION --project $GCP_PROJECT

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)