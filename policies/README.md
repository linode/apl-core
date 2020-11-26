# Otomi Policies

The Otomi platform enforces Kubernetes security best practices through `Security Constraints` defined as OPA policies.

### Security in-depth

OPA policies are a replacement for the native `PodSecurityPolicies` and all defined policies are modeled after the most common `psp` setups.

By allowing the policies to be evaluated by Conftest, platform developers can test manifests with `Local Policy Validation`.
YAML Resources are verified against defined `.rego` policy rules, using one of the defined constraint value presets as parameters.
The `Values` repository structure allows for a default set of parameters to be set on the `gatekeeper` chart level and extra overrides can be provided for different CLOUD-CLUSTER contexts.

## Constraint Presets and Parameters

Any custom settings can be provided to allow controlling the admission of resources.
The following predefined strategies will enforce most common security use-cases by allowing admission of resources from the most restrictive to the most permissive access level.

```
Restricted ->> Hostnetwork ->> Hostaccess ->> Non-root ->> Hostmount-anyuid ->> Anyuid ->> Privileged
```

First choose one of the following **Constraint presets** and create the according values file in `env/charts/gatekeeper.yaml`, to load these parameters into the policy engine and run evaluation using selected level Constraints:

To start policy evaluation statically from a development workstation, run the following:

```sh
otomi validate-policies true
```

### Restricted

Denies access to all host features and requires pods to be run with a UID. This is the most restrictive policy setup.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: true
        allowedHostPaths:
          - pathPrefix: /tmp/
            readOnly: false
      pspallowedusers:
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
      psphostsecurity:
        enabled: true
      psphostnetworkingports:
        enabled: true
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - NET_BIND_SERVICE
          - NET_RAW
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```

### Privileged

Allows access to all privileged and host features and the ability to run as any user, any group, any fsGroup. This is the most relaxed policy setup.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: false
      bannedimagetags:
        enabled: false
      psphostfilesystem:
        enabled: false
      pspallowedusers:
        enabled: true
        runAsUser:
          rule: RunAsAny
        runAsGroup:
          rule: RunAsAny
        supplementalGroups:
          rule: RunAsAny
        fsGroup:
          rule: RunAsAny
      psphostsecurity:
        enabled: false
      psphostnetworkingports:
        enabled: false
      pspprivileged:
        enabled: false
      pspcapabilities:
        enabled: false
      pspforbiddensysctls:
        enabled: false
```

### Non-root

Provides all features of the restricted Constraint but allows users to run with any non-root UID. The user must specify the UID.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: true
        allowedHostPaths:
          - pathPrefix: /tmp/
            readOnly: false
      pspallowedusers:
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
      psphostsecurity:
        enabled: true
      psphostnetworkingports:
        enabled: true
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - NET_BIND_SERVICE
          - NET_RAW
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```

### Anyuid

Provides all features of the restricted Constraint but allows users to run with any UID and any GID.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: true
        allowedHostPaths:
          - pathPrefix: /tmp/
            readOnly: false
      pspallowedusers:
        enabled: true
        runAsUser:
          rule: RunAsAny
        runAsGroup:
          rule: RunAsAny
        supplementalGroups:
          rule: RunAsAny
        fsGroup:
          rule: RunAsAny
      psphostsecurity:
        enabled: true
      psphostnetworkingports:
        enabled: true
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - '*'
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```

### Hostmount-anyuid

Provides all the features of the restricted Constraint but allows host mounts and any UID by a pod. Allows host file system access as any UID, including UID 0.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: false
      pspallowedusers:
        enabled: true
        runAsUser:
          rule: RunAsAny
        runAsGroup:
          rule: RunAsAny
        supplementalGroups:
          rule: RunAsAny
        fsGroup:
          rule: RunAsAny
      psphostsecurity:
        enabled: true
      psphostnetworkingports:
        enabled: true
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - NET_BIND_SERVICE
          - NET_RAW
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```

### Hostnetwork

Allows using host networking and host ports but still requires pods to be run with a UID.

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: true
        allowedHostPaths:
          - pathPrefix: /tmp/
            readOnly: false
      pspallowedusers:
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
      psphostsecurity:
        enabled: false
      psphostnetworkingports:
        enabled: false
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - NET_BIND_SERVICE
          - NET_RAW
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```

### Hostaccess

Allows access to all host namespaces but still requires pods to be run with a UID. Allows host access to namespaces, file systems, and PIDS

```yaml
charts:
  gatekeeper:
    enabled: true
    constraints:
      containerlimits:
        enabled: true
        cpu: '2'
        memory: 2000Mi
      bannedimagetags:
        enabled: true
        tags:
          - latest
          - master
      psphostfilesystem:
        enabled: false
      pspallowedusers:
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
      psphostsecurity:
        enabled: false
      psphostnetworkingports:
        enabled: false
      pspprivileged:
        enabled: true
      pspcapabilities:
        enabled: true
        allowedCapabilities:
          - NET_BIND_SERVICE
          - NET_RAW
      pspforbiddensysctls:
        enabled: true
        forbiddenSysctls:
          - '*'
```
