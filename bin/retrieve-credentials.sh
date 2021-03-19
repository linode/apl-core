#!/usr/bin/env bash

. bin/common.sh
[ -n "$CI" ] && exit 1
set -eo pipefail
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
    echo "$cluster_overrides doesn't exists"
fi

readonly secret_val=$(kubectl -n gitea get secret gitea-drone-secret -o yaml)
readonly drone_clientId=$(echo "$secret_val" | yq r - "data.clientId" | base64 --decode)
readonly drone_clientSecret=$(echo "$secret_val" | yq r - "data.clientSecret" | base64 --decode)

. $ENV_DIR/.secrets
cd $ENV_DIR/env
readonly secret_cluster_override="./clouds/$CLOUD/$CLUSTER/secrets.overrides.$CLOUD-$CLUSTER.yaml"
helm secrets dec $secret_cluster_override

yq w -i -I4 $secret_cluster_override.dec "charts.drone.sourceControl.gitea.clientID" $drone_clientId # Defined in otomi-core/values/jobs/gitea.gotmpl
yq w -i -I4 $secret_cluster_override.dec "charts.drone.sourceControl.gitea.clientSecretValue" $drone_clientSecret # Defined in otomi-core/values/jobs/gitea.gotmpl


helm secrets enc $secret_cluster_override
rm $secret_cluster_override.dec
cd -
