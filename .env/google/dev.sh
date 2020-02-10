# first part used for bin/*-gke.sh:
export GOOGLE_REGION="europe-west4"
export PROJECT="otomi-cloud"
export CLUSTER_NAME="otomi-gke-${CLUSTER}"
export DNS_NAME="otomi.cloud"
export DNS_ZONE="otomi"
export METERING_SET="otomi_metering"

# used for stack deployment:
export K8S_CONTEXT="gks_${PROJECT}_${GOOGLE_REGION}_${CLUSTER_NAME}"
