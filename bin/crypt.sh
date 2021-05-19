#!/usr/bin/env bash
set -e

. bin/common.sh

command=$1

case $command in
  encrypt | decrypt)
    [ -n "$VERBOSE" ] && printf "${COLOR_LIGHT_PURPLE}${command}ing secrets...${COLOR_NC}\n"
    crypt $command
    [ -n "$VERBOSE" ] && printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
    ;;
  rotate)
    [ -n "$VERBOSE" ] && printf "${COLOR_LIGHT_PURPLE}rotating secrets...${COLOR_NC}\n"
    rotate
    [ -n "$VERBOSE" ] && printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
    ;;
  *)
    echo "Invalid command: $command. Should be one of: decrypt|encrypt|rotate"
    exit 1
    ;;
esac
