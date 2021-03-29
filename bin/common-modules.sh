#!/usr/local/env bash

# some exit handling for scripts to clean up
exitcode=0
script_message=''
function exit_handler() {
  local x=$?
  [ $x -ne 0 ] && exitcode=$x
  [ "$script_message" != '' ] && ([ $exitcode -eq 0 ] && echo "$script_message SUCCESS" || err "$script_message FAILED")
  cleanup
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

#####
# Use OPTIONS/LONGOPTS(LONGOPTIONS) to set additional parameters.
# Resources:
# - https://github.com/google/styleguide/blob/gh-pages/shellguide.md#s4.2-function-comments
# - https://stackoverflow.com/a/29754866
#####
function parse_args() {
  ! getopt --test >/dev/null
  if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
    err '`getopt --test` failed in this environment.'
    exit 1
  fi

  OPTIONS=Ac:f:l:
  LONGOPTS=all,cluster:,file:,label:

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
      -f | --file)
        FILE_OPT=$2
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
}

function hf_templates() {
  [ -n "$DEBUG" ] && keep="--skip-cleanup"
  if [ -n "$1" ]; then
    local out_dir="$1"
    [ -z "$LABEL_OPT" ] && hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps --output-dir="$out_dir" $keep >/dev/null
    hf $(echo ${LABEL_OPT:+"-l $LABEL_OPT"} | xargs) template --skip-deps --output-dir="$out_dir" $keep >/dev/null
  else
    [ -z "$FILE_OPT" ] && [ -z "$LABEL_OPT" ] && hf -f helmfile.tpl/helmfile-init.yaml template --skip-deps $keep 2>&1 | grep -Ev $helmfile_output_hide_tpl
    hf $(echo ${FILE_OPT:+"-l $FILE_OPT"} ${LABEL_OPT:+"-l $LABEL_OPT"} | xargs) template --skip-deps $keep 2>&1 | grep -Ev $helmfile_output_hide_tpl
  fi
}
