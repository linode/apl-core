#!/usr/bin/env bash
set -ex

# called from a helm chart in helmfile.d folder, so root:
root=..

app=${1}
subFolder=''
[ -n "$2" ] && subFolder="/${k8sVersion}"
appDir=/tmp/charts/$app$subFolder
tplDir="$appDir/templates"
tpls="$tplDir/all.yaml"
SKEL_DIR=${SKEL_DIR:-'k8s'}

echo "Creating tmp chart from skeleton with manifests from: $SKEL_DIR/$app"
# just copy the sources temporarily to /tmp if not there yet
[ -f "/tmp/charts/$app" ] && echo "removing old $appDir" && rm -rf $appDir
mkdir -p $tplDir
cp -r $root/charts/skeleton/* $appDir/
sed -i -e "s/##CHART/$app/g" $appDir/Chart.yaml
printf "" >$tpls
find $root/$SKEL_DIR/$app$subFolder/* -type f -name "*.yaml" -exec sh -c "cat {}; printf '\n---\n'" \; >>$tpls
# sed -i -e 's/^[ \t]*#.*$//g' $tpls
sed -i -e 's/{{/{{ \`{{/g' $tpls
sed -i -e "s/}}/\` }}/g" $tpls
