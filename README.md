<h3 align="center">
  <img src="https://github.com/linode/manager/blob/develop/packages/manager/src/assets/logo/akamai-logo-color.svg" width="200" />
  <br />
  <br />
  App Platform
</h3>

<p align="center">
  <a href="https://github.com/linode/apl-core/releases/"><img alt="Releases" src="https://img.shields.io/github/release-date/linode/apl-core?label=latest%20release" /></a>
  <a href="https://img.shields.io/github//linode/apl-core/actions/workflows/main.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/linode/apl-core/main.yml" /></a>
  <a href="https://img.shields.io/github/last-commit/linode/apl-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/linode/apl-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
</p>
<p align="center">
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
  <a href="https://techdocs.akamai.com/app-platform/docs/welcome"><img src="https://img.shields.io/website-up-down-green-red/http/shields.io.svg" alt="Website apl-docs.net"></a>
</p>

<p align="center"><img src="https://github.com/linode/apl-core/blob/main/docs/img/apl-console.png/?raw=true" width="100%" align="center" alt="APL Console"></p>

## Getting started

### Step 1: Install the Akamai App Platform

Install the App Platform on Linode Kubernetes Engine (LKE) or any other conformant Kubernetes cluster.
The App Platform can be installed automatically when creating a new Linode Kubernetes Engine (LKE) cluster on Akamai Cloud. It can also be installed manually on LKE or any other conformant Kubernetes cluster.

- [Automatic installation on LKE](https://techdocs.akamai.com/app-platform/docs/lke-automatic-install)
- [Manual installation on LKE](https://techdocs.akamai.com/app-platform/docs/lke-manual-install)
- [Custom installation on other Kubernetes services](https://techdocs.akamai.com/app-platform/docs/custom)

### Step 2: Post-installation steps

After installing the App Platform on your Kubernetes cluster, review the [Post installation steps](https://techdocs.akamai.com/app-platform/docs/post-installation-steps) guide. There may be additional setup or initial configuration steps, such as locating your username and password.

### Step 3: Explore the App Platform with hands-on labs

To learn how to use the App Platform, follow along with the [hands-on labs](https://techdocs.akamai.com/app-platform/docs/labs-overview). These tutorials are designed as walk-throughs for new users, instructing them on creating container images, code repositories, and workloads. In addition, learn how to monitor these items and implement basic security checks.

## App Platform supports

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

- [Knative](https://github.com/knative/serving): Deploy and manage serverless workloads.
- [Prometheus](https://github.com/prometheus/prometheus): Collecting container application metrics.
- [Alertmanager](https://github.com/prometheus/alertmanager): Handle alerts send by Prometheus.
- [Grafana](https://github.com/grafana/grafana): Visualize metrics, logs, and traces from multiple sources.
- [Grafana Loki](https://github.com/grafana/loki): Collecting container logs.
- [Harbor](https://github.com/goharbor/harbor): Container image registry with role-based access control and image scanning.
- [Kyverno](https://github.com/kyverno/kyverno): Kubernetes native policy management.
- [Jaeger](https://github.com/jaegertracing/jaeger): End-to-end distributed tracing and monitor for complex distributed systems.
- [Minio](https://github.com/minio/minio): High performance Object Storage compatible with Amazon S3 cloud storage service.
- [Trivy Operator](https://github.com/aquasecurity/trivy-operator): Kubernetes-native security toolkit.
- [Grafana Tempo](https://github.com/grafana/tempo): High-scale distributed tracing backend.
- [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-operator): Instrument, generate, collect, and export telemetry data to help you analyze your software’s performance and behavior.

## Documentation

Check out the [Akamai App Platform documentation](https://techdocs.akamai.com/app-platform/docs/getting-started) on Akamai Techdocs.

## License

APL is licensed under the [Apache 2.0 License](https://github.com/linode/apl-core/blob/main/LICENSE).