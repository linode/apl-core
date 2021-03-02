#!/usr/local/env bash

echo "Waiting until gitea is accessible at $GITEA_URL"
until $(curl $INSECURE --output /dev/null --silent --head --fail -I $GITEA_URL); do 
    printf '.'
    sleep 5
done
echo READY!