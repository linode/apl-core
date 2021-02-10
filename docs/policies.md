# Otomi Policies

The Otomi platform enforces Kubernetes security best practices through `Security Constraints` defined as OPA policies.

### Security in-depth

OPA policies are a replacement for the native `PodSecurityPolicies` and all defined policies are modeled after the most common `psp` setups.
The values repository holds a `policies.yaml` file with sane default presets. YAML Resources are verified against defined `.rego` policy rules, using the defined preset parameters as their constraint value.

**Statical analysis**

Otomi's generated resources are statically evaluated by Conftest before deployment, but also at build time (using demo configuration for coverage). This gives platform developers the tools to test their manifests locally, and increases certainty that only valid output will be generated.

**Runtime protection**

After Otomi is deployed, these same policies are upheld by OPA's `gatekeeper` on the cluster, making sure all deployed resources are approved by it's admission hook.

## Constraint Presets and Parameters

Any custom settings can be provided to control the admission of resources.
The following predefined strategies will enforce most common security use-cases by allowing admission of resources from the most restrictive to the most permissive access level.

```
Restricted ->> Hostnetwork ->> Hostaccess ->> Non-root ->> Hostmount-anyuid ->> Anyuid ->> Privileged
```

Some example Policy and Constraint definitions can be found in `.demo/env/policies.yaml` file.
First choose one of the example **Constraint presets**, then to load these parameters into the policy engine and run evaluation using selected level Constraints, create the according values in the `policies.yaml` file.

To start policy evaluation statically from a development workstation, run the following:

```sh
# give an extra parameter to limit validation to the target cluster only, instead of all clusters.
otomi check-policies [1]
```

### Policy exclusions and parameter overrides

The policy engine is aware of the following annotations for a workload:

```
annotations:
  policy.otomi.io/ignore: ${policy}
  policy.otomi.io/parameters.${policy}: '{"extra":"parameters"}'
```

Parameters will be merged with the default parameters passed to the rule (as defined in the `policies.yaml` file in the values repo).

### Restricted

Denies access to all host features and requires pods to run with a UID. This is the most restrictive policy setup.

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: true
    allowedHostPaths:
      - pathPrefix: /tmp/
        readOnly: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    runAsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    supplementalGroups:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    fsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
  psp-host-security:
    enabled: true
  psp-host-networking-ports:
    enabled: true
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - NET_BIND_SERVICE
      - NET_RAW
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```

### Privileged

Allows access to all privileged and host features and the ability to run as any user, any group, any fsGroup. This is the most relaxed policy setup.

```yaml
policies:
  container-limits:
    enabled: false
  banned-image-tags:
    enabled: false
  psp-host-filesystem:
    enabled: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: RunAsAny
    runAsGroup:
      rule: RunAsAny
    supplementalGroups:
      rule: RunAsAny
    fsGroup:
      rule: RunAsAny
  psp-host-security:
    enabled: false
  psp-host-networking-ports:
    enabled: false
  psp-privileged:
    enabled: false
  psp-capabilities:
    enabled: false
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: false
```

### Non-root

Provides all features of the restricted Constraint but allows users to run with any non-root UID. The user must specify the UID.

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: true
    allowedHostPaths:
      - pathPrefix: /tmp/
        readOnly: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: MustRunAsNonRoot
    runAsGroup:
      rule: MayRunAs
      ranges:
        - min: 1
          max: 65535
    supplementalGroups:
      rule: MayRunAs
      ranges:
        - min: 1
          max: 65535
    fsGroup:
      rule: MayRunAs
      ranges:
        - min: 1
          max: 65535
  psp-host-security:
    enabled: true
  psp-host-networking-ports:
    enabled: true
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - NET_BIND_SERVICE
      - NET_RAW
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```

### Anyuid

Provides all features of the restricted Constraint but allows users to run with any UID and any GID.

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: true
    allowedHostPaths:
      - pathPrefix: /tmp/
        readOnly: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: RunAsAny
    runAsGroup:
      rule: RunAsAny
    supplementalGroups:
      rule: RunAsAny
    fsGroup:
      rule: RunAsAny
  psp-host-security:
    enabled: true
  psp-host-networking-ports:
    enabled: true
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - '*'
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```

### Hostmount-anyuid

Provides all the features of the restricted Constraint but allows host mounts and any UID by a pod. Allows host file system access as any UID, including UID 0.

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: RunAsAny
    runAsGroup:
      rule: RunAsAny
    supplementalGroups:
      rule: RunAsAny
    fsGroup:
      rule: RunAsAny
  psp-host-security:
    enabled: true
  psp-host-networking-ports:
    enabled: true
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - NET_BIND_SERVICE
      - NET_RAW
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```

### Hostnetwork

Allows using host networking and host ports but still requires pods to be run with a UID.

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: true
    allowedHostPaths:
      - pathPrefix: /tmp/
        readOnly: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    runAsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    supplementalGroups:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    fsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
  psp-host-security:
    enabled: false
  psp-host-networking-ports:
    enabled: false
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - NET_BIND_SERVICE
      - NET_RAW
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```

### Hostaccess

Allows access to all host namespaces but still requires pods to be run with a UID. Allows host access to namespaces, file systems, and PIDS

```yaml
policies:
  container-limits:
    enabled: true
    cpu: '2'
    memory: 2000Mi
  banned-image-tags:
    enabled: true
    tags:
      - latest
      - master
  psp-host-filesystem:
    enabled: false
  psp-allowed-users:
    enabled: true
    runAsUser:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    runAsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    supplementalGroups:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
    fsGroup:
      rule: MustRunAs
      ranges:
        - min: 1
          max: 65535
  psp-host-security:
    enabled: false
  psp-host-networking-ports:
    enabled: false
  psp-privileged:
    enabled: true
  psp-capabilities:
    enabled: true
    allowedCapabilities:
      - NET_BIND_SERVICE
      - NET_RAW
  psp-allowed-repos:
    enabled: false
    repos:
      - harbor.demo.gke.otomi.cloud
      - harbor.demo.aks.otomi.cloud
      - harbor.demo.eks.otomi.cloud
  psp-forbidden-sysctls:
    enabled: true
    forbiddenSysctls:
      - '*'
```
