[![pipeline status](https://gitlab.com/charts/gitlab/badges/master/pipeline.svg)](https://gitlab.com/charts/gitlab/pipelines)

# Cloud Native GitLab Helm Chart

The `gitlab` chart is the best way to operate GitLab on Kubernetes. It contains
all the required components to get started, and can scale to large deployments.

Some of the key benefits of this chart and [corresponding containers](https://gitlab.com/gitlab-org/build/CNG) are:

- Improved scalability and reliability.
- No requirement for root privileges.
- Utilization of object storage instead of NFS for storage.

## Detailed documentation

See the [repository documentation](doc/index.md) for how to install GitLab and
other information on charts, tools, and advanced configuration.

## Architecture and goals

See [architecture documentation](doc/architecture/index.md) for an overview
of this project goals and architecture.

## Known issues and limitations

See [limitations](doc/index.md#limitations).

## Release Notes

Check the [releases documentation](doc/releases/index.md) for information on important releases,
and see the [changelog](CHANGELOG.md) for the full details on any release.

## Contributing

See the [contribution guidelines](CONTRIBUTING.md) and then check out the
[development styleguide](doc/development/index.md).
