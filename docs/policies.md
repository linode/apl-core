# Otomi Policies

The Otomi platform enforces Kubernetes security best practices through `Security Constraints` defined as OPA policies.

**Security in-depth**

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

The whole OPA policies setup can be found in `policies/`. The Constraint definitions are automatically built and injected at deploytime by combining the OPA policies with the `$ENV_DIR/policies.yaml` input parameters (examples can be found in `.values/env/policies.yaml` file), and will be inserted in `charts/gatekeeper-artifacts/crds/*.yaml` files.

To start policy evaluation statically from a development workstation, using the ENV_DIR values as input, run the following:

```sh
export ENV_DIR=<path to your initialized values repo>
# run 'otomi` to see the global options
otomi check-policies
```

To run it with the `tests/fixtures/env/*` values as input, you can run

```sh
npm run check-policies
```

This check is also ran at build time.

### Policy exclusions and parameter overrides

In order to bypass the policy checks that are enforced by OPA gatekeeper, otomi provides an override mechanism to disable or parameterize policy checks by means of annotations. This is based on a gentlemen's approach, and will be RBAC enforced in a future version of otomi.
The policy engine is aware of the following annotations for a pod spec:

```
annotations:
  policy.otomi.io/ignore: $policy[,$policy2] # pod level ignore for all containers
  policy.otomi.io/ignore-sidecar: $policy[,$policy2] # pod level ignore for sidecars, such as istio-proxy
  policy.otomi.io/ignore.$container: $policy[,$policy2] # ignore for just the mentioned container
  policy.otomi.io/parameters.$policy: '{"extra":"parameters"}'
```

Parameters will be merged with the default parameters passed to the rule (as defined in the `policies.yaml` file in the values repo).
(No override exists for a specific container to provide parameters for.)

## OPA unit tests

In order to run the OPA unit tests that are included in `policies/**/*/src_test.rego` files you can run

```bash
otomi x opa test policies -v
```
