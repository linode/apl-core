#!/usr/bin/env bash
set -e

# called from a helm chart in helmfile.d folder, so root:
root=..

app=${1}
shift
args=${@:-''}

echo "Creating tmp chart from skeleton with manifests from: k8s/apps/$app"
# just copy the sources temporarily to /tmp if not there yet
[ -f "/tmp/charts/$app" ] && rm -rf /tmp/charts/$app
mkdir -p /tmp/charts/$app
cp -r $root/charts/skeleton/* /tmp/charts/$app/
sed -i -e "s/##CHART/$app/g" /tmp/charts/$app/Chart.yaml
printf "" > /tmp/charts/$app/all.yaml
if [ "$args" != "" ]; then
  kubectl apply $args -f $root/k8s/apps/$app --dry-run -o yaml > /tmp/charts/$app/all.yaml
else
  find $root/k8s/apps/$app/* -type f -name "*.yaml" -exec sh -c "cat {}; printf '\n---\n'" >> /tmp/charts/$app/all.yaml \;
fi
echo "manifests:"
