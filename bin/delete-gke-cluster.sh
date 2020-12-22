#!/usr/bin/env bash
set -euo pipefail

ENV_DIR=${ENV_DIR:-'./env'}

readonly project=$(yq read $ENV_DIR/env/clusters.yaml google.projectId)
readonly google_region=$(yq read $ENV_DIR/env/clusters.yaml clouds.google.clusters.$CLUSTER.region)
readonly customer=$(yq read $ENV_DIR/env/settings.yaml customer.name)

# delete the cluster
gcloud container --project "$project" clusters delete "$customer-gke-$CLUSTER" --region "$google_region"
