#/usr/bin/env bash

. ./.gce

KYMA_VERSION=${KYMA_VERSION:-"1.3.0"}

TLS_CERT=$(cat ./letsencrypt/live/$DOMAIN/fullchain.pem | base64 | sed 's/ /\\ /g' | tr -d '\n');
TLS_KEY=$(cat ./letsencrypt/live/$DOMAIN/privkey.pem | base64 | sed 's/ /\\ /g' | tr -d '\n')

kubectl apply -f k8s/kyma/tiller-${KYMA_VERSION}.yaml

kubectl -n kube-system rollout status deploy/tiller-deploy

kubectl create namespace kyma-installer \
&& kubectl create configmap owndomain-overrides -n kyma-installer --from-literal=global.domainName=$DOMAIN --from-literal=global.tlsCrt=$TLS_CERT --from-literal=global.tlsKey=$TLS_KEY \
&& kubectl label configmap owndomain-overrides -n kyma-installer installer=overrides

kubectl apply -f k8s/kyma/kyma-installer-cluster-${KYMA_VERSION}.yaml

kubectl -n kyma-installer rollout status deploy/kyma-installer

kubectl get -n kyma-installer secret helm-secret -o jsonpath="{.data['global\.helm\.ca\.crt']}" | base64 --decode > "$(helm home)/ca.pem";
kubectl get -n kyma-installer secret helm-secret -o jsonpath="{.data['global\.helm\.tls\.crt']}" | base64 --decode > "$(helm home)/cert.pem";
kubectl get -n kyma-installer secret helm-secret -o jsonpath="{.data['global\.helm\.tls\.key']}" | base64 --decode > "$(helm home)/key.pem";

kubectl get pods --all-namespaces

while true; do \
  kubectl -n default get installation/kyma-installation -o jsonpath="{'Status: '}{.status.state}{', description: '}{.status.description}"; echo; \
  sleep 5; \
done

# kubectl -n kyma-installer logs -l 'name=kyma-installer'

export EXTERNAL_PUBLIC_IP=$(kubectl get service -n istio-system istio-ingressgateway -o jsonpath="{.status.loadBalancer.ingress[0].ip}")
export APISERVER_PUBLIC_IP=$(kubectl get service -n kyma-system apiserver-proxy-ssl -o jsonpath="{.status.loadBalancer.ingress[0].ip}")

gcloud dns --project=$GCP_PROJECT record-sets transaction start --zone=$DNS_ZONE
gcloud dns --project=$GCP_PROJECT record-sets transaction add $EXTERNAL_PUBLIC_IP --name=\*.$DOMAIN. --ttl=60 --type=A --zone=$DNS_ZONE
gcloud dns --project=$GCP_PROJECT record-sets transaction add $APISERVER_PUBLIC_IP --name=\apiserver.$DOMAIN. --ttl=60 --type=A --zone=$DNS_ZONE
gcloud dns --project=$GCP_PROJECT record-sets transaction execute --zone=$DNS_ZONE