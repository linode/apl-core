#!/usr/local/env bash

#####
# Use OPTIONS/LONGOPTS(LONGOPTIONS) to set additional parameters.                       
# Returns:                                                                              
#    all -> if passed, sets to 'y' and can be used globally in conditional statements  
#    label -> if passed (e.g. label init=true), sets to label (e.g. 'init=true') and   
#             can be used globally in conditional statements                           
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

    OPTIONS=Al:
    LONGOPTS=all,label:

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
        -l | --label)
          label=$2
          shift 2
          ;;
        -A | --all)
          all='true'
          shift
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
    err "--all or --label not specified"
    exit 1
  fi
}
