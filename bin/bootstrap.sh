#!/usr/bin/env bash
[[ "${BASH_SOURCE[0]}" != "${0}" ]] && echo "Sourcing env..." && SOURCING=true
set -e

install_demo_files=$1

# source env
ENV_DIR=${ENV_DIR:-./env}
STACK_VERSION=${STACK_VERSION:-latest}
alias otomi="${ENV_DIR}/bin/otomi"

if [ ! $SOURCING ]; then
  # install CLI
  otomi_path="${ENV_DIR}/bin/"
  mkdir -p $otomi_path &>/dev/null
  if [ -f "$ENV_DIR/env.ini" ]; then
    source $ENV_DIR/env.ini
    # we now always lock on env.ini version and want the CLUSTER env var
    [[ -z "$CLUSTER" ]] && echo "Error: The CLUSTER environment variable is not set" && exit 2
    eval "STACK_VERSION=\$${CLUSTER}Version"
  fi
  img="eu.gcr.io/otomi-cloud/otomi-stack:${STACK_VERSION}"
  echo "Installing Otomi artifacts from ${img}"
  set +e
  docker info &>/dev/null
  if [ "$?" == "0" ]; then
    cid="$(docker create $img):"
    cmd="docker cp ${cid}:"
    docker="docker"
  fi
  set -e
  $docker cp ${cid}/home/app/stack/bin/aliases $otomi_path
  $docker cp ${cid}/home/app/stack/bin/otomi $otomi_path
  $docker cp -r ${cid}/home/app/stack/.values/.vscode $ENV_DIR/
  for f in '.drone.tpl.yml' '.gitattributes' '.sops.yaml' 'env.ini' 'README.md'; do
    [ ! -f $ENV_DIR/$f ] && $docker cp ${cid}/home/app/stack/.values/$f $ENV_DIR/
  done
  for f in '.gitignore' '.prettierrc.yml'; do
    $docker cp ${cid}/home/app/stack/.values/$f $ENV_DIR/
  done
  if [ "$install_demo_files" != "" ]; then
    echo "Installing demo files"
    $docker cp -r ${cid}/home/app/stack/.demo/* $ENV_DIR/
  fi
  [ ! -z "$cid" ] && $docker rm ${cid} >/dev/null
  echo "You can now use otomi CLI :)"
fi
