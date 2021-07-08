![Docker Image Version (latest semver)](https://img.shields.io/docker/v/otomi/core?sort=semver)
![Crates.io](https://img.shields.io/crates/l/ap)
![GitHub last commit](https://img.shields.io/github/last-commit/redkubes/otomi-core)

<p align="center">
	<img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="ExternalDNS">
</p>

# About Otomi

Otomi extends Kubernetes with an advanced ingress architecture, a complete suite of integrated pre-configured applications, multi-tenancy, and implemented policies for better governance and security. Other features are:

- Single Sign On: Bring your own IDP or use Keycloak
- Automatic ingress configuration: Easily configure ingress for team services or core apps, allowing access within minutes
- Input/output validation: Configuration and output manifests are checked statically for validity and best practices
- Policy enforcement: Manifests are checked both statically and on the cluster at runtime for obedience to policies.
- Automatic vulnerability scanning: All configured team service containers get scanned in Harbor
- Observability: A complete pre-configured observability stack using Prometheus, Alertmanager and Grafana Loki, 
- Service mesh: Istio gateways are automatically configured for teams and Istio virtual services are automatically generated for team services, tying a generic ingress architecture to service endpoints in a predictable way
- Secrets management: Use HashiCorp Vault to store and manage secrets

Otomi aims to support the most common DevOps use cases out-of-the-box and strongly relies on GitOps patterns, where desired state is reflected as code and the cluster state is automatically updated.

Otomi consists out of multiple projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks);  Autonomous jobs orchestrated by Otomi Core
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

Learn more about Otomi at [otomi.io](https://otomi.io).

# Get started

Use Helm 3 to install Otomi Container Platform.

```
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

Prepare `values.yaml` that describe kubernetes cluster and cloud provider resources like DNS or KMS.
Next install the chart with the values file provided:

```
helm install -f values.yaml otomi otomi/otomi
```

# License

The Community Edition (CE) has limited web interface capabilities, and is available in read-only mode only. This means you will have to modify configuration directly in your git repository (otomi-values) and there is no role based access control on that level.

The Enterprise Edition (EE) is beneficial for organizations at scale. Its focus is on daily user performace and role based access control to platform configuration. The Enterprise Edition enriches the CE's web application with full platform management capabilities and team self-service features.

You can easily upgrade to Enterprise Edition by purchasing a license at [redkubes.com](https://redkubes.com/pricing/)

# Contribution

If you wish to contribute please read our [Contributor Code of Conduct](./docs/CODE_OF_CONDUCT.md) and [Contribution Guidelines](./docs/CONTRIBUTING.md).
