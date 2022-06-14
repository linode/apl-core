#!/usr/bin/env bash

# called from a helm chart in helmfile.d folder, so root:
root=..
set -x
app=${1}
subFolder=''
[ -n "$2" ] && subFolder="/$2"
appDir="/tmp/charts/$app"
rm -rf /tmp/charts/* /tmp/charts/.* >/dev/null
tplDir="$appDir/templates"
tpls="$tplDir/all.yaml"
SKEL_DIR=${SKEL_DIR:-'k8s'}

echo "Creating tmp chart from skeleton with manifests from: $SKEL_DIR/$app"
mkdir -p $tplDir
# copy the chart sources temporarily to /tmp/charts/${release}${subfolder}
cp -r $root/charts/skeleton/* $appDir/
sed -i -e "s/##CHART/$app/g" $appDir/Chart.yaml
printf "" >$tpls
set -x
find $root/$SKEL_DIR/${app}${subFolder}/* -type f -name "*.yaml" -exec sh -c "cat {}; printf '\n---\n'" \; >>$tpls
sed -i -e 's/{{/{{ \`{{/g' $tpls
sed -i -e "s/}}/\` }}/g" $tpls
