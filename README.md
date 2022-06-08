<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Self-hosted PaaS for Kubernetes
</h1>
<p align="center"><b>Deploy your apps fast and safe on any Kubernetes cluster in any cloud.</b></p>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/v/release/redkubes/otomi-core" /></a>
  <a href="https://hub.docker.com/r/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker"><img alt="Build status" src="https://img.shields.io/github/workflow/status/redkubes/otomi-core/Build%20and%20publish%20Docker" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
  <a href="https://img.shields.io/github/stars/redkubes/otomi-core?style=social"><img alt="GitHub User's stars" src="https://img.shields.io/github/stars/redkubes/otomi-core?style=social"></a>
  <a href="http://otomi.io/"><img src="https://img.shields.io/website-up-down-green-red/http/shields.io.svg" alt="Website otomi.io"></a>
  <a href="https://twitter.com/intent/tweet?text=Otomi%20self-hosted%20PaaS%20for%20K8s.%20Try%20it%20out!%20&hashtags=OpenSource,Kubernetes,DevOps,Otomi,PaaS&url=https://github.com/redkubes/otomi-core%0a"><img src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social" alt="Tweet"></a>
  <a href="https://www.youtube.com/channel/UCarOB4QW6lTqKG17XUT2uaA"><img alt="YouTube Channel Subscribers" src="https://img.shields.io/youtube/channel/subscribers/UCarOB4QW6lTqKG17XUT2uaA?style=social"></a>
</p>

<p align="center">
<a href="https://join.slack.com/t/otomi/shared_invite/zt-18wo93idx-qFecVX9MzcAAsnfzbliHlg">Join our Slack channel for Q&A</a>
</p>

<p align="center">
<a href="https://marketplace.digitalocean.com/apps/otomi"> 🚀 Start using Otomi on Digital Ocean 🚀</a>
</p>

`Otomi` brings a full platform experience to Kubernetes without the constraints and abstractions. No more reinventing the wheel when building and maintaining your own K8s based (developer) platform.

![Otomi features](https://github.com/redkubes/otomi-core/blob/main/docs/img/otomi-features.gif)

## 🚀 Getting started

### Helm

To install `Otomi` using Helm, make sure to have a K8s cluster running with at least:

- Version `1.18` up to `1.23`
- A node pool with **6 vCPU** and **8GB+ RAM** (more is advised!)
- Calico CNI installed (or any other CNI that supports K8s network policies)
- When installing using the `custom` provider, make sure the K8s LoadBalancer Service created by `Otomi` can obtain an external accessible IP (using a cloud load balancer or MetalLB)

Add the Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core \
helm repo update
```

and then install the Helm chart:

```bash
helm install otomi otomi/otomi \
--set cluster.k8sVersion=$VERSION \ # 1.19, 1.20, 1.21, 1.22 and 1.23 are supported
--set cluster.name=$CLUSTERNAME \
--set cluster.provider=$PROVIDER # use azure, aws, google, digitalocean or custom for any other cloud or onprem K8s
```

When the installer job is completed, follow the [activation steps](https://otomi.io/docs/installation/activation/).

### K8s quick starts

Use the [quickstarts](https://github.com/redkubes/quickstart) for Azure, GCP, AWS, Linode, Digital Ocean and Minikube to provision a Kubernetes cluster. Then use the helm chart to install `Otomi`.

### Workshops

In our [workshops](https://github.com/redkubes/workshops) repository, we have prepared a comprehensive set of hands-on labs to get a good understanding/overview of Otomi.

## 🎉 Otomi Features

✅ Drag and Drop apps to create your own preferred suite

✅ GitOps with Argo CD out-of-the-box

✅ Advanced ingress architecture. Expose services with just a few clicks

✅ Configure network policies for internal ingress and external egress

✅ Deploy Knative serverless workloads without writing any YAML

✅ Create and manage secrets in HashiCorp Vault and use them in your workloads

✅ Create Kubernetes Jobs and Cron Jobs without writing any YAML

✅ Role-based access to all integrated applications based on group membership

✅ Policy enforcement based on a default set of security policies

✅ Direct access to logs and metrics of your deployed workloads

✅ Onboard new development teams or projects within minutes in a comprehensive multi-tenant setup

✅ Make development teams self-serving by providing access to predefined automation tasks

✅ Bring your favorite IdP, DNS and/or CA

## 🧑‍💻 Integrated technologies

`Otomi` installs, configures, integrates and automates all of your favorite technologies:

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/main/docs/img/tech.png/?raw=true" width="100%" align="center" alt="Integrated technologies"></p>

Learn more about all the integrated technologies:

- [Istio](https://github.com/istio/istio): The service mesh framework with end-to-end transit encryption
- [Argo CD](https://github.com/argoproj/argo-cd): Declarative continuous deployment
- [Knative](https://github.com/knative/serving): Deploy and manage serverless workloads
- [Prometheus](https://github.com/prometheus/prometheus): Collecting container application metrics
- [Loki](https://github.com/grafana/loki): Collecting container application logs
- [Harbor](https://github.com/goharbor/harbor): Container image registry with role-based access control, image scanning, and image signing
- [HashiCorp Vault](https://github.com/hashicorp/vault): Manage Secrets and Protect Sensitive Data
- [Kubeapps](https://github.com/vmware-tanzu/kubeapps): Launching and managing applications on Kubernetes
- [Keycloak](https://github.com/keycloak/keycloak): Identity and access management for modern applications and services
- [OPA](https://github.com/open-policy-agent/opa): Policy-based control for cloud-native environments
- [Let's Encrypt](https://letsencrypt.org/): A nonprofit Certificate Authority providing industry-recognized TLS certificates
- [Jaeger](https://github.com/jaegertracing/jaeger): End-to-end distributed tracing and monitor for complex distributed systems
- [Kiali](https://github.com/kiali/kiali): Observe Istio service mesh relations and connections
- [External DNS](https://github.com/kubernetes-sigs/external-dns): Synchronize exposed ingresses with DNS providers
- [Drone](https://github.com/harness/drone): Continuous integration platform built on Docker
- [Gitea](https://github.com/go-gitea/gitea): Self-hosted Git service
- [Nginx Ingress Controller](https://github.com/kubernetes/ingress-nginx): Ingress controller for Kubernetes


## 💪 Otomi Projects

`Otomi` consists out of the following projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi API](https://hub.docker.com/repository/docker/otomi/api): The brain of Otomi, handling console input and talking to Otomi Core
- [Otomi Console](https://hub.docker.com/repository/docker/otomi/console): The UI of Otomi for admins and teams, talking to Otomi API
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## 📖 Documentation

Check out the [dev docs index](./docs/index.md) for developer documentation or go to [otomi.io](https://otomi.io) for more detailed documentation.

## 🤝 Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).

If you want to say **thank you** or/and support the active development of `Otomi`:
main

- Add a [GitHub Star](https://github.com/redkubes/otomi-core) to the project
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog as we are curious to see how you use `Otomi`

This project exists thanks to all the people who contribute and have contributed.

<a href="https://github.com/redkubes/otomi-core/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=redkubes/otomi-core" />
</a>

## 🔖 License

`Otomi` is free and open-source software licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/main/LICENSE).
