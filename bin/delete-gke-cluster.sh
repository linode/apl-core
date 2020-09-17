#!/usr/bin/env bash
. bin/aliases

set -e
ENV_DIR=${ENV_DIR:-'./env'}
. $ENV_DIR/env/clouds/$CLOUD/clusters/$CLUSTER/.env

# delete the cluster
otomi x gcloud container --project "$PROJECT" clusters delete "$CLUSTER" --region "$GOOGLE_REGION"
