# Appid adatpter setup


WARNING: This configuration was created based on exampes from https://github.com/ibm-cloud-security/app-identity-and-access-adapter


Unfortunately it does not work as expected, see: https://github.com/ibm-cloud-security/appid-sample-code-snippets/issues/9


# Setup local environment

```
minikube start --cpus=6 --memory=10000 --kubernetes-version='v1.14.8'

istioctl manifest apply
```

Setup minkube to provide IP address to serloadbalancer:
```
minikube tunnel --cleanup
minikube tunnel 
```

Deploy sample app and policies:
```
k apply -f sample-app-minkube.yaml 
```

Inject sidecar
```
kubectl -n sample-app get deployment dpl-sample-app -o yaml | istioctl kube-inject -f - | kubectl apply -f -
```


# Adapter 

Adapters - resource config that the operator need to ingest into Mixer's configuration store
```
kis get adapters.config.istio.io appidentityandaccessadapter -oyaml
```

## Adapter templates
The template author defines a template, which describes the data Mixer dispatches to adapters, and the interface that the adapter must implement to process that data. 

```
kis get templates.config.istio.io authnz -oyaml
```

## Adapter configuration
The operator defines:
- what data should be collected (instances), 
- where it can be sent (handlers)
- when to send data (rules) to adapter
```
kis get instances.config.istio.io instance-appidentityandaccessadapter -oyaml
kis get handler handler-appidentityandaccessadapter -oyaml
kis get rule rule-appidentityandaccessadapter -oyaml
```
kis get svc svc-appidentityandaccessadapter -oyaml


## Policy configuration
A is a vonfiguration that is specific for application
```
ka get policies.security.cloud.ibm.com
```

# Trouble shooting


## Inspect that adapter is registered

```
2019-12-10 13:37:14	2019-12-10T12:37:14.860573Z info ccResolverWrapper: sending update to cc: {[{svc-appidentityandaccessadapter:47304 0 <nil>}] <nil>}
2019-12-10 13:37:14	2019-12-10T12:37:14.860604Z info grpcAdapter Connected to: svc-appidentityandaccessadapter:47304
2019-12-10 13:37:14	2019-12-10T12:37:14.860818Z info base.baseBalancer: got new ClientConn state: {{[{svc-appidentityandaccessadapter:47304 0 <nil>}] <nil>} <nil>}
```




After performing: `k apply -f samples/ibm-auth/ibm-auth.yaml` the adapter produces the following logs.

```
{"level":"debug","ts":"2019-12-11T08:37:16.728Z","caller":"initializer/policyinitializer.go:131","msg":"Adding resource","source":"appidentityandaccessadapter-adapter","key":"sample-app/oidc-provider-config-with-secret-ref"}
{"level":"debug","ts":"2019-12-11T08:37:16.728Z","caller":"controller/controller.go:120","msg":"Controller.processNextItem: object created detected: %s","source":"appidentityandaccessadapter-adapter","key":"sample-app/oidc-provider-config-with-secret-ref"}
{"level":"debug","ts":"2019-12-11T08:37:16.728Z","caller":"crdeventhandler/add_event.go:43","msg":"Create/Update OidcConfig","source":"appidentityandaccessadapter-adapter","ID":"6fee2817-1bf1-11ea-986f-96e03c5c0435","name":"oidc-provider-config-with-secret-ref","namespace":"sample-app"}
{"level":"debug","ts":"2019-12-11T08:37:16.742Z","caller":"initializer/policyinitializer.go:131","msg":"Adding resource","source":"appidentityandaccessadapter-adapter","key":"sample-app/jwt-config"}
{"level":"debug","ts":"2019-12-11T08:37:16.743Z","caller":"controller/controller.go:120","msg":"Controller.processNextItem: object created detected: %s","source":"appidentityandaccessadapter-adapter","key":"sample-app/jwt-config"}
{"level":"info","ts":"2019-12-11T08:37:16.743Z","caller":"crdeventhandler/add_event.go:36","msg":"Create/Update JwtPolicy","source":"appidentityandaccessadapter-adapter","ID":"6ff14c5b-1bf1-11ea-986f-96e03c5c0435","name":"jwt-config","namespace":"sample-app"}
{"level":"debug","ts":"2019-12-11T08:37:16.931Z","caller":"authserver/authserver.go:80","msg":"Initialized discovery configuration successfully","source":"appidentityandaccessadapter-adapter","url":"https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/v2.0/.well-known/openid-configuration"}
{"level":"info","ts":"2019-12-11T08:37:16.936Z","caller":"keyset/keyset.go:117","msg":"Synced public keys","source":"appidentityandaccessadapter-adapter","url":"https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/discovery/v2.0/keys"}
{"level":"info","ts":"2019-12-11T08:37:16.936Z","caller":"keyset/keyset.go:50","msg":"Synced JWKs successfully.","source":"appidentityandaccessadapter-adapter","url":"https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/discovery/v2.0/keys"}
{"level":"info","ts":"2019-12-11T08:37:16.936Z","caller":"crdeventhandler/add_event.go:39","msg":"JwtPolicy created/updated","source":"appidentityandaccessadapter-adapter","ID":"6ff14c5b-1bf1-11ea-986f-96e03c5c0435","name":"jwt-config","namespace":"sample-app"}
{"level":"debug","ts":"2019-12-11T08:37:16.936Z","caller":"controller/controller.go:68","msg":"Controller.runWorker: processing next item","source":"appidentityandaccessadapter-adapter"}
{"level":"debug","ts":"2019-12-11T08:37:16.936Z","caller":"controller/controller.go:78","msg":"Controller.processNextItem: start","source":"appidentityandaccessadapter-adapter"}
{"level":"info","ts":"2019-12-11T08:37:16.990Z","caller":"keyset/keyset.go:117","msg":"Synced public keys","source":"appidentityandaccessadapter-adapter","url":"https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/discovery/v2.0/keys"}
{"level":"info","ts":"2019-12-11T08:37:16.990Z","caller":"keyset/keyset.go:50","msg":"Synced JWKs successfully.","source":"appidentityandaccessadapter-adapter","url":"https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/discovery/v2.0/keys"}
{"level":"info","ts":"2019-12-11T08:37:16.990Z","caller":"crdeventhandler/add_event.go:55","msg":"OidcConfig created/updated","source":"appidentityandaccessadapter-adapter","ID":"6fee2817-1bf1-11ea-986f-96e03c5c0435","name":"oidc-provider-config-with-secret-ref","namespace":"sample-app"}
{"level":"debug","ts":"2019-12-11T08:37:16.990Z","caller":"controller/controller.go:68","msg":"Controller.runWorker: processing next item","source":"appidentityandaccessadapter-adapter"}
{"level":"debug","ts":"2019-12-11T08:37:16.990Z","caller":"controller/controller.go:78","msg":"Controller.processNextItem: start","source":"appidentityandaccessadapter-adapter"}
```




After creating IBM policy:


```
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"initializer/policyinitializer.go:131","msg":"Adding resource","source":"appidentityandaccessadapter-adapter","key":"sample-app/sample-app-policy"}
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"controller/controller.go:120","msg":"Controller.processNextItem: object created detected: %s","source":"appidentityandaccessadapter-adapter","key":"sample-app/sample-app-policy"}
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"crdeventhandler/add_event.go:59","msg":"Create/Update Policy","source":"appidentityandaccessadapter-adapter","ID":"d7ad9be2-1bf2-11ea-986f-96e03c5c0435","name":"sample-app-policy","namespace":"sample-app"}
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"crdeventhandler/add_event.go:63","msg":"Adding policy for endpoint{{sample-app svc-sample-app} /* ALL}","source":"appidentityandaccessadapter-adapter"}
{"level":"info","ts":"2019-12-11T08:47:20.277Z","caller":"crdeventhandler/add_event.go:67","msg":"Policy created/updated","source":"appidentityandaccessadapter-adapter","ID":"d7ad9be2-1bf2-11ea-986f-96e03c5c0435"}
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"controller/controller.go:68","msg":"Controller.runWorker: processing next item","source":"appidentityandaccessadapter-adapter"}
{"level":"debug","ts":"2019-12-11T08:47:20.277Z","caller":"controller/controller.go:78","msg":"Controller.processNextItem: start","source":"appidentityandaccessadapter-adapter"}
```