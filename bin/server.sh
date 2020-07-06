#!/usr/bin/env bash
if [ "$GCLOUD_SERVICE_KEY" = "" ]; then
  echo 'GCLOUD_SERVICE_KEY not set!'
  exit 1
fi
echo "Starting netcat server at port 17771"
while true; do
  nc -l -p 17771 -e bin/serve-handler.sh
done
