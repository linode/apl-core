<p align="center"><img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="Otomi"></p>

# Otomi
![Build Status](https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker)
![Downloads](https://img.shields.io/github/downloads/redkubes/otomi-core/total)
![Docker Image Version (latest semver)](https://img.shields.io/docker/v/otomi/core?sort=semver)
![Crates.io](https://img.shields.io/crates/l/ap)
![GitHub last commit](https://img.shields.io/github/last-commit/redkubes/otomi-core)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)

The easiest way to turn Kubernetes into a full blown container platform. Get started at [otomi.io](https://otomi.io/)

## What is Otomi

Otomi extends Kubernetes with:

- A complete suite of integrated and pre-configured applications
- Application configuration management for all integrated applications, providing a (multiple layer) base overlay configuration
- Multi-tenancy: Create teams and provide SSO access to team and shared applications
- Implemented policies for better governance and security. Manifests are checked both statically and on the cluster at runtime for obedience to policies
- Single Sign On: Bring your own IDP
- Automatic ingress configuration: Easily configure ingress for team services or core apps, allowing access within minutes. Istio gateways and virtual services are automatically generated and configured for team services, tying a generic ingress architecture to service endpoints in a predictable way
- Input/output validation; Configuration and output manifests are checked statically for validity and best practices
- Automatic vulnerability scanning: Scan all configured team service containers in Harbor
- Observability: A complete pre-configured observability stack using Prometheus, Alertmanager and Grafana Loki
- Secrets management: Use Hashicorp Vault to store and manage secrets
- Visual Studio integration
- Developer self-service (use Otomi as an Internal Developer Platform). EE only!

Otomi aims to support the most common DevOps use cases out-of-the-box and strongly relies on GitOps patterns, where desired state is reflected as code and the cluster state is automatically updated.

Otomi consists out of multiple projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks);  Autonomous jobs orchestrated by Otomi Core
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

Learn more about Otomi at [otomi.io](https://otomi.io/about).
## Get started

Add the Otomi Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

Install the chart with the prepared `values.yaml` file.

```bash
helm install -f /path/to/values.yaml my-otomi-release otomi/otomi
```

Pull the `otomi-vales` repo from Gitea to your local machine:

```bash
git clone https://gitea.<your.domain>/otomi/values.git
```

Open the Console:

```bash
open -a "Google Chrome" https://otomi.<your.domain>
```

<p align="center"><img src="https://otomi.io/assets/images/ce-platform-apps-2f2ca904b17f827e002e8c0d6eaf2470.png" width="100%" align="center" alt="Otomi console CE"></p>

For more detailed documentation on how to get started with Otomi, see [otomi.io](https://otomi.io/).
# License

The Community Edition (CE) has limited web interface capabilities, and is available in read-only mode only. This means you will have to modify configuration directly in your git repository (otomi-values) and there is no role based access control on that level.

The Enterprise Edition (EE) is beneficial for organizations at scale. Its focus is on daily user performace and role based access control to platform configuration. The Enterprise Edition enriches the CE's web application with full platform management capabilities and team self-service features.

You can easily upgrade to Enterprise Edition by purchasing a license at [redkubes.com](https://redkubes.com/pricing/)

# Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).
