#!/bin/bash

set -e

minikube stop 

export VALUES_INPUT=./chart/otomi/quickstart/values.yaml
export VERBOSITY=2
export ENV_DIR=/tmp/otomi/values
export CI=1

rm -rf $ENV_DIR
binzx/otomi bootstrap

minikube start
eval $(minikube docker-env)
helm install --dry-run otomi .