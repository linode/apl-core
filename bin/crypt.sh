#!/usr/bin/env bash
set -e

. bin/common.sh

command=$1

case $command in
  encrypt | decrypt)
    [ -z "$QUIET" ] && printf "${COLOR_LIGHT_PURPLE}${command}ing secrets...${COLOR_NC}\n"
    crypt
    [ -z "$QUIET" ] && printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
    ;;
  rotate)
    [ -z "$QUIET" ] && printf "${COLOR_LIGHT_PURPLE}rotating secrets...${COLOR_NC}\n"
    rotate
    [ -z "$QUIET" ] && printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
    ;;
  *)
    echo "Invalid command: $command. Should be one of: decrypt|encrypt|rotate"
    exit 1
    ;;
esac
