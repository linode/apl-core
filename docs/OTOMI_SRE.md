# Otomi SRE

## Basic SRE script for Otomi

Redkubes delivers support for Otomi, we offer paid support backed by and SLA and opensource support backed by a best effort SLA. Our goal is to create a community for new users and help them get comfortable with Otomi.

> <https://support.redkubes.com/> is powered by Zendesk, a ticket based support system.

We promote <https://support.redkubes.com/> as a central support portal to keep support questions centrally accessible to the team. All support communication with our customers needs to be done via this system; _to prevent missing support questions, to measure our SLA performance and record a history of support questions._

## Communication

A common flow for support could be described as follows.

> - User has a question or remark
> - User creates a message via email, web or telephone and adds priority
> - Otomi receives a notification via slack, email or telephone
> - Otomi validates source of user's message
> - Otomi checks SLA for user
> - Otomi responds within SLA
> - User responds to Otomi message etc.
> - User accepts solution
> - Otomi closes support ticket
>
> _Terms_
>
> - User: enduser (new or advanced, known or unknown in Otomi system)
> - Otomi: a technical Otomi support person

### A single communication channel

We only deliver enduser support on our support portal <https://support.redkubes.com>. It's important to inform people about this by referencing this in Github issues etc. We offer various levels of support, defined in our SLA. A critical issue can only only be created by telephone and needs customer validation on Otomi side.

### First response

It's good practise to always acknowledge the support questions received, a good general response could be; (we might auto generate this message later)

```
Hi <name>,

Thank you for contacting Otomi support.

This message is to inform you that we have received your message and we will reachout to you shortly.

Please take a look at our <https://helpdesksystem.com> answering popular questions.

Kind regards,
<name> / Otomi support
```

### Follow up

Always make sure to respond within the SLA, a ticket that will break the SLA is announced in Slack to help with this. Ask the user for steps to reproduce the issue, make sure you understand the support level required. (don't over complicate things, try to stay on topic)

### Summon up

Provide a solution to the user's issue and validate this with the user, we only want to close a ticket if the user has accepted the solution.

## Prevent stale issues

Sometimes an issue has no clear solution, or a solution will take longer than expected. In this case it's recommended to close the ticket and put a solution on the roadmap. We don't want stale tickets. Be clear about this to the user.

---

## Advanced k8s support

> We recommend using _k9s_ or _Lens_ for debugging, also make sure _metrics-server_ is working on the cluster, it gives insight in cluster resources.

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
