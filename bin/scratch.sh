#!/usr/bin/env bash
shopt -s expand_aliases
. bin/aliases

podname="drone-agent-656ff6d975-hs9wc"
service=drone.team-admin
ns=team-admin
svcport=80
path=/
podip=$(k -n $ns get pod $podname -o jsonpath='{.status.podip}')
k -n $ns exec $podname -c istio-proxy -- curl -v https://$service.svc.cluster.local:$svcport$path --resolve "$service.svc.cluster.local:$svcport:$podip" --key /etc/certs/key.pem --cert /etc/certs/cert-chain.pem --cacert /etc/certs/root-cert.pem --insecure
