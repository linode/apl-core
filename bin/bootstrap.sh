#!/usr/bin/env bash
[[ "${BASH_SOURCE[0]}" != "${0}" ]] && echo "Sourcing env..." && SOURCING=true
shopt -s expand_aliases
. bin/aliases
set -e

# source env
ENV_DIR=${ENV_DIR:-./env}
otomi_version=$(otomi_version)
alias otomi="${ENV_DIR}/bin/otomi"

if [ ! $SOURCING ]; then
  skip_demo_files=$1
  cid=''
  cmd_cp='cp -r'
  cp_path=''
  [ -f $ENV_DIR/bin/otomi ] && has_otomi=true

  # install CLI
  otomi_path="${ENV_DIR}/bin/"
  mkdir -p $otomi_path &>/dev/null
  img="eu.gcr.io/otomi-cloud/otomi-stack:v${otomi_version}"
  echo "Installing artifacts from ${img}"
  set +e
  docker info &>/dev/null
  if [ "$?" == "0" ]; then
    cid="$(docker create $img)"
    cp_path="${cid}:"
    cmd_cp="docker cp"
  fi
  set -e
  $cmd_cp ${cp_path}/home/app/stack/bin/aliases $otomi_path
  $cmd_cp ${cp_path}/home/app/stack/bin/otomi $otomi_path
  $cmd_cp ${cp_path}/home/app/stack/.values/.vscode $ENV_DIR/
  for f in '.drone.tpl.slack.yml' '.drone.tpl.msteams.yml' '.gitattributes' '.sops.yaml' 'README.md'; do
    [ ! -f $ENV_DIR/$f ] && $cmd_cp ${cp_path}/home/app/stack/.values/$f $ENV_DIR/
  done
  for f in '.gitignore' '.prettierrc.yml'; do
    $cmd_cp ${cp_path}/home/app/stack/.values/$f $ENV_DIR/
  done
  if [ "$skip_demo_files" != "1" ]; then
    echo "Installing demo files"
    $cmd_cp ${cp_path}/home/app/stack/.demo/* $ENV_DIR/
  fi
  [ ! -z "$cid" ] && docker rm ${cid} >/dev/null
  if [ ! $has_otomi ]; then
    echo "You can now use otomi CLI"
    echo "Start by sourcing aliases:"
    echo ". bin/aliases"
  fi
fi
