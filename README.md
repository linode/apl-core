<h1 align="center">
  <img src="https://otomi.io/img/otomi-logo.svg" width="224px"/><br/>
  Self-hosted PaaS for Kubernetes
</h1>

<p align="center">
  <a href="https://github.com/redkubes/otomi-core/releases/"><img alt="Releases" src="https://img.shields.io/github/release-date/redkubes/otomi-core?label=latest%20release" /></a>
  <a href="https://hub.docker.com/r/otomi/core"><img alt="Docker pulls" src="https://img.shields.io/docker/pulls/otomi/core" /></a>
  <a href="https://img.shields.io/github//redkubes/otomi-core/actions/workflows/main.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/redkubes/otomi-core/main.yml" /></a>
  <a href="https://img.shields.io/github/last-commit/redkubes/otomi-core"><img alt="Last commit" src="https://img.shields.io/github/last-commit/redkubes/otomi-core" /></a>
  <a href="https://img.shields.io/crates/l/ap"><img alt="License" src="https://img.shields.io/crates/l/ap" /></a>
  <a href="https://img.shields.io/badge/contributions-welcome-orange.svg"><img alt="Contributions" src="https://img.shields.io/badge/contributions-welcome-orange.svg" /></a>
  <a href="http://otomi.io/"><img src="https://img.shields.io/website-up-down-green-red/http/shields.io.svg" alt="Website otomi.io"></a>
  <a href="https://join.slack.com/t/otomi/shared_invite/zt-1axa4vima-E~LHN36nbLR~ay5r5pGq9A"><img src="https://img.shields.io/badge/slack--channel-blue?logo=slack"></a>
  <a href="https://twitter.com/RedKubes"><img src="https://img.shields.io/static/v1?label=Twitter&message=Follow&color=1DA1F2" alt="Follow us on Twitter"></a>
  <a href="https://www.facebook.com/groups/otomiusers"><img src="https://img.shields.io/static/v1?label=Facebook&message=Join group&color=1877F2" alt="Join Facebook group"></a>
</p>

<h4 align="center">
Add developer- and operations-centric tools, automation and self-service on top of Kubernetes in any infrastructure or cloud. 
</h4>

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/main/docs/img/otomi-console.png/?raw=true" width="100%" align="center" alt="Otomi integrated applications"></p>

## Otomi helps

**Developers** - With easy self-service that helps them to focus on their apps only

- Build OCI compliant images from application code
- Deploy containerized workloads the GitOps way without writing any YAML
- Get instant access to logs and metrics
- Store charts and images in a private registry
- Build and run custom CI pipelines
- Expose applications and network policies with just a few clicks
- Manage your own secrets in a self-hosted Vault

**Platform engineers** - To setup and manage secure and production-ready Kubernetes-based platforms

- Onboard development teams in a comprehensive multi-tenant setup
- Get all the required K8s tools in an integrated and automated way
- Create your platform profile and deploy to any K8s
- One schema to manage all platform configuration
- Ensure governance with security policies
- Implement zero-trust networking
- Make development teams self-serving
- Change the desired state of the platform based on Configuration-as-Code
- Support multi- and hybrid cloud scenarios

## Getting started

### Helm

To install Otomi using Helm, make sure to have a K8s cluster running with at least:

- Version `1.24`, `1.25` or `1.26`
- A node pool with **9 vCPU** and **12GB+ RAM** (more is advised!)
- Calico CNI installed (or any other CNI that supports K8s network policies)
- When installing using the `custom` provider, make sure the K8s LoadBalancer Service created by `Otomi` can obtain an external IP (using a cloud load balancer or MetalLB)

> **_NOTE:_**  Install Otomi with DNS to unlock it's full potential. Check [otomi.io](https://otomi.io) for more info.

Add the Helm repository:

```bash
helm repo add otomi https://otomi.io/otomi-core
helm repo update
```

and then install the Helm chart:

```bash
helm install otomi otomi/otomi \
--set cluster.name=$CLUSTERNAME \
--set cluster.provider=$PROVIDER # use 'azure', 'aws', 'google', 'digitalocean', 'ovh', 'vultr', 'scaleway' or 'custom' for any other cloud or onprem K8s
```

When the installer job is completed, follow the [activation steps](https://otomi.io/docs/get-started/activation).

## Integrated K8s applications

<p align="center"><img src="https://github.com/redkubes/otomi-core/blob/main/docs/img/tech-stack.png/?raw=true" width="100%" align="center" alt="Otomi integrated applications"></p>

Otomi installs, configures, integrates and automates all of your favorite K8s apps:

- [Istio](https://github.com/istio/istio): The service mesh framework with end-to-end transit encryption
- [Velero](https://github.com/vmware-tanzu/velero): Back up and restore your Kubernetes cluster resources and persistent volumes
- [Argo CD](https://github.com/argoproj/argo-cd): Declarative continuous deployment
- [Knative](https://github.com/knative/serving): Deploy and manage serverless workloads
- [Prometheus](https://github.com/prometheus/prometheus): Collecting container application metrics
- [Grafana](https://github.com/grafana/grafana): Visualize metrics, logs, and traces from multiple sources
- [Loki](https://github.com/grafana/loki): Collecting container application logs
- [Harbor](https://github.com/goharbor/harbor): Container image registry with role-based access control, image scanning, and image signing
- [HashiCorp Vault](https://github.com/hashicorp/vault): Manage Secrets and Protect Sensitive Data
- [Kubeapps](https://github.com/vmware-tanzu/kubeapps): Launching and managing applications on Kubernetes
- [Keycloak](https://github.com/keycloak/keycloak): Identity and access management for modern applications and services
- [OPA/Gatekeeper](https://github.com/open-policy-agent/gatekeeper): Policy-based control for cloud-native environments
- [Let's Encrypt](https://letsencrypt.org/): A nonprofit Certificate Authority providing industry-recognized TLS certificates
- [Jaeger](https://github.com/jaegertracing/jaeger): End-to-end distributed tracing and monitor for complex distributed systems
- [Kiali](https://github.com/kiali/kiali): Observe Istio service mesh relations and connections
- [External DNS](https://github.com/kubernetes-sigs/external-dns): Synchronize exposed ingresses with DNS providers
- [Drone](https://github.com/harness/drone): Continuous integration platform built on Docker
- [Gitea](https://github.com/go-gitea/gitea): Self-hosted Git service
- [Nginx Ingress Controller](https://github.com/kubernetes/ingress-nginx): Ingress controller for Kubernetes
- [Minio](https://github.com/minio/minio): High performance Object Storage compatible with Amazon S3 cloud storage service
- [Trivy](https://github.com/aquasecurity/trivy-operator): Kubernetes-native security toolkit
- [Thanos](https://github.com/thanos-io/thanos): HA Prometheus setup with long term storage capabilities
- [Falco](https://github.com/falcosecurity/falco): Cloud Native Runtime Security
- [Opencost](https://github.com/opencost/opencost): Cost monitoring for Kubernetes
- [Tekton Pipeline](https://github.com/tektoncd/pipeline): K8s-style resources for declaring CI/CD pipelines.
- [Paketo build packs](https://github.com/paketo-buildpacks): Cloud Native Buildpack implementations for popular programming language ecosystems
- [KubeClarity](https://github.com/openclarity/kubeclarity): Detect vulnerabilities of container images
- [Cloudnative-pg](https://github.com/cloudnative-pg/cloudnative-pg): Open source operator designed to manage PostgreSQL workloads

## Otomi Features

- Activate capabilities to compose your own platform
- GitOps out-of-the-box
- Container image scanning (at the gate and at runtime)
- Security policies (at the gate and at runtime)
- Advanced ingress architecture using Istio, Nginx and Oauth2
- Network policies for internal ingress and external egress
- Deploy workloads the GitOps way without writing any YAML
- Create and manage secrets in Vault and use them in workloads
- Role-based access to all integrated tools
- Comprehensive multi-tenant setup
- Automation tasks for Harbor, Keycloak, ArgoCD, Vault, Velero, Gitea and Drone
- Expose services on multiple (public/private) networks
- Automated Istio resource creation and configuration
- SOPS/KMS for encryption of sensitive configuration values
- BYO IdP, DNS and/or CA

And much more...

## Otomi Projects

The open source Core of Otomi consists out of the following projects:

- Otomi Core (this project): The heart of Otomi
- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): Autonomous jobs orchestrated by Otomi Core
- [Otomi Clients](https://github.com/redkubes/otomi-clients): Factory to build and publish openapi clients used in the redkubes/otomi-tasks repo

## Documentation

Check out the [dev docs index](./docs/README.md) for developer documentation or go to [otomi.io](https://otomi.io) for more detailed documentation.

## Contribution

If you wish to contribute please read our [Contributor Code of Conduct](https://otomi.io/community/code-of-conduct) and [Contribution Guidelines](https://otomi.io/community/get-involved).

If you want to say **thank you** or/and support the active development of Otomi:

- [Star](https://github.com/redkubes/otomi-core) the Otomi project on Github
- Feel free to write articles about the project on [dev.to](https://dev.to/), [medium](https://medium.com/) or on your personal blog and share your experiences

This project exists thanks to all the people who have contributed

<a href="https://github.com/redkubes/otomi-core/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=redkubes/otomi-core" />
</a>

## License

Otomi is licensed under the [Apache 2.0 License](https://github.com/redkubes/otomi-core/blob/main/LICENSE).
