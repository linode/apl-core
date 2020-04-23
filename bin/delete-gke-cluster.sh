#!/usr/bin/env bash

. bin/env.sh

# create the cluster
gcloud container --project "$PROJECT" clusters delete "$CLUSTER" --region "$GOOGLE_REGION"
