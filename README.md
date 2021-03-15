<p align="center">
	<img src="https://otomi.io/img/otomi-logo.svg" width="40%" align="center" alt="ExternalDNS">
</p>

# Otomi Core

Otomi Core is the Heart of the Otomi Container Platform. Otomi Container Platform offers an out-of-the-box enterprise container management platform (on top of Kubernetes) to increase developer efficiency and reduce complexity. It is a turnkey cloud native solution that integrates upstream Kubernetes with proven open source components. Otomi is made available as a single deployable package with curated industry proven applications and policies for better governance and security. With carefully crafted sane defaults at every step, it minimizes configuration effort and time to market. Otomi automates most (if not all) of your cluster operations and includes application lifecycle management at its core. It is open source and transparent, allowing customization but also extensibility. Incorporating Open Source standards and best practices, Otomi aims to bring new features and stability with every iteration.

Important features:

- **Single Sign On**: Bring your own IDP or use Keycloak
- **Multi Tenancy**: Create admins and teams to allow self service of deployments
- **Automatic Ingress Configuration**: Easily configure ingress for team services or core apps, allowing access within minutes.
- **Input/output validation**: Configuration and output manifests are checked statically for validity and best practices.
- **Policy enforcement**: Manifests are checked both statically and on the cluster at runtime for obedience to OPA policies.
- **Automatic Vulnerability Scanning**: All configured team service containers get scanned in Harbor.
- and many more (for a full list see [otomi.io](https://otomi.io))

This repo is also built as an image and published on [docker hub](https://hub.docker.com/repository/docker/otomi/core) at `otomi/core`.
Other parts of the platform:

- [Otomi Tasks](https://github.com/redkubes/otomi-tasks): tasks used by core to glue all it's pieces together
- [Otomi Clients](https://github.com/redkubes/otomi-clients): clients used by the tasks, generated from vendors' openapi specs

This readme is aimed at development. If you wish to contribute please read our [Contributor Code of Conduct](./docs/CODE_OF_CONDUCT.md) and [Contribution Guidelines](./docs/CONTRIBUTING.md).

To get up and running with the platform please follow the [online documentation for Otomi Container Platform](https://otomi.io/). It lists all the prerequisites and tooling expected, so please read up before continuing here.

## Development

### Editing source files

Most of the code is in go templates: helmfile's `*.gotmpl` and helm chart's `templates/*.yaml`. Please become familiar with it's intricacies by reading our [special section on go templating](./docs/GO_TEMPLATING.md).

For editing the `values-schema.yaml` please refer to the [meta-schema documentation](./docs/meta-schema-validation.md).

For working with `bats` and adding tests to `bin/tests/*` please refer to the [online bats documentation](https://bats-core.readthedocs.io/en/latest/)

You can define OPA policies in `policies/*.rego` files that are used both for statical analysis (also at build time), as well as by [gatekeeper](https://github.com/open-policy-agent/gatekeeper) (at run time) to check whether manifests are conformant.

### 1. Validating changes

For the next steps you will need to export `ENV_DIR` to point to your values folder, and source the aliases:

```bash
# assuming you created otomi-values repo next to this:
export ENV_DIR=$PWD/../otomi-values
. bin/aliases
```

### Input

Start by validating the configuration values against the `values-schema.yaml` with:

```bash
# all clusters
otomi validate-values
# For the next step you will also need to export`CLOUD` and `CLUSTER`, as it is only validating a configured target cluster:
otomi validate-values: 1
```

Any changes made to the meta-schema will then also be automatically validated.

### Output

You can check whether resulting manifests are conform our specs with:

```bash
# all clusters
otomi validate-templates
# For the next step you will also need to export`CLOUD` and `CLUSTER`, as it is only validating a configured target cluster:
export CLOUD=google CLUSTER=demo
otomi validate-templates 1
```

This will check whether any CRs are matching their CRDs, but also check for k8s manifest best practices using [kubeval](https://www.kubeval.com).

And to run the policy checks run the following:

```bash
# all clusters
otomi check-policies
# For the next step you will also need to export`CLOUD` and `CLUSTER`, as it is only validating a configured target cluster:
otomi check-policies 1
```

### 2. Diffing changes

To test changes in code against running clusters you will need to export at least `ENV_DIR`, `CLOUD` and `CLUSTER` and source the aliases:

After changing code you can do a diff to see everything still works and what has changed in the output manifests:

```bash
otomi diff
# or target one release:
otomi diff -l name=prometheus-operator
```

### 3. Deploying changes

It is preferred that deployment is done from the values repo, as it is tied to the clusters listed there only, and thus has a smaller blast radius.
When you feel that you are in control and want fast iteration you can connect to a values repo directly by exporting `ENV_DIR`. It is mandatory and won't work without it. The CLI will also check that you are targeting `kubectl`'s `current-context` as a failsafe mechanism.

To deploy everything in the stack:

```bash
# target your cluster
export CLOUD=google && CLUSTER=demo
# and deploy
otomi deploy
```

NOTICE: when on GKE this may sometimes result in an access token refresh error as the full path to the `gcloud` binary is referenced from GKE's token refresh mechanism in `.kube/config`, which is mounted from the host, but inaccessible from within the container. (See bug report: https://issuetracker.google.com/issues/171493249).
Retrying the command usuall works, so do that to work around it for now.

It is also possible to target individual helmfile releases from the stack:

```bash
otomi apply -l name=prometheus-operator
```

This will first do a `diff` and then a `sync`. But if you expect the helm bookkeeping to not match the current state (because resources were manipulated without helm), then do a sync:

```bash
# or:
otomi sync -l name=prometheus-operator
```
