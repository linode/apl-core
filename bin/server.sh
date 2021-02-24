#!/usr/bin/env bash
echo "Starting netcat server at port 17771"
while true; do
  nc -l -p 17771 -e bin/serve-handler.sh
done
