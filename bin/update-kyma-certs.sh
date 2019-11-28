#/usr/bin/env bash

. ./.env

# bin/get-kyma-certs.sh

KYMA_TLS_CERT=$(cat ./letsencrypt/live/$DOMAIN/fullchain.pem | base64 -w0)
KYMA_TLS_KEY=$(cat ./letsencrypt/live/$DOMAIN/privkey.pem | base64 -w0)

# override with custom domain
kubectl delete configmap owndomain-overrides -n kyma-installer &&
  kubectl create configmap owndomain-overrides -n kyma-installer --from-literal=global.domainName=$DOMAIN --from-literal=global.tlsCrt=$KYMA_TLS_CERT --from-literal=global.tlsKey=$KYMA_TLS_KEY &&
  kubectl label configmap owndomain-overrides -n kyma-installer installer=overrides

# update secrets
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
type: kubernetes.io/tls
metadata:
    name: istio-ingressgateway-certs
    namespace: istio-system
data:
    tls.crt: $(echo "$KYMA_TLS_CERT")
    tls.key: $(echo "$KYMA_TLS_KEY")
EOF

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
type: Opaque
metadata:
    name: ingress-tls-cert
    namespace: kyma-system
data:
    tls.crt: $(echo "$KYMA_TLS_CERT")
EOF

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
type: Opaque
metadata:
    name: ingress-tls-cert
    namespace: kyma-integration
data:
    tls.crt: $(echo "$KYMA_TLS_CERT")
EOF

# and remove dependent pods
kubectl delete pod -l app=istio-ingressgateway -n istio-system
kubectl delete pod -l tlsSecret=ingress-tls-cert -n kyma-system
kubectl delete pod -l tlsSecret=ingress-tls-cert -n kyma-integration
