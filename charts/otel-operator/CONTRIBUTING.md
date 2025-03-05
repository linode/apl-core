# Operator Chart Contributing Guide

## Bumping Default Operator Version

1. Increase the minor version of the chart by one and set the patch version to zero.
1. Update the chart's `appVersion` to match the new operator version.
1. In the values.yaml, update `manager.collectorImage.tag` to match the version of the collector managed by default by the operator.
1. Run `make generate-examples CHARTS=opentelemetry-operator`.
1. Run `make update-operator-crds` to update the CRDs in this chart to match the operator's.
1. Review the [Operator release notes](https://github.com/open-telemetry/opentelemetry-operator/releases).  If any changes affect the helm chart, adjust the helm chart accordingly.
