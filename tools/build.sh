#!/usr/bin/env bash
TAG="v1.4.22"

cd tools >/dev/null 2>&1 || true

docker build -t otomi/base:$TAG -f Dockerfile.base --squash .
docker build -t otomi/tools:$TAG -f Dockerfile.tools --squash .
# Dockerfile.cli is built from github workflow

docker push otomi/base:$TAG
docker push otomi/tools:$TAG
