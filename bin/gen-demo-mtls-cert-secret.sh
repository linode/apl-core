#!/usr/bin/env bash

loc='./ssl'
[ -d "$loc" ] && exit
mkdir $loc

# for demonstration of mtls passthrough
# see https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
openssl req -out $loc/nginx.example.com.csr -newkey rsa:2048 -nodes -keyout $loc/nginx.example.com.key -subj '/CN=nginx.example.com/O=some organization' -sha256
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=example Inc./CN=example.com' -keyout $loc/example.com.key -out $loc/example.com.crt -sha256
openssl x509 -req -days 365 -CA $loc/example.com.crt -CAkey $loc/example.com.key -set_serial 0 -in $loc/nginx.example.com.csr -out $loc/nginx.example.com.crt -sha256

kubectl -n team-demo create secret tls nginx-server-certs --key $loc/nginx.example.com.key --cert $loc/nginx.example.com.crt
