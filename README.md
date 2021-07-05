![Docker Image Version (latest semver)](https://img.shields.io/docker/v/otomi/core?sort=semver)
![Crates.io](https://img.shields.io/crates/l/ap)
![GitHub last commit](https://img.shields.io/github/last-commit/redkubes/otomi-core)

<p align="center">
	<img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="ExternalDNS">
</p>

# Otomi Core

Otomi Core is the heart of the Otomi Container Platform, which extends Kubernetes with an advanced ingress architecture, curated industry proven applications and policies for better governance and security.

Otomi aims to support the most common DevOps use cases and strongly relies on GitOps pattern, where desired state is reflected as code and any change to that manifest is reflected at the platform.

Otomi is multi tenant and easily integrates with existing identity providers for faster team onboarding process.

Learn more about Otomi at [otomi.io](https://otomi.io).

# Quick start

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

The Community Edition (CE) has limited web interface capabilities, and is available in read-only mode. That means you will have to modify configuration directly in your git repository and there is no role based access control on that level.

The Enterprise Edition (EE) is beneficial for organization at scale. Its focus is on daily user performace and role based access control to platform configuration. The Enterprise Edition enriches the CE's web application with full platform management capabilities and team self service features.

You can easily upgrade to Enterprise Edition by purchasing a license at [redkubes.com](https://redkubes.com/pricing/)

# Contribution

If you wish to contribute please read our [Contributor Code of Conduct](./docs/CODE_OF_CONDUCT.md) and [Contribution Guidelines](./docs/CONTRIBUTING.md).
