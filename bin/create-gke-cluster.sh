#!/usr/bin/env bash
set -eo pipefail

readonly VERBOSE=${VERBOSE:-}
readonly PROJECT_ID=${PROJECT_ID:-otomi-cloud}
readonly GOOGLE_REGION=${GOOGLE_REGION:-europe-west4}
readonly RELEASE_CHANNEL=${RELEASE_CHANNEL:-default}
readonly K8S_VERSION=${K8S_VERSION:-'1.17.14-gke.1600'}
readonly CLUSTER=${CLUSTER:-dev}
readonly METERING_SET=${METERING_SET:-otomi_metering}
readonly CUSTOMER=${CUSTOMER:-otomi}

print_envs() {
  echo "PROJECT_ID: $PROJECT_ID"
  echo "GOOGLE_REGION: $GOOGLE_REGION"
  echo "RELEASE_CHANNEL: $RELEASE_CHANNEL"
  echo "K8S_VERSION: $K8S_VERSION"
  echo "CLUSTER: $CLUSTER"
  echo "METERING_SET: $METERING_SET"
  echo "CUSTOMER: $CUSTOMER"
}

[ -n "$VERBOSE" ] && print_envs

# create the cluster
gcloud container clusters create "otomi-gke-$CLUSTER" \
  --project "$PROJECT_ID" \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing \
  --cluster-version "$K8S_VERSION" \
  --disk-size "100" \
  --disk-type "pd-standard" \
  --enable-autoprovisioning \
  --enable-autorepair \
  --enable-autoscaling \
  --enable-autoupgrade \
  --enable-ip-alias \
  --enable-network-egress-metering \
  --enable-network-policy \
  --enable-resource-consumption-metering \
  --enable-tpu \
  --image-type "COS" \
  --labels customer="$CUSTOMER" \
  --machine-type "n1-standard-4" \
  --maintenance-window "01:00" \
  --max-cpu 8 \
  --max-memory 32 \
  --max-nodes "7" \
  --metadata disable-legacy-endpoints=true \
  --min-cpu 4 \
  --min-memory 8 \
  --min-nodes "1" \
  --network "projects/$PROJECT_ID/global/networks/default" \
  --no-enable-basic-auth \
  --no-enable-stackdriver-kubernetes \
  --node-labels customer="$CUSTOMER" \
  --num-nodes "1" \
  --region "$GOOGLE_REGION" \
  --resource-usage-bigquery-dataset "$METERING_SET" \
  --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --release-channel "$RELEASE_CHANNEL" \
  --subnetwork "projects/$PROJECT_ID/regions/$GOOGLE_REGION/subnetworks/default"
# --enable-pod-security-policy

gcloud container clusters get-credentials otomi-gke-$CLUSTER --region $GOOGLE_REGION --project $PROJECT_ID

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)
