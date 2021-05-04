#!/usr/local/env bash

# some exit handling for scripts to clean up
exitcode=0
script_message=''
function exit_handler() {
  local x=$?
  [ $x -ne 0 ] && exitcode=$x
  [ "$script_message" != '' ] && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  if [ -z "$SKIP_CLEANUP" ]; then
    [ -n "$VERBOSE" ] && echo "cleanup called"
    cleanup
  fi
  trap "exit $exitcode" EXIT ERR
  exit $exitcode
}
trap exit_handler EXIT ERR
function cleanup() {
  return 0
}
function abort() {
  cleanup
  trap 'exit 0' EXIT
  exit 0
}
trap abort SIGINT
