<p align="center"><img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="Otomi"></p>

# Otomi

![Build Status](https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker) ![Downloads](https://img.shields.io/github/downloads/redkubes/otomi-core/total) ![Docker Image Version (latest semver)](https://img.shields.io/docker/v/otomi/core?sort=semver) ![Crates.io](https://img.shields.io/crates/l/ap) ![GitHub last commit](https://img.shields.io/github/last-commit/redkubes/otomi-core) ![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)

## About Otomi

Otomi is an open-source cloud-agnostic platform to run on top of Kubernetes to securely deploy, run and manage applications with a desktop-like user interface.

Otomi is **free**, **easy to install**, comes with an **intuitive desktop-like UI** and ready to use **pre-configured built-in applications** to offer an **out-of-the-box experience**. Just like you would expect from your favorite Linux distribution. After installing Otomi on Kubernetes, you can log in and immediately start deploying and use all the built-in applications. Get started at [otomi.io](https://otomi.io/).

Otomi is built on top of the following open-source projects:

- [Harbor](https://github.com/goharbor/harbor)
- [Istio](https://github.com/istio/istio)
- [Knative Serving](https://github.com/knative/serving)
- [Nginx Ingress](https://github.com/kubernetes/ingress-nginx)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)
- [Grafana Loki](https://github.com/grafana/loki)
- [HashiCorp Vault](https://github.com/hashicorp/vault)
- [Gatekeeper](https://github.com/open-policy-agent/gatekeeper)
- [Keycloak](https://github.com/keycloak/keycloak)

Otomi offers:

- Developer self-service: Members of a team can directly access all the tools they need and create Services, Jobs and Secrets using Otomi Console
- Pre-configured and ready-to-use applications
- Application configuration management for all integrated applications, providing a base profile configuration to support the most common DevOps use-cases
- Multi-tenancy: Create Teams and provide SSO access to shared applications
- Implemented policies for better governance and security. Manifests are checked both statically and on the cluster at runtime for policy obedience
- Single Sign On: Bring your own IDP
- Automatic ingress configuration: Easily configure ingress for Team services, allowing public access to services within minutes. Istio gateways and virtual services are automatically generated and configured for Team services, tying a generic ingress architecture to service endpoints in a predictable way
- Input/output validation: Configuration and output manifests are checked statically for validity and best practices
- Automatic vulnerability scanning: Scan all configured Team service containers in Harbor
- Built-in support for Azure, Amazon Web Services and Google Cloud Platform
- And much more..

Check this [video](https://www.youtube.com/watch?v=BtLOeTYSB10) for a first impression of Otomi.

Otomi aims to support the most common DevSecOps use-cases out-of-the-box and strongly relies on GitOps patterns, where desired state is reflected as code and the cluster state is automatically updated. Learn more about Otomi at [otomi.io](https://otomi.io/about).

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

Open the Console:

```bash
open -a "Google Chrome" https://otomi.<your.domain>
```

<p align="center"><img src="https://otomi.io/assets/images/console-apps-3704ab9d42f2f5e545fd5689bb91a974.png" width="100%" align="center" alt="Otomi console CE"></p>

For more detailed documentation on how to get started with Otomi, see [otomi.io](https://otomi.io/).

## Projects

Otomi consists out of multiple projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi API](https://github.com/redkubes/otomi-api): The brain of Otomi, handling console input and talking to Otomi Core
- [Otomi Console](https://github.com/redkubes/otomi-console): The UI of Otomi for admins and teams, talking to Otomi API
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).
