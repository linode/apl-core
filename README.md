<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Self-hosted PaaS for Kubernetes
</h1>
<p align="center"><b>A complete platform experience on top of any Kubernetes cluster to empower developers and lower the burden on operations</b></p>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/v/release/redkubes/otomi-core" /></a>
  <a href="https://hub.docker.com/r/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker"><img alt="Build status" src="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
  <a href="https://img.shields.io/github/stars/redkubes/otomi-core?style=social"><img alt="GitHub User's stars" src="https://img.shields.io/github/stars/redkubes/otomi-core?style=social"></a>
  <a href="https://twitter.com/RedKubes"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/redkubes?style=social"></a>
  <a href="https://www.youtube.com/channel/UCarOB4QW6lTqKG17XUT2uaA"><img alt="YouTube Channel Subscribers" src="https://img.shields.io/youtube/channel/subscribers/UCarOB4QW6lTqKG17XUT2uaA?style=social"></a>
</p>

<p align="center">
<a href="https://otomi.io/">Go to documentation</a>
|
<a href="https://otomi.slack.com/ssb/redirect#/shared-invite/email">Join our Slack channel</a>
</p>

Otomi brings a complete PaaS to your Kubernetes clusters without the constraints and abstractions of traditional PaaS offerings like OpenShift, Cloud Foundry and Heroku. No more reinveting the wheel when building and maintaining your own K8s based internal (developer) platform.

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/otomi-apps.png/?raw=true" width="100%" align="center" alt="Otomi apps"></p>

## 🚀 Getting started

### Quick starts

Use the Terraform quick starts for Azure, GCP, and AWS to provision a Managed Kubernetes cluster in your cloud of choice and install Otomi with minimal values. Go to the [quickstart repository](https://github.com/redkubes/quickstart) to get started.

When the installer job is finished, follow the [activation steps](https://otomi.io/docs/installation/activation/)

### Helm

To install Otomi using Helm, make sure to have a K8s cluster running with at least:
- Version `1.18` up to `1.23`
- A node pool with **6 vCPU** and **8GB+ RAM** (more is advised)
- Calico CNI installed (or any other CNI that supports K8s network policies)
- When installing using the `custom` provider, make sure the K8s LoadBalancer Service created by Otomi can obtain a external accessible IP (using a cloud load balancer or MetalLB)

Add the Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core \
helm repo update
```

and then install the Helm chart:

```bash
helm install otomi otomi/otomi \
  --set cluster.k8sVersion="$VERSION" \ # 1.19, 1.20, 1.21, 1.22 and 1.23 are supported
  --set cluster.name=$CLUSTERNAME \
  --set cluster.provider=$PROVIDER # use azure, aws, google or custom (for any other K8s)
```

When the installer job is completed, follow the [activation steps](https://otomi.io/docs/installation/activation/)

## 🎉 Otomi Features

![Otomi features](https://github.com/redkubes/otomi-core/blob/master/docs/img/otomi-features.gif)

✅  Drag and Drop apps to create your own preferred suite

✅  Advanced ingress architecture. Expose services with just one click

✅  Configure network policies for internal ingress and external egress

✅  Deploy Knative serverless workloads without writing any YAML

✅  Create and manage secrets in HashiCorp Vault and use them in your workloads

✅  Create Kubernetes Jobs and Cron Jobs without writing any YAML

✅  Role-based access to all integrated applications based on  group membership

✅  Policy enforcement based on a customizable set of security policies

✅  Direct access to logs and metrics of your deployed workloads

✅  Onboard new development teams or projects within minutes in a comprehensive multi-tenant setup 

✅  Make development teams self-serving by providing access to predefined automation tasks

✅  Bring your favorite IdP, DNS and/or CA

## 🧑‍💻 Integrated technologies

`Otomi` installs, configures, integrates and automates all of your favorite technologies into a single installable and customizable package:

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/master/docs/img/technologies.png/?raw=true" width="100%" align="center" alt="Integrated technologies"></p>

<details>
 <summary><b>Learn more about all the integrated technologies</b></summary>

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

</details>

## 💪 Otomi Projects

`Otomi` consists out of the following projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi API](https://hub.docker.com/repository/docker/otomi/api): The brain of Otomi, handling console input and talking to Otomi Core
- [Otomi Console](https://hub.docker.com/repository/docker/otomi/console): The UI of Otomi for admins and teams, talking to Otomi API
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## 📖 Documentation

Check out the [dev docs index](./docs/index.md) for developer documentation or go to [otomi.io](https://otomi.io) for more detailed documentation and [tutorials](https://otomi.io/docs/tutorials/).

## 🤝 Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).

If you want to say **thank you** or/and support the active development of `Otomi`:

- Add a [GitHub Star](https://github.com/redkubes/otomi-core) to the project
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog as we are curious to see how you use Otomi

## 🔖 License

`Otomi` is free and open-source software licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/master/LICENSE).
