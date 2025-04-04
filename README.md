<h3 align="center">
  <img src="https://github.com/linode/manager/blob/develop/packages/manager/src/assets/logo/akamai-logo-color.svg" width="200" />
  <br />
  <br />
  Akamai Application Platform (for LKE)
</h3>

<p align="center">
  <a href="https://github.com/linode/apl-core/releases/"><img alt="Releases" src="https://img.shields.io/github/release-date/linode/apl-core?label=latest%20release" /></a>
  <a href="https://img.shields.io/github//linode/apl-core/actions/workflows/main.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/linode/apl-core/main.yml" /></a>
  <a href="https://img.shields.io/github/last-commit/linode/apl-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/linode/apl-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
</p>
<p align="center">
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
  <a href="https://apl-docs.net/"><img src="https://img.shields.io/website-up-down-green-red/http/shields.io.svg" alt="Website apl-docs.net"></a>
</p>

<p align="center"><img src="https://github.com/linode/apl-core/blob/main/docs/img/apl-console.png/?raw=true" width="100%" align="center" alt="APL Console"></p>

## Getting started

### Step 1: [Install the App Platform](https://apl-docs.net/docs/get-started/installation/overview)
Install the App Platform on Linode Kubernetes Engine (LKE) or any other conformant Kubernetes cluster.

### Step 2: [Follow the post installation steps ](https://apl-docs.net/docs/get-started/installation/post-installation-steps)
Configure the App Platform for your use case.

### Step 3: [Explore the App Platform using the Labs](https://apl-docs.net/docs/get-started/labs/overview)
Explore the App Platform with a comprehensive set of hands-on labs.

## Akamai Application Platform supports

**Developers** - With easy self-service.

- Build OCI compliant images from source code.
- Deploy containerized workloads the GitOps way using the provided quickstarts or BYO golden path templates.
- Automatically update container images of workloads.
- Publicly expose applications.
- Get instant access to logs, metrics and traces.
- Store images in a private registry.
- Configure network policies, response headers and CNAMEs.
- Check applications against a comprehensive set of built-in security policies.
- Create and manage secrets.
- Create private Git repositories and use the built-in CI/CD pipelines.

**Platform Administrators** - With all the required platform capabilities when using Kubernetes.

- Get all the required capabilities in a pre-configured, integrated and automated way.
- Onboard development Teams in a comprehensive multi-tenant setup and make them self-serving.
- Manage users.
- Ensure governance with security policies.
- Implement zero-trust networking.
- Change the desired state of the platform based on Configuration-as-Code.
- Support multi- and hybrid cloud PaaS.
- Prevent cloud provider lock-in.
- Implement full observability.
- Comply with Disaster Recovery requirements.

## Integrations

**Core Applications**

Get instant access to the following pre-configured Kubernetes Apps:

- [Istio](https://github.com/istio/istio): The service mesh framework with end-to-end transit encryption.
- [Argo CD](https://github.com/argoproj/argo-cd): Declarative Continuous Deployment.
- [Keycloak](https://github.com/keycloak/keycloak): Identity and access management for modern applications and services.
- [Cert-manager](https://github.com/cert-manager/cert-manager) - Bring your own wildcard certificate or request one from Let's Encrypt.
- [Nginx Ingress Controller](https://github.com/kubernetes/ingress-nginx): Ingress controller for Kubernetes.
- [ExternalDNS](https://github.com/kubernetes-sigs/external-dns): Synchronize exposed ingresses with DNS providers.
- [Tekton Pipeline](https://github.com/tektoncd/pipeline): K8s-style resources for declaring CI/CD pipelines.
- [Tekton Triggers](https://github.com/tektoncd/triggers): Trigger pipelines from event payloads.
- [Tekton Dashboard](https://github.com/tektoncd/dashboard): Web-based UI for Tekton Pipelines and Tekton Triggers.
- [Gitea](https://github.com/go-gitea/gitea): Self-hosted Git service.
- [Cloudnative-pg](https://github.com/cloudnative-pg/cloudnative-pg): Open source operator designed to manage PostgreSQL workloads.
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets): Encrypt your Secret into a SealedSecret and store secrets in a Git repository.

**Optional Applications**

One-click activation of the following Kubernetes Apps:

- [Velero](https://github.com/vmware-tanzu/velero): Back up and restore your Kubernetes cluster resources and persistent volumes.
- [Knative](https://github.com/knative/serving): Deploy and manage serverless workloads.
- [Prometheus](https://github.com/prometheus/prometheus): Collecting container application metrics.
- [Alertmanager](https://github.com/prometheus/alertmanager): Handle alerts send by Prometheus.
- [Grafana](https://github.com/grafana/grafana): Visualize metrics, logs, and traces from multiple sources.
- [Grafana Loki](https://github.com/grafana/loki): Collecting container logs.
- [Harbor](https://github.com/goharbor/harbor): Container image registry with role-based access control and image scanning.
- [Kyverno](https://github.com/kyverno/kyverno): Kubernetes native policy management.
- [Jaeger](https://github.com/jaegertracing/jaeger): End-to-end distributed tracing and monitor for complex distributed systems.
- [Kiali](https://github.com/kiali/kiali): Observe Istio service mesh relations and connections.
- [Minio](https://github.com/minio/minio): High performance Object Storage compatible with Amazon S3 cloud storage service.
- [Trivy Operator](https://github.com/aquasecurity/trivy-operator): Kubernetes-native security toolkit.
- [Falco](https://github.com/falcosecurity/falco): Cloud Native Runtime Security.
- [Grafana Tempo](https://github.com/grafana/tempo): High-scale distributed tracing backend.
- [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-operator): Instrument, generate, collect, and export telemetry data to help you analyze your software’s performance and behavior.

## Documentation

Check out [apl-docs.net](https://apl-docs.net) for more detailed documentation.

## License

APL is licensed under the [Apache 2.0 License](https://github.com/linode/apl-core/blob/main/LICENSE).
