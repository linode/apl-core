



https://istio.io/docs/reference/config/security/conditions/

# Obtain JWT from Azure AD

Login
```
az login
RK_TOKEN=$(cat ~/.azure/accessTokens.json| jq  '.[0].accessToken')
```

You can also inspect accessToken:
```
cat ~/.azure/accessTokens.json| jq  '.[0].accessToken'|base64 --decode --ignore-garbage|jq
```


# Perform HTTP reqest with JWT
First perform request without JWT:
```
curl -H http://10.98.100.128/productpage
```
```
RK_TOKEN=$(cat ~/.azure/accessTokens.json| jq  '.[0].accessToken')


curl -v http://10.98.100.128/productpage \
-H "Authorization: Bearer ${RK_TOKEN}" 
```

# Troubleshooting

Enable istio ingress access logs
```
istioctl manifest apply --set values.global.proxy.accessLogFile="/dev/stdout"
```

Set log level
```
kubectl exec $(kubectl get pod --selector app=productpage --output jsonpath='{.items[0].metadata.name}') -c istio-proxy -- curl -X POST http://localhost:15000/logging?level=debug
```


kubectl exec $(kubectl get pod --selector app=productpage --output jsonpath='{.items[0].metadata.name}') -c istio-proxy -- curl -X POST http://localhost:15000/logging/jwt?level=debug
