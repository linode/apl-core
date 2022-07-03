# demo-tlspass

generate ssh stuff:
```bash
export CLUSTER_DOMAINSUFFIX='doma.in'
export DOMAIN="demo-tlspass.$CLUSTER_DOMAINSUFFIX"
bash bin/gen-certs.sh
```

copy+paste the contents of
- `server.crt` into `apps.demo-tlspass.tlsCert`
- `server.key` into `apps.demo-tlspass.tlsKey`

install this chart:
```bash
otomi apply -l name=demo-tlspass
```

run:
```bash
curl --cert .ssh/client.crt --key .ssh/client.key --cacert .ssh/ca.crt https://$DOMAIN:443
# check server cert info:
echo | openssl s_client -showcerts -servername gnupg.org -connect $DOMAIN:443 2>/dev/null | openssl x509 -inform pem -noout -text
```