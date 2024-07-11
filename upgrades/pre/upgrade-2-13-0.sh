#!/bin/bash

set -eu

kubectl delete job gitea-prepare -n maintenance
kubectl delete job harbor -n maintenance
kubectl delete job keycloak -n maintenance
