#!/bin/bash

set -eu

if [[ $(helm status -n velero velero 2>/dev/null) ]]; then
    echo "Found old velero release. Will anotate otomi BackupStorageLocation CR."
    kubectl annotate -n velero backupstoragelocations.velero.io otomi meta.helm.sh/release-name=velero meta.helm.sh/release-namespace=velero
    kubectl annotate -n velero volumesnapshotlocations.velero.io  otomi meta.helm.sh/release-name=velero meta.helm.sh/release-namespace=velero
else
    echo "Velero helm release not found"
fi