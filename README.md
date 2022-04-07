<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Shift left with Otomi
</h1>
<p align="center">Otomi empowers developers and lowers the burden on operations when using <b>Kubernetes</b> by providing a complete suite of pre-configured Kubernetes application combined with automation and developer self-service</p>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/v/release/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/docker/pulls/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker"><img alt="Build status" src="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
</p>

## About Otomi

Otomi is a Kubernetes Applications Configuration & Automation Platform.

- Install all your favorite Kubernetes apps in one run on AKS, EKS or GKE
- Turn apps on/off to create your ideal suite of apps
- Adjust the configuration of apps based on Configuration as Code
- Get a full multi-tenant platform experience with an advanced ingress architecture out-of-the-box
- Make developers self-serving

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/platform-apps.png" width="100%" align="center" alt="Otomi platform apps"></p>

## Quick start

**NOTE**

If you already have a Kubernetes cluster running in one of the supported public clouds, then you can skip `terraform quickstart` and move straight to [helm chart install.](#helm-chart)

---

### Terraform

Use the Terraform quick start for Azure, GCP, and AWS to provision a Managed Kubernetes cluster in your cloud of choice and install Otomi with minimal values. Go to the [quickstart repository](https://github.com/redkubes/quickstart) to get started.

When the installer job (in the default namespace) has finished, copy the URL and the generated password from the bottom of the logs of the job and complete the [post-installation steps](https://otomi.io/docs/installation/post-install/).

### Helm Chart

To install Otomi using the Helm chart, make sure to have a running Kubernetes cluster of version `1.18` up to `1.21` with a node pool with at least **12 vCPU** and **32GB+ RAM** in AWS, Azure, GCP. To use the network policies features in Otomi, make sure to use a CNI that supports Kubernetes network policies (like Calico).

<<<<<<< HEAD

### Helm Chart

||||||| 1ca2faa6

### `Helm Chart`

=======
For testing and experimentation, we advise to use the following machine/instance types:

- Azure: 3 x DS3_v2 (4 vCPU / 14 GiB RAM)
- AWS: 3 x t2.xlarge (4 vCPU / 16 GiB RAM)
- GCP: 3 x e2-standard-4 (4 vCPU / 16 GiB RAM)
  > > > > > > > origin/master

To install `Otomi` with minimal values using the Helm chart, first create a `values.yaml` file with the following values:

```yaml
cluster:
  k8sVersion: '1.21' # currently 1.18, 1.19, 1.20 and 1.21 are supported
  name: # the name of your cluster
  provider: # choose between aws, azure, google
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

<<<<<<< HEAD
After installing `Otomi`, you can use [Otomi Console](https://otomi.io/docs/console/) to access all integrated applications and self-service features.
||||||| 1ca2faa6
After installing `Otomi`, you can use [Otomi Console](https://otomi.io/docs/console/) to access all integrated applications and use the self-service features to create new Knative services, publicly expose pre-deployed services, create secrets and create Kubernetes Jobs / Cron Jobs.

<p align="center"><img src="https://otomi.io/assets/images/console-apps-eed3320fa1754480a623287e0bbe2365.png" width="100%" align="center" alt="Otomi Console"></p>

## ⚙️ Advanced configuration

`Otomi` can be installed with the following advanced configuration options:

- Use a DNS zone with LetsEncrypt certificates
- Configure Azure Active Directory as IdP
- Use SOPS/KMS to encrypt sensitive configuration values

# Go to [otomi.io](https://otomi.io) for more detailed instructions.

After installing `Otomi`, you can use [Otomi Console](https://otomi.io/docs/console/) to access all integrated applications and self-service features.

## Advanced configuration

`Otomi` can be installed with the following advanced configuration options:

- Use a DNS zone with LetsEncrypt certificates
- Use your own CA
- Configure Azure Active Directory as IdP
- Use SOPS/KMS to encrypt sensitive configuration code like passwords
- Use GitHub or GitLab as the configuration code repository

Go to [otomi.io](https://otomi.io) for more detailed instructions.

> > > > > > > origin/master

## Developer self-service features

### Configure Ingress

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/configure-ingress.png" width="100%" align="center" alt="Configure Ingress"></p>
Configure exposure for pre-deployed services with a single click. All ingress resources are automatically created and configured.

### Configure network policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/network-policies.png" width="100%" align="center" alt="Kubernetes network policies"></p>
Configure network access to services between teams or between services in the same team.

### Deploy serverless workloads

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/serverless-workloads.png" width="100%" align="center" alt="Knative workloads"></p>
Deploy Knative serverless workloads without writing any YAML.

### Use Secrets stored in Vault

<<<<<<< HEAD

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

## Developer self-service features

### Configure Ingress

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/configure-ingress.png" width="100%" align="center" alt="Configure Ingress"></p>
Configure exposure for pre-deployed services with a single click. All ingress resources are automatically created and configured.

### Configure network policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/network-policies.png" width="100%" align="center" alt="Kubernetes network policies"></p>
Configure network access to services between teams or between services in the same team.

### Deploy serverless workloads

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/serverless-workloads.png" width="100%" align="center" alt="Knative workloads"></p>
Deploy Knative serverless workloads without writing any YAML.

### Use Secrets stored in Vault

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/secrets.png" width="100%" align="center" alt="Kubernetes secrets"></p>
Create and manage secrets in HashiCorp Vault, map secrets to the configuration, and use them in your deployments.

### Create Jobs and CronJobs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/jobs.png" width="100%" align="center" alt="Kubernetes jobs"></p>
Use the web UI to create Kubernetes Jobs and Cron Jobs without writing any YAML.

### Manage artifacts in Harbor

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/artifacts.png" width="100%" align="center" alt="Manage artifacts in Harbor"></p>
Role-based access to Harbor based on team membership.
||||||| 1ca2faa6
- Developer self-service
- Over 20 pre-configured and ready-to-use applications and add-ons
- Application configuration management
- Multi-tenancy
- Implemented security policies
- Single Sign-On
- Automatic ingress configuration
- Input/output validation
- Automatic image vulnerability scanning
- Secrets management
- Full observability
- Kubernetes best-practices
- GitOps workflow
=======
<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/secrets.png" width="100%" align="center" alt="Kubernetes secrets"></p>
Create and manage secrets in HashiCorp Vault, map secrets to the configuration, and use them in your deployments.
>>>>>>> origin/master

<<<<<<< HEAD

### Configure notification receivers

||||||| 1ca2faa6
Learn more about `Otomi` at [otomi.io](https://otomi.io/about).
=======

### Create Jobs and CronJobs

> > > > > > > origin/master

<<<<<<< HEAD

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/notification-receivers.png" width="100%" align="center" alt="Configure notification receivers"></p>
Configure notification receivers for your team

### Direct access to OPA/Gatekeeper logs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/opa-logs.png" width="100%" align="center" alt="Kubernetes Security policies"></p>
See how your team workloads comply to security policies.

### Direct access to container logs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/logs.png" width="100%" align="center" alt="Log aggregation"></p>
Get direct access to logs of your deployed workloads. Logs are only accessible for team members.

## Platform admin features

### Create Teams for multi-tenancy

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/teams.png" width="100%" align="center" alt="Kubernetes multi-tenancy"></p>
Onboard new development teams or projects within minutes in a comprehensive multi-tenant setup. Configure resource quota and allowed self-service features.

### Enforce security policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/policies.png" width="100%" align="center" alt="Enforce OPA policies"></p>
Select the security policies teams need to comply to.

### Configure platform settings

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/platform-settings.png" width="100%" align="center" alt="Platform configuration"></p>
Use the UI to add additional clusters running Otomi and configure alerting, DNS, KMS, OIDC and SMTP.

## Integrated and pre-configured applications

||||||| 1ca2faa6

## Integrated applications

=======

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/jobs.png" width="100%" align="center" alt="Kubernetes jobs"></p>
Use the web UI to create Kubernetes Jobs and Cron Jobs without writing any YAML.

### Manage artifacts in Harbor

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/artifacts.png" width="100%" align="center" alt="Manage artifacts in Harbor"></p>
Role-based access to Harbor based on team membership.

### Configure notification receivers

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/notification-receivers.png" width="100%" align="center" alt="Configure notification receivers"></p>
Configure notification receivers for your team

### Direct access to OPA/Gatekeeper logs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/opa-logs.png" width="100%" align="center" alt="Kubernetes Security policies"></p>
See how your team workloads comply to security policies.

### Direct access to container logs

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/logs.png" width="100%" align="center" alt="Log aggregation"></p>
Get direct access to logs of your deployed workloads. Logs are only accessible for team members.

## Platform admin features

### Create Teams for multi-tenancy

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/teams.png" width="100%" align="center" alt="Kubernetes multi-tenancy"></p>
Onboard new development teams or projects within minutes in a comprehensive multi-tenant setup. Configure resource quota and allowed self-service features.

### Enforce security policies

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/policies.png" width="100%" align="center" alt="Enforce OPA policies"></p>
Select the security policies teams need to comply to.

### Configure platform settings

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/platform-settings.png" width="100%" align="center" alt="Platform configuration"></p>
Use the UI to add additional clusters running Otomi and configure alerting, DNS, KMS, OIDC and SMTP.

## Integrated and pre-configured applications

> > > > > > > origin/master

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
  <<<<<<< HEAD
- [Gitea](https://gitea.io/): Self-hosted Git service
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/): Ingress controller for Kubernetes

## Advanced configuration

`Otomi` can be installed with the following advanced configuration options:

- Use a DNS zone with LetsEncrypt certificates
- Use your own CA
- Configure Azure Active Directory as IdP
- Use SOPS/KMS to encrypt sensitive configuration code like passwords
- Use GitHub or GitLab as the configuration code repository

Go to [otomi.io](https://otomi.io) for more detailed instructions.
||||||| 1ca2faa6
=======

- [Gitea](https://gitea.io/): Self-hosted Git service
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/): Ingress controller for Kubernetes
  > > > > > > > origin/master

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
  <<<<<<< HEAD
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog as we are curious to see how you use Otomi

## Community

- Join the [Otomi Community](https://redkubes.com/community/) for latest Otomi news, technical blogs, and events.
- Join the [Otomi Slack Channel](https://otomi.slack.com/signup#/domain-signup)
  ||||||| 1ca2faa6
- # Write interesting articles about the project on [Dev.to](https://dev.to/), [Medium](https://medium.com/) or on your personal blog
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog as we are curious to see how you use Otomi

## Community

- Join the [Otomi Community](https://redkubes.com/community/) for latest Otomi news, technical blogs, and events.
- Join the [Otomi Slack Channel](https://otomi.slack.com/ssb/redirect#/shared-invite/email)
  > > > > > > > origin/master

## License

`Otomi` is free and open-source software licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/master/LICENSE).
