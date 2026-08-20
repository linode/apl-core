# APL Core

APL Core defines the lifecycle and readiness boundaries of the platform installation.

## Language

**Platform control plane ready**:
The Phase 1 installation outcome in which all cluster-local prerequisites for platform reconciliation are created. Readiness of those prerequisites and of resources fulfilled by external systems is excluded.
_Avoid_: Installation complete, platform ready

**Externally fulfilled resource**:
A desired platform resource whose reconciliation requires a service outside the cluster, such as ACME or a DNS provider. Phase 1 neither creates nor waits for these resources.
_Avoid_: Third-party certificate, external artifact

**Bootstrap prerequisite**:
A cluster-local resource that must exist before the platform control plane can begin normal reconciliation. A custom-CA issuer is a bootstrap prerequisite; issuance of an ingress certificate is not.
_Avoid_: Essential artifact, Phase 1 resource
