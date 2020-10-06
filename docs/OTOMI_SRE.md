# Otomi SRE script

This document aims to help with debugging container and kubernetes issues.

We recommend using _k9s_ or _Lens_ for debugging, also make sure _metrics-server_ is working on the cluster, it gives insight in cluster resources.

## This document is for beginners and advanced users

### Pods not starting

Pods that are unable to start do not show any log output, the issue is related to k8s. Look for a pod with status _Pending_. Most of the time this is related to resources and container component issues.

- [ ] describe the pod, look closely at listed events
- [ ] is the image pullable? Is there a pullsecret configured?
- [ ] can volumes, cm's, envs and secrets be mounted?
- [ ] check resource requests is the requested resource available?
- [ ] are command, arguments correct? (make sure to use /bin/sh -c as command to use ENV)
- [ ] does the cluster have enough resources available?

> #### Advanced options for pods not starting
>
> - [ ] check affinity and node selector rules
> - [ ] Is the image tag valid and compatible with the host CPU? (exec format error)
> - [ ] check namespace quotas for pod, cm or secret limits etc.
> - [ ] check service account and permissions
> - [ ] Is the pod a job, deployment, daemonset or statefulset?
> - [ ] is there a limitrange configured in the namespace?
> - [ ] is the template spec in the pod matching the running container?

### Pods not working

Pods that are running but restart for whatever reason indicate that a container itself is having issues. Look for pod status _Crashloop_, _OOMkilled_ or incomplete ready status (3/4)

- [ ] check if dns resolving works
- [ ] are the required services available to the pod?
- [ ] check restart count and inspect logs and previous logs
- [ ] check if istio injection is required and working
- [ ] is a lifecycle spec configured?
- [ ] does the container depend on sidecar containers?
- [ ] check for available resources requests
- [ ] check readiness and liveness probes
- [ ] does the pod have enough CPU resources to do it's job?
- [ ] inspect the restart counter for the pod, a high value (32+) indicates an unstable pod

> #### Advanced options for pods not working
>
> - [ ] check pod's serviceaccount permissions
> - [ ] attach shell and inspect container status
> - [ ] rootless containers need special care combined with volumes
> - [ ] check securitycontext and podsecurity policy
> - [ ] check volume permissions

### Network services not working

Pods are working but a user can't connect to the service. Most http based services use an Ingress object, non http services require a service port to be defined.

Network policies or Istio policies can deny pods from communicating, note that DNS resolving is required for normal operation.

- [ ] use kubectl port-forward to debug pod service on lowest level
- [ ] check if kube-dns / coredns pods are working in kube-system namespace
- [ ] check invalid dns names, too long (64+) or invalid characters
- [ ] attach a shell and perform basic nslookup or ping commands (ping doesn't work between internal services in k8s)
- [ ] confirm that services do not mix http and https in frontend and backend
- [ ] service names matter, prefix accordingly with http- or https- for istio to recognize
- [ ] validate ingress, istiogateway, virtualservice and services

> #### Advanced options for network services not working
>
> - [ ] check for network policies
> - [ ] validate istiod pods are working
> - [ ] check if istio injection is configured and working
> - [ ] validate istio-operator working
> - [ ] run istioctl analyze

### Common Istio issues

Istio sidecars manipulate the containers network to reroute traffic. A namespace can have a istio sidecar policy indicated by a label, the same is valid for a deployment or pod. Make sure you see Istio sidecars running when applicable (indicated by the 3/3 Ready status)

- [ ] check if istio-operator is working
- [ ] check logs for istiod pods
- [ ] are services correctly named? (istio treats http- prefix and https- prefix differently)
- [ ] check logs for istio sidecar proxy
- [ ] check if mtls is enabled and working

> #### Advanced options for Istio issues
>
> - [ ] is the correct serviceaccount configured?
> - [ ] is Istio mtls enabled and configured correctly?

### DNS

The _external-dns_ service is registering DNS names, it makes sure that the service names are publicly available.

- [ ] make sure external-dns logs indicate "_All records are already up to date_"
- [ ] are the credentials configured correctly?

### Certificates

- [ ] check cert-manager working
- [ ] run _kubectl describe orders.acme.cert-manager.io -A_
- [ ] run _kubectl describe challenges.acme.cert-manager.io -A_
- [ ] run _kubectl describe certificates.cert-manager.io -A_

> #### Advanced options for Certificates
>
> - [ ] check if correct _Issuer_ and _ClusterIssuer_ are configured

### Common k8s issues

- [ ] describe pv and pvc, check if pv's are RWO or RWX and look for conflicts
- [ ] check available storageclasses std and fast exist
- [ ] check if container expects rwo or rwx pv
- [ ] are nodes in ready state
- [ ] check output of kubectl top nodes
- [ ] describe nodes to see overbooking

### Common k8s debug and analyze tooling

- use _loki_ to view cluster and pod log output
- use _grafana_ to view the cluster resource status
- use _prometheus_ to inspect servicemonitors
- use _alertmanager_ to view pre-configured otomi triggers
- read slack channels for alertmanager messages
- use _kubectl get events -A_ to check node events
- is _opa-gatekeeper_ enabled
