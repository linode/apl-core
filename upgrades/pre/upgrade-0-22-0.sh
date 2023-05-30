#!/bin/bash

set -eu

[[ ! $(helm status -n harbor harbor) ]] && echo "Harbor doesn't exist. Skipping" && exit 0

kubectl -n harbor scale deploy/harbor-core --replicas 0
