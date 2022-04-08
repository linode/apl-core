<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Shift left with Otomi
</h1>
<p align="center">Otomi empowers developers and lowers the burden on operations when using <b>Kubernetes</b> by providing a complete platform experience</p>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/v/release/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/docker/pulls/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker"><img alt="Build status" src="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
</p>

## About Otomi

- Brings a full PaaS (like Heroku) to your own Kubernetes cluster. The only thing you'll need to do is deploy your application and Otomi will do the rest.
- Allows you to use a PaaS on top of K8s without the constraints and abstractions of traditional PaaS offerings like OpenShift, Cloud Foundry and Heroku.
- Removes the burden of reinveting the wheel when building and maintaining your internal (developer) platform, lowers operational costs, and empowers developers to focus on application deployment and management only.

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/platform-apps.png" width="100%" align="center" alt="Otomi platform apps"></p>

## Get started

**NOTE**

If you already have a Kubernetes cluster running in one of the supported public clouds, then you can skip `terraform quickstart` and move straight to [helm chart install.](#helm-chart)

---

### Terraform quick starts

Use the Terraform quick start for Azure, GCP, and AWS to provision a Managed Kubernetes cluster in your cloud of choice and install Otomi with minimal values. Go to the [quickstart repository](https://github.com/redkubes/quickstart) to get started.

When the installer job (in the default namespace) has finished, copy the URL and the generated password from the bottom of the logs of the job and complete the [post-installation steps](https://otomi.io/docs/installation/post-install/).

### Install on your own K8s cluster using the Helm Chart

To install Otomi using the Helm chart, make sure to have a K8s cluster running with at least:
- Version `1.18` up to `1.23`
- A node pool with **8 vCPU** and **8GB+ RAM**
- Calico add-on (or any other CNI that supports network policies) installed to use the network policies features


First add the Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

and then install the Helm chart:

```bash
helm install otomi otomi/otomi \
--set cluster.k8sVersion="$VERSION" \ # 1.19, 1.20, 1.21, 1.22 and 1.23 are supported
--set cluster.name=$CLUSTERNAME \
--set cluster.provider=$PROVIDER \ # use azure, aws, google or custom (for any other K8s)
```

When the installer job (in the default namespace) has finished, copy the URL and the generated password from the bottom of the logs, sign in to the console and then first activate Drone.

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
- [Gitea](https://gitea.io/): Self-hosted Git service
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/): Ingress controller for Kubernetes

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
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog as we are curious to see how you use Otomi

## Community

- Join the [Otomi Community](https://redkubes.com/community/) for latest Otomi news, technical blogs, and events.
- Join the [Otomi Slack Channel](https://otomi.slack.com/ssb/redirect#/shared-invite/email)

## License

`Otomi` is free and open-source software licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/master/LICENSE).
