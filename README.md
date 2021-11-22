<p align="center"><img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="Otomi"></p>

# Otomi

![Build Status](https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker) ![Downloads](https://img.shields.io/github/downloads/redkubes/otomi-core/total) ![Docker Image Version (latest semver)](https://img.shields.io/docker/v/otomi/core?sort=semver) ![Crates.io](https://img.shields.io/crates/l/ap) ![GitHub last commit](https://img.shields.io/github/last-commit/redkubes/otomi-core) ![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

<p align="center"><img src="https://otomi.io/assets/images/architecture-732f4ad360d0de9d24f9045e9ad3dfc2.png" width="100%" align="center" alt="Otomi Architecture"></p>

Otomi makes developers self-serving and helps DevOps teams to guarantee application security and availability at the earliest stages in the development lifecycle when using Kubernetes and strongly relies on GitOps patterns, where desired state is reflected as code and the cluster state is automatically updated. 

Otomi is a single deployable package for Kubernetes and offers:

- Developer self-service
- Pre-configured and ready-to-use applications
- Application configuration management
- Multi-tenancy
- Implemented security policies
- Single Sign On
- Automatic ingress configuration
- Input/output validation
- Automatic image vulnerability scanning
- Secrets management
- Full observability
- Kubernetes best-practices

Learn more about Otomi at [otomi.io](https://otomi.io/about).

## Get started (experimentation and evaluation purposes only)

---
**NOTE**

When installing Otomi using the quickstarts or installing with minimal values using Helm, you will not be able to pull images from the local Harbor registry. Go to [otomi.io](https://otomi.io) for full installation instructions.

---

### Quickstart

Use the quickstart for Azure, GCP and AWS to provision a Kubernetes cluster in your cloud of choice and install Otomi with minimal values. Go to the [quickstart repository](https://github.com/redkubes/quickstart) to get started.

### Install with chart

To install Otomi with minimal values using the Helm chart:

Create a `values.yaml` file with the following values

```yaml
cluster:
  k8sVersion: "1.20" # 1.18, 1.19, 1.20 and 1.21 are supported
  name: # the name of your cluster
  owner: # the owner of the cluster
  provider: # choose between aws, azure, google or onprem
```

Add the repository

```bash
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

Install the chart

```bash
helm install -f values.yaml otomi otomi/otomi
```

When the installer has finished, copy the URL and the generated password from the bottom of the logs of the installer job (in the default namespace). Now complete the [post-installion steps](https://otomi.io/docs/installation/post-install/)

See [otomi.io](https://otomi.io) for detailed instructions on how to install Otomi with more advanced configuration options.

After installing Otomi, you can use Otomi Console to access all integrated applications and use the self-service features to create Knative services, publicly expose services, create secrets and create jobs.

<p align="center"><img src="https://otomi.io/assets/images/console-apps-eed3320fa1754480a623287e0bbe2365.png" width="100%" align="center" alt="Otomi Console"></p>

## Projects

Otomi consists out of multiple projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi API](https://github.com/redkubes/otomi-api): The brain of Otomi, handling console input and talking to Otomi Core
- [Otomi Console](https://github.com/redkubes/otomi-console): The UI of Otomi for admins and teams, talking to Otomi API
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).
