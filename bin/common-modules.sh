#!/usr/local/env bash

#####
# Use OPTIONS/LONGOPTS(LONGOPTIONS) to set additional parameters.
# Resources:
# - https://github.com/google/styleguide/blob/gh-pages/shellguide.md#s4.2-function-comments
# - https://stackoverflow.com/a/29754866
#####
function parse_args() {
  if [[ "$*" != "" ]]; then
    ! getopt --test >/dev/null
    if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
      err '`getopt --test` failed in this environment.'
      exit 1
    fi

    OPTIONS=Al:c:
    LONGOPTS=all,label:,cluster:

    # - regarding ! and PIPESTATUS see above
    # - temporarily store output to be able to check for errors
    # - activate quoting/enhanced mode (e.g. by writing out “--options”)
    # - pass arguments only via   -- "$@"   to separate them correctly
    ! PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
      exit 1
    fi
    eval set -- "$PARSED"
    while true; do
      case "$1" in
        -A | --all)
          ALL_OPT='true'
          shift
          ;;
        -c | --cluster)
          CLUSTER_OPT=$2
          shift 2
          ;;
        -l | --label)
          LABEL_OPT=$2
          shift 2
          ;;
        --)
          shift
          break
          ;;
        *)
          err "Programming error: expected '--' but got $1"
          exit 1
          ;;
      esac
    done
  else
    err "--all, --cluster or --label not specified"
    exit 1
  fi
}

function validate_resources() {
  local cmd=$1
  shift
  parse_args "$@"
  [ -n "$ALL_OPT" ] && [ -n "$CLUSTER_OPT" ] && err "cannot specify --all and --cluster simultaneously" && exit 1
  if [ -n "$ALL_OPT" ]; then
    for_each_cluster $cmd
    exit 0
  else
    $cmd
    exit 0
  fi
}
