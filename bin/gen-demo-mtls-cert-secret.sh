#!/usr/bin/env bash
. bin/common.sh

set +e
run_crypt

readonly root=$(yqr dns.domain)
readonly dom="tlspass.$root"

loc='/tmp/otomi/ssl'
[ -f "$loc/$root.crt" ] && exit
[ ! -d "$loc" ] && mkdir -p $loc

# for demonstration of mtls passthrough
# see https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
openssl req -out $loc/$dom.csr -newkey rsa:2048 -nodes -keyout $loc/$dom.key -subj '/CN=$dom/O=some organization' -sha256
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=example Inc./CN=example.com' -keyout $loc/$root.key -out $loc/$root.crt -sha256
openssl x509 -req -days 365 -CA $loc/$root.crt -CAkey $loc/$root.key -set_serial 0 -in $loc/$dom.csr -out $loc/$dom.crt -sha256

# try to create the secret if it does not yet exist
if [ -z "$CI" ] && kubectl get ns team-demo && ! kubectl -n team-demo get secret nginx-server-certs >/dev/null; then
  kubectl -n team-demo create secret tls nginx-server-certs --key $loc/$dom.key --cert $loc/$dom.crt
fi
