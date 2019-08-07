#!/usr/bin/env bash
set -e

# called from a helm chart in helmfile.d folder, so root:
root=..

app=${1}
action=${2:-'destroy'}
type=${3:-'chart'}
args=${4:-''}

if [ "$action" != "destroy" ]; then
  echo "CREATE: $type"
  # just copy the sources temporarily to /tmp if not there yet
  [ -f "/tmp/charts/$app" ] && rm -rf /tmp/charts/$app
  mkdir -p /tmp/charts/$app
  cp -r $root/charts/skeleton/* /tmp/charts/$app/
  if [ "$type" != "chart" ]; then
    echo "output:" > /tmp/charts/$app/templates/NOTES.txt
    kubectl apply $args -f $root/k8s/apps/$app --recursive >> /tmp/charts/$app/templates/NOTES.txt
  else
    cp -r $root/k8s/apps/$app/* /tmp/charts/$app/templates/
  fi
else
  echo "DESTROY: $type"
  if [ "$type" != "chrt" ]; then
    kubectl delete $args -f $root/k8s/apps/$app --recursive
  fi
  rm -rf /tmp/charts/$app > /dev/null
fi  