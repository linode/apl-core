#!/usr/bin/env bash
. bin/common.sh

set +e
crypt

readonly root=$(yqr cluster.domainSuffix)
readonly dom="tlspass.$root"

loc='/tmp/otomi/ssl'
# rm -rf /tmp/otomi/ssl
[ -f "$loc/$root.crt" ] && exit
[ ! -d "$loc" ] && mkdir -p $loc

echo "Generating key and cert for domain: $dom"
# for demonstration of mtls passthrough
# see https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
openssl req -out $loc/$dom.csr -newkey rsa:2048 -nodes -keyout $loc/$dom.key -subj "/CN=$dom/O=RedKubes" -sha256
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj "/O=RedKubes Inc./CN=$dom" -keyout $loc/$root.key -out $loc/$root.crt -sha256
openssl x509 -req -days 365 -CA $loc/$root.crt -CAkey $loc/$root.key -set_serial 0 -in $loc/$dom.csr -out $loc/$dom.crt -sha256

echo "Done!"
echo "key:"
cat $loc/$root.key
echo ---
echo "crt:"
cat $loc/$dom.crt
