
# Kubelow-auth

## Overview


Read the following articles to get familiar with architecure
- https://www.kubeflow.org/docs/started/k8s/kfctl-existing-arrikto/
- https://journal.arrikto.com/kubeflow-authentication-with-istio-dex-5eafdfac4782

The `oidc-authservice` 
- is between istio-ingress gateway with Dex server. 
- appends session Cookie to the responses
- appends Headers to requests (kubeflow-userid, kubeflow-userid-token)

Refer to this repo to learn more about `oidc-authservice`
- https://github.com/arrikto/oidc-authservice

## Limitations
- It requires to reserve some uri prefix for all subdomians (e.g.: /dex)
- it does not use refresh tokens
- if a cookie expiries a user is prompted to provide creadentials
- poor documentation but it works

## Installation 

### Setup cluster on minikube
Create cluster
```
minikube start --cpus=6 --memory=10000 --kubernetes-version='v1.14.8'
```

Setup minkube tunnel
```
minikube tunnel
```

Obtain loadbalancer IP address:
```
kis get svc istio-ingressgateway -ojsonpath="{.status.loadBalancer.ingress[0].ip}"
```

Set `/etc/hosts` with domains loadbalancer IP. Example:
```
10.99.48.72       localhost.local
10.99.48.72       bookinfo.localhost.local
10.99.48.72       dex.localhost.local
```

### Istio

Install istio:
```
istioctl manifest apply
```

### Kubeflow
Install kfctl:
```
See: https://www.kubeflow.org/docs/aws/deploy/install-kubeflow/#prepare-your-environment
```

Apply only parts that relates to single sign-on
```
kfctl apply -V -f kubeflow-auth-only.yaml
```

## Test
In your webbrowser access `http://bookinfo.localhost.local/productpage`. You should be redirected to dex to authenticate.
Use below creadentials
```
user: admin@kubeflow.org
pass: 12341234
```

Note: current state allows to go through authentication process. Unfortunately user is redirected to `http://dex.localhost.local/productpage` instead of `http://bookinfo.localhost.local/productpage`