<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Shift left with Otomi
</h1>
<p align="center">Otomi empowers developers and lowers the burden on Operations teams when using <b>Kubernetes</b> by providing a productivity suite with pre-configured apps and self-service tasks</p>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/v/release/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/docker/pulls/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker"><img alt="Build status" src="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
</p>

## Quick start

### `Terraform`

Use the Terraform quick start for Azure, GCP, and AWS to provision a Kubernetes cluster in your cloud of choice and install Otomi with minimal values. Go to the [quickstart repository](https://github.com/redkubes/quickstart) to get started.

When the installer job (in the default namespace) has finished, copy the URL and the generated password from the bottom of the logs of the job and complete the [post-installion steps](https://otomi.io/docs/installation/post-install/).

### `Helm Chart`

To install `Otomi` with minimal values using the Helm chart, first create a `values.yaml` file with the following values:

```yaml
cluster:
  k8sVersion: '1.20' # currently 1.18, 1.19, 1.20 and 1.21 are supported
  name: # the name of your cluster
  provider: # choose between aws, azure, google or onprem
```

add the Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

and then install the Helm chart:

```bash
helm install -f values.yaml otomi otomi/otomi
```

When the installer job (in the default namespace) has finished, copy the URL and the generated password from the bottom of the logs and complete the [post-installation steps](https://otomi.io/docs/installation/post-install/).

After installing `Otomi`, you can use [Otomi Console](https://otomi.io/docs/console/) to access all integrated applications and self-service features.

## Key features

- Single installable package
- Developer self-service
- Configuration as Code
- Multi-tenancy
- Kubernetes-native
- Security policy enforcement
- Single Sign-On, bring your own IdP
- Automatic ingress configuration
- Full observability
- Implemented Kubernetes best-practices
- Over 30 pre-configured and integrated apps and add-ons

## Self-service tasks

<details>
  <summary>:point_right: Click here to see all the self-service tasks :point_left:</summary>

### Configure Ingress

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/configure-ingress.png" width="100%" align="center" alt="Configure Ingress"></p>
Configure exposure for pre-deployed services with a single click. All ingress resources are automatically created and configured.

### Deploy serverless workloads

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/serverless-workloads.png" width="100%" align="center" alt="Configure Ingress"></p>
Use the web UI to deploy Knative serverless workloads without writing any YAML.

### Use Secrets stored in Vault

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/secrets.png" width="100%" align="center" alt="Configure Ingress"></p>
Create and manage secrets in HashiCorp Vault, map secrets to the configuration, and use them in Kubernetes

### Create Teams for multi-tenancy

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/teams.png" width="100%" align="center" alt="Configure Ingress"></p>
Onboard new development teams or projects within minutes in a comprehensive multi-tenant setup

### Create Jobs and CronJobs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/jobs.png" width="100%" align="center" alt="Configure Ingress"></p>
Use the web UI to create Kubernetes Jobs and Cron Jobs without writing any YAML  

### Configure OIDC authentication

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/oidc.png" width="100%" align="center" alt="Configure Ingress"></p>
Use Keycloak as IdP or bring your own IdP and provide role-based access to all integrated apps

### Manage artifacts

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/artifacts.png" width="100%" align="center" alt="Configure Ingress"></p>
Get role-based access to Harbor

### Configure Alerting

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/alerts.png" width="100%" align="center" alt="Configure Ingress"></p>
Use the web UI to configure alerting endpoints per cluster and per team

### Enforce security policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/policies.png" width="100%" align="center" alt="Configure Ingress"></p>
Select the security mode and start enforcing security policies 

### Access container metrics

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/metrics.png" width="100%" align="center" alt="Configure Ingress"></p>
Get direct access to pre-configured Grafana dashboards

### Configure network policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/network-policies.png" width="100%" align="center" alt="Configure Ingress"></p>
Use the web UI to configure network access to services between teams or between services in the same team

</details>

## Integrated and pre-configured applications

`Otomi` ships with the following pre-configured and ready-to-use applications and add-ons:

- [Istio](https://istio.io/): The service mesh framework with end-to-end transit encryption
- [Knative](https://knative.dev/): Deploy and manage serverless workloads
- [Prometheus](https://prometheus.io/): Collecting container application metrics
- [Loki](https://grafana.com/oss/loki/): Collecting container application logs
- [Harbor](https://goharbor.io/): Container image registry with role-based access control, image scanning, and image signing
- [HashiCorp Vault](https://www.vaultproject.io/): Manage Secrets and Protect Sensitive Data
- [Kubeapps](https://bitnami.com/kubernetes/kubeapps): Launching and managing applications on Kubernetes
- [Keycloak](https://www.keycloak.org/): Identity and access management for modern applications and services
- [OPA](https://www.openpolicyagent.org/): Policy-based control for cloud-native environments
- [Let's Encrypt](https://letsencrypt.org/): A nonprofit Certificate Authority providing industry-recognized TLS certificates
- [Jaeger](https://www.jaegertracing.io/): End-to-end distributed tracing and monitor for complex distributed systems
- [Kiali](https://kiali.io/): Observe Istio service mesh relations and connections
- [External DNS](https://github.com/kubernetes-sigs/external-dns): Synchronize exposed ingresses with DNS providers
- [Drone](https://www.drone.io/): Continuous integration platform built on Docker

## Advanced configuration

`Otomi` can be installed with the following advanced configuration options:

- Use a DNS zone with LetsEncrypt certificates
- Configure Azure Active Directory as IdP
- Use SOPS/KMS to encrypt sensitive configuration values

Go to [otomi.io](https://otomi.io) for more detailed instructions.

## Projects

`Otomi` consists out of multiple projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi API](https://hub.docker.com/repository/docker/otomi/api): The brain of Otomi, handling console input and talking to Otomi Core
- [Otomi Console](https://hub.docker.com/repository/docker/otomi/console): The UI of Otomi for admins and teams, talking to Otomi API
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## Documentation

Check out the [dev docs index](./docs/index.md) for developer documentation or go to [otomi.io](https://otomi.io) for more detailed documentation and [tutorials](https://otomi.io/docs/tutorials/).

## Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).

If you want to say **thank you** or/and support the active development of `Otomi`:

- Add a [GitHub Star](https://github.com/redkubes/otomi-core) to the project
- Write interesting articles about the project on [Dev.to](https://dev.to/), [Medium](https://medium.com/) or on your personal blog

## Community

- Join the [Otomi Community Slack Channel](https://otomi.slack.com/signup#/domain-signup)
- Subscribe to the [Otomi Community Page](https://redkubes.com/community/)

## ⚠️ License

`Otomi` is free and open-source software licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/master/LICENSE).
