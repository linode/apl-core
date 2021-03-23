#!/usr/bin/env bash
. bin/common.sh
[ -n "$CI" ] && exit 1
set -eo pipefail
[ -f $ENV_DIR/.secrets ] && . $ENV_DIR/.secrets
prepare_crypt
readonly values=$(hf_values)
readonly gitea_enabled=$(echo "$values" | yq r - 'charts.gitea.enabled')
readonly drone_enabled=$(echo "$values" | yq r - 'charts.drone.enabled')
[ "$gitea_enabled" != "true" ] && echo "Gitea is disabled" && exit 0
[ "$drone_enabled" != "true" ] && echo "Drone is disabled" && exit 0

readonly cluster_overrides="$ENV_DIR/env/clouds/$CLOUD/$CLUSTER/overrides.$CLOUD-$CLUSTER.yaml"
if [ -f $cluster_overrides ]; then
    yq w -i -I4 $cluster_overrides "charts.drone.repo" 'values' # Defined in otomi-core/values/jobs/gitea.gotmpl
    echo "$cluster_overrides updated"
else
    echo "$cluster_overrides doesn't exist"
fi


cd $ENV_DIR
readonly secret_val=$(kubectl -n gitea get secret gitea-drone-secret -o yaml)
readonly drone_clientId=$(echo "$secret_val" | yq r - "data.clientId" | base64 --decode)
readonly drone_clientSecret=$(echo "$secret_val" | yq r - "data.clientSecret" | base64 --decode)
readonly secret_cluster_override="./env/clouds/$CLOUD/$CLUSTER/secrets.overrides.$CLOUD-$CLUSTER.yaml"

if [ ! -f $secret_cluster_override ]; then
    echo "$secret_cluster_override doesn't exist"
    exit 0
fi

if [ -f ./.sops.yaml ]; then
    echo "Sops found, decrypting"
    helm secrets dec $secret_cluster_override


    yq w -i -I4 $secret_cluster_override.dec "charts.drone.sourceControl.gitea.clientIDa" $drone_clientId # Defined in otomi-core/values/jobs/gitea.gotmpl
    yq w -i -I4 $secret_cluster_override.dec "charts.drone.sourceControl.gitea.clientSecretValue" $drone_clientSecret # Defined in otomi-core/values/jobs/gitea.gotmpl

    helm secrets enc $secret_cluster_override
    rm $secret_cluster_override.dec
else
    echo "No sops found"
    yq w -i -I4 $secret_cluster_override "charts.drone.sourceControl.gitea.clientID" $drone_clientId # Defined in otomi-core/values/jobs/gitea.gotmpl
    yq w -i -I4 $secret_cluster_override "charts.drone.sourceControl.gitea.clientSecretValue" $drone_clientSecret # Defined in otomi-core/values/jobs/gitea.gotmpl
fi
cd -