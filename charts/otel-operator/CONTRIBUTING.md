# Operator Chart Contributing Guide

## Bumping Default Operator Version

1. Increase the minor version of the chart by one and set the patch version to zero.
2. Update the chart's `appVersion` to match the new operator version.
3. In the values.yaml, update `manager.collectorImage.tag` to match the version of the collector managed by default by the operator.
4. Run `make generate-examples CHARTS=opentelemetry-operator`.
5. Run `make update-operator-crds` to update the CRDs in this chart to match the operator's.
6. Review the [Operator release notes](https://github.com/open-telemetry/opentelemetry-operator/releases).  If any changes affect the helm chart, adjust the helm chart accordingly.

### sed on Mac OS X

If you're performing the above steps on Mac OS X, you may need to install `gnu-sed` via Homebrew
as the pre-installed `sed` version has some incompatible differences:

```sh
brew install gnu-sed
```

Then, you can use it for make instead of the system's `sed`:

```sh
PATH="$(brew --prefix)/opt/gnu-sed/libexec/gnubin:$PATH" make ...
```
