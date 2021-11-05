#!/bin/bash

set -e

# minikube start 

eval $(minikube docker-env)
helm install --dry-run otomi .