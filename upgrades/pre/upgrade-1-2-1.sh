#!/bin/bash

set -eu

if [[ $(helm status -n velero velero 2>/dev/null) ]]; then
    echo "Found old velero release. Will anotate stuff"
    # kubectl annotate 
else
    echo "Trivy Operator helm release not found"
fi

