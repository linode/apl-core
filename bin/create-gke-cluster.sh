#!/usr/bin/env bash
set -e

[ -z $ENV_DIR ] && echo "ENV_DIR must be set" && exit 1
[ -z $CLUSTER ] && echo "CLUSTER must be set" && exit 1

METERING_SET=${METERING_SET:-otomi_metering}
VERBOSE=${VERBOSE:-0}

PROJECT=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.projectId)
GOOGLE_REGION=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.region)
CUSTOMER=$(yq read $ENV_DIR/env/settings.yaml customer.name)
K8S_VERSION=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.k8sVersion)

print_envs() {
  echo "ENV_DIR: $ENV_DIR"
  echo "CLUSTER: $CLUSTER"
  echo "PROJECT: $PROJECT"
  echo "GOOGLE_REGION: $GOOGLE_REGION"
  echo "K8S_VERSION: $K8S_VERSION"
  echo "CUSTOMER: $CUSTOMER"
  echo "METERING_SET: $METERING_SET"
}

[ $VERBOSE -eq "1" ] && print_envs

# create the cluster
gcloud container \
  --project "$PROJECT" \
  clusters create "otomi-gke-$CLUSTER" \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing \
  --cluster-version $K8S_VERSION \
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
  --labels customer=$CUSTOMER \
  --machine-type "n1-standard-4" \
  --maintenance-window "01:00" \
  --max-cpu 8 \
  --max-memory 32 \
  --max-nodes "7" \
  --metadata disable-legacy-endpoints=true \
  --min-cpu 4 \
  --min-memory 8 \
  --min-nodes "1" \
  --network "projects/$PROJECT/global/networks/default" \
  --no-enable-basic-auth \
  --no-enable-stackdriver-kubernetes \
  --node-labels customer=$CUSTOMER \
  --num-nodes "1" \
  --region "$GOOGLE_REGION" \
  --resource-usage-bigquery-dataset "$METERING_SET" \
  --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --subnetwork "projects/$PROJECT/regions/$GOOGLE_REGION/subnetworks/default"
# --enable-pod-security-policy

gcloud container clusters get-credentials otomi-gke-$CLUSTER --region $GOOGLE_REGION --project $PROJECT

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)
