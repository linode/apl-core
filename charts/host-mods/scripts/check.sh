#!/usr/bin/env sh
if kubectl get nodes -o wide | awk 'FNR == 2 {print $NF}' | grep containerd; then
  touch /otomi/hascontainerd
fi
