
# Single sign-on

## What community says:

To support Single Sign-On scenario, Istio Origin Authentication should accept a JWT Token sent in a cookie:
https://github.com/istio/istio/issues/8619#issuecomment-503468943


Istio Design Document: End-User authentication with OIDC
https://docs.google.com/document/d/1mGpUsRgmA9wPB73trfTiB9YUuwYh-31iulYg9USxe0Y/edit#heading=h.7zgnj8bwqfld


## How developers handle it now:

### Kubeflow
https://www.kubeflow.org/docs/started/k8s/kfctl-existing-arrikto/#log-in-with-ldap-active-directory
https://journal.arrikto.com/kubeflow-authentication-with-istio-dex-5eafdfac4782

Pros:
- The JWT is stored in cookie
- They use DEX which allows to integrate with other OIDC providers

Pros:
- cookie based so apps does not need to know to iclude it in header

Cons:
- need to extract cookie with JWT and put it as a separate header so istio authentication and authorization policies can verified it.


### Kyma:
https://kyma-project.io/docs/0.4/components/authorization-and-authentication#architecture-architecture

Cons:
- The JWT is stored in sessionStorage

Pros:
- They use DEX which allows to integrate with other OIDC providers


# Installation

Create cluster
```
minikube start --cpus=6 --memory=10000 --kubernetes-version='v1.14.8'
```

Install istio
```
istioctl manifest apply
```

Install kfctl:
```
See: https://www.kubeflow.org/docs/aws/deploy/install-kubeflow/#prepare-your-environment
```

Build configuration 
```
export CONFIG_URI="https://raw.githubusercontent.com/kubeflow/manifests/dc04ff600cee722d93cf80d413aa73ddd8387f1f/kfdef/kfctl_existing_arrikto.0.7.0.yaml"
kfctl build -V -f ${CONFIG_URI}
```

Apply only parts that relates to single sign-on
```
kfctl apply -V -f kfctl_auth_only.yaml
```

# Deploy productinfo app

```
k apply -f productinfo-app.yaml
```

Setup port forwarding
Access ingress gateway
```
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80
```

In your webbrowser access `127.0.0.1:8080/productpage`. You should be redirected to dex to authenticate.
```
user: admin@kubeflow.org
pass: 12341234
```