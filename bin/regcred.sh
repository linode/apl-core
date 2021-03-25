#!/usr/bin/env bash
set -e
. bin/common.sh

function create_regcred() {

  OPTIONS=s:u:p:
  LONGOPTS=server:,username:,password:

  PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
  if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    exit 1
  fi
  eval set -- "$PARSED"
  while true; do
    case "$1" in
      -s | --server)
        server=$2
        shift 2
        ;;
      -u | --username)
        username=$2
        shift 2
        ;;
      -p | --password)
        password=$2
        shift 2
        ;;
      --)
        shift
        if [ -z "$server" ] || [ -z "$username" ] || [ -z "$password" ]; then
          [ -z "$server" ] && echo "server not specified with either -s or --server." >&2
          [ -z "$username" ] && echo "username not specified with either -u or --username." >&2
          [ -z "$password" ] && echo "password not specified with either -p or --password." >&2
          exit 1
        fi
        break
        ;;
      *)
        err "Invalid input: $1"
        exit 1
        ;;
    esac
  done

  kubectl create secret docker-registry --dry-run=client regcred --docker-server="$server" --docker-username="$username" --docker-password="$password" --docker-email=not@us.ed -ojsonpath='{.data.\.dockerconfigjson}' | base64 --decode
}

create_regcred "$@"
