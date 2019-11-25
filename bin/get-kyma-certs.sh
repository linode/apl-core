#/usr/bin/env bash

. ./.gce

# get certs from letsencrypt for *.$DOMAIN (kyma only)
docker run -it --name certbot --rm \
  -v "$(pwd)/letsencrypt:/etc/letsencrypt" \
  certbot/dns-google \
  certonly \
  -m $CERT_ISSUER_EMAIL --agree-tos --no-eff-email \
  --dns-google \
  --dns-google-credentials /etc/letsencrypt/key.json \
  --server https://acme-v02.api.letsencrypt.org/directory \
  -d "*.$DOMAIN"
