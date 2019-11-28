#/usr/bin/env bash

. ./.env

# create the cluster
gcloud beta container --project "$GCP_PROJECT" clusters create "$CLUSTER-$STAGE" --region "$REGION" \
  --no-enable-basic-auth --cluster-version "1.14.8-gke.17" --machine-type "n1-standard-4" \
  --image-type "COS" --disk-type "pd-standard" --disk-size "100" --node-labels customer=$CUSTOMER \
  --metadata disable-legacy-endpoints=true --scopes "https://www.googleapis.com/auth/cloud-platform" \
  --max-pods-per-node "110" --num-nodes "1" --no-enable-cloud-logging --no-enable-cloud-monitoring \
  --enable-ip-alias --network "projects/$GCE_PROJECT/global/networks/default" \
  --subnetwork "projects/$GCE_PROJECT/regions/$REGION/subnetworks/default" \
  --default-max-pods-per-node "110" --enable-autoscaling --min-nodes "1" --max-nodes "10" \
  --enable-network-policy --addons HorizontalPodAutoscaling,HttpLoadBalancing --enable-autoupgrade --enable-autorepair \
  --maintenance-window "01:00" --labels customer=$CUSTOMER --enable-tpu \
  --enable-autoprovisioning --min-cpu 4 --max-cpu 8 --min-memory 8 --max-memory 32 \
  --resource-usage-bigquery-dataset "$METERING_SET" --enable-network-egress-metering --enable-resource-consumption-metering
# --enable-pod-security-policy

gcloud container clusters get-credentials $CLUSTER-$STAGE --region $REGION --project $GCP_PROJECT

kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=$(gcloud config get-value account)

# # ADDITIONAL FIREWALL RULES FOR PRIVATE CLUSTER:
# SOURCE=$(gcloud container clusters describe $CLUSTER --region $REGION | grep clusterIpv4CidrBlock | cut -d ':' -f 2 | tr -d ' ')
# # 1) Retrieve the network tag automatically given to the worker nodes
# # NOTE: this only works if you have only one cluster in your GCP project. You will have to manually inspect the result of this command to find the tag for the cluster you want to target
# WORKER_NODES_TAG=$(gcloud compute instances list --format='text(tags.items[0])' --filter='metadata.kubelet-config:*' | grep tags | awk '{print $2}' | sort | uniq)
# # 2) Take note of the VPC network in which you deployed your cluster
# # NOTE this only works if you have only one network in which you deploy your clusters
# NETWORK=$(gcloud compute instances list --format='text(networkInterfaces[0].network)' --filter='metadata.kubelet-config:*' | grep networks | awk -F'/' '{print $NF}' | sort | uniq)
# # 3) Create the firewall rule targeting the tag above
# gcloud compute firewall-rules create k8s-cert-manager \
#   --source-ranges $SOURCE \
#   --target-tags $WORKER_NODES_TAG \
#   --allow TCP:6443 --network $NETWORK
