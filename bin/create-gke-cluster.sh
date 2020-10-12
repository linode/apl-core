#!/usr/bin/env bash
set -euo pipefail

[ -z $ENV_DIR ] && echo "ENV_DIR must be set" && exit 1
[ -z $CLUSTER ] && echo "CLUSTER must be set" && exit 1

readonly ENV_DIR
readonly CLUSTER
readonly METERING_SET=${METERING_SET:-otomi_metering}
readonly VERBOSE=${VERBOSE:-0}

readonly project=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.projectId)
readonly google_region=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.region)
readonly customer=$(yq read $ENV_DIR/env/settings.yaml customer.name)
readonly k8s_version=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.k8sVersion)

print_envs() {
  echo "ENV_DIR: $ENV_DIR"
  echo "CLUSTER: $CLUSTER"
  echo "PROJECT: $project"
  echo "GOOGLE_REGION: $google_region"
  echo "K8S_VERSION: $k8s_version"
  echo "CUSTOMER: $customer"
  echo "METERING_SET: $METERING_SET"
}

[ $VERBOSE -eq "1" ] && print_envs

# create the cluster
gcloud container \
  --project "$project" \
  clusters create "otomi-gke-$CLUSTER" \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing \
  --cluster-version $k8s_version \
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
  --labels customer=$customer \
  --machine-type "n1-standard-4" \
  --maintenance-window "01:00" \
  --max-cpu 8 \
  --max-memory 32 \
  --max-nodes "7" \
  --metadata disable-legacy-endpoints=true \
  --min-cpu 4 \
  --min-memory 8 \
  --min-nodes "1" \
  --network "projects/$project/global/networks/default" \
  --no-enable-basic-auth \
  --no-enable-stackdriver-kubernetes \
  --node-labels customer=$customer \
  --num-nodes "1" \
  --region "$google_region" \
  --resource-usage-bigquery-dataset "$METERING_SET" \
  --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --subnetwork "projects/$project/regions/$google_region/subnetworks/default"
# --enable-pod-security-policy

gcloud container clusters get-credentials otomi-gke-$CLUSTER --region $google_region --project $project

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)
