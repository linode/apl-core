#!/usr/bin/env bash
set -eo pipefail

[[ -z $ENV_DIR || -z $CLUSTER ]] && echo "ENV_DIR and CLUSTER must be set" && exit 1

readonly ENV_DIR
readonly CLUSTER
readonly METERING_SET=${METERING_SET:-otomi_metering}
readonly VERBOSE=${VERBOSE:-0}

readonly PROJECT_ID=${PROJECT_ID:-$(yq read $ENV_DIR/env/clusters.yaml google.projectId)}
readonly GOOGLE_REGION=${GOOGLE_REGION:-$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.region)}
readonly CUSTOMER=${CUSTOMER:-$(yq read $ENV_DIR/env/settings.yaml customer.name)}
readonly K8S_VERSION=${K8S_VERSION:-$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.k8sVersion)}
readonly K8S_NODE_VERSION=${K8S_NODE_VERSION:-$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.k8sNodeVersion)}
readonly RELEASE_CHANNEL=${RELEASE_CHANNEL:-$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.releaseChannel)}

print_envs() {
  echo "ENV_DIR: $ENV_DIR"
  echo "CLUSTER: $CLUSTER"
  echo "PROJECT_ID: $PROJECT_ID"
  echo "GOOGLE_REGION: $GOOGLE_REGION"
  echo "K8S_VERSION: $K8S_VERSION"
  echo "K8S_NODE_VERSION: $K8S_NODE_VERSION"
  echo "CUSTOMER: $CUSTOMER"
  echo "METERING_SET: $METERING_SET"
  echo "RELEASE_CHANNEL: $RELEASE_CHANNEL"
}

[ $VERBOSE -eq "1" ] && print_envs

# create the cluster
gcloud container clusters create "otomi-gke-$CLUSTER" \
  --project "$PROJECT_ID" \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing \
  --cluster-version $K8S_NODE_VERSION \
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
  --network "projects/$PROJECT_ID/global/networks/default" \
  --no-enable-basic-auth \
  --no-enable-stackdriver-kubernetes \
  --node-labels customer=$CUSTOMER \
  --num-nodes "1" \
  --region "$GOOGLE_REGION" \
  --resource-usage-bigquery-dataset "$METERING_SET" \
  --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --subnetwork "projects/$PROJECT_ID/regions/$GOOGLE_REGION/subnetworks/default" # --cluster-version $K8S_VERSION \
# --release-channel "$RELEASE_CHANNEL"
# --enable-pod-security-policy

gcloud container clusters get-credentials otomi-gke-$CLUSTER --region $GOOGLE_REGION --project $PROJECT_ID

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)
