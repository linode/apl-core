#!/usr/bin/env bash
. bin/common.sh

command=$1

case $command in
  encrypt | decrypt)
    crypt $command
    ;;
  rotate)
    rotate
    ;;
  *)
    echo "Invalid command: $command. Should be one of: decrypt|encrypt|rotate"
    exit 1
    ;;
esac
