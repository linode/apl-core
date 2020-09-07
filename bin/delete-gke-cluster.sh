#!/usr/bin/env bash

. bin/env.sh

# delete the cluster
gcloud container --project "$PROJECT" clusters delete "$CLUSTER" --region "$GOOGLE_REGION"
