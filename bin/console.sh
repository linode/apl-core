#!/usr/bin/env bash
set -e
[ "$OTOMI_PULLSECRET" == "" ] && echo "OTOMI_PULLSECRET not given!" && exit 1
[ "$ENV_DIR" == "" ] && echo "ENV_DIR not known!" && exit 1

repo="eu.gcr.io"
img_api="$repo/otomi-cloud/otomi-stack-api:latest"
img_web="$repo/otomi-cloud/otomi-stack-web:latest"
cmd="docker-compose -f docker-compose.yml -f docker-compose-deps.yml -f docker-compose-all.yml"

docker login -u _json_key -p '$(echo $OTOMI_PULLSECRET | base64 -d)' $repo
docker pull $img_api $img_web
container_id=$(docker create $img_web)

docker cp $container_id:/app/docker-compose /tmp/docker-compose
docker cp $container_id:/app/docker-compose.yml /tmp/docker-compose.yml
docker cp $container_id:/app/docker-compose-all.yml /tmp/docker-compose-all.yml
docker cp $container_id:/app/docker-compose-deps.yml /tmp/docker-compose-deps.yml
cp $PWD/core.yaml /tmp/docker-compose/

(
  cd /tmp
  $cmd pull && GIT_LOCAL_PATH=$ENV_DIR $cmd up
  cd -
)
docker rm $container_id
