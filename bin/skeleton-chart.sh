#!/usr/bin/env bash
set -e

# called from a helm chart in helmfile.d folder, so root:
root=..

app=${1}
shift
args=${@:-''}
appDir=/tmp/charts/$app
tplDir="$appDir/templates"
tpls="$tplDir/all.yaml"

echo "Creating tmp chart from skeleton with manifests from: k8s/$app"
# just copy the sources temporarily to /tmp if not there yet
[ -f "/tmp/charts/$app" ] && echo "removing old $appDir" && rm -rf $appDir
mkdir -p $tplDir
cp -r $root/charts/skeleton/* $appDir/
sed -i -e "s/##CHART/$app/g" $appDir/Chart.yaml
printf "" >$tpls
if [ "$args" != "" ]; then
  kubectl apply $args -f $root/k8s/$app --dry-run -o yaml >$tpls
else
  find $root/k8s/$app/* -type f -name "*.yaml" -exec sh -c "cat {}; printf '\n---\n'" \; >>$tpls
fi
# sed -i -e 's/^[ \t]*#.*$//g' $tpls
sed -i -e 's/{{/{{ \`{{/g' $tpls
sed -i -e "s/}}/\` }}/g" $tpls
