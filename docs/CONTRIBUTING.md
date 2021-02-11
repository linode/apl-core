# Contribution Guidelines

Good to know that you're reading this, as all open source software benefits from contributions by those wanting to collaborate. It might be helpful to outline what is expected here, but also what is already done for you, so you don't have to keep reinventing those wheels ;)

## Development

By now we expect you to have fully read our [README](../README.md) and maybe looked a bit at the code. You will notice that we use some tooling to enforce consistent commits and releases:

- [Commitizen](https://github.com/commitizen): We use their `cz-cli` and `cz-conventional-changelog`.
- [Standard Version](https://github.com/conventional-changelog/standard-version): Generates CHANGELOG, bumps & releases image (also as git tag).
- [Prettier](https://prettier.io): Almost all code is autoformatted when using vscode (except all the go templates, as these are unstructured by intent).

The bulk of the code in this repo consists of go templates. These are highlighted by the helm plugin, but not auto formatted (as they might contain any kind of code). In order to help you write consistent go templates we have written a [special section about go templating](./GO_TEMPLATING.md).

## Tests

Please make sure to add all the artifacts from the Definition of Done, which includes possible tests and test data.

### 1. Static/unit tests

1. Spec validation of values happens automatically in the values repo by using `otomi commit`, or by running `otomi validate-values` directly.
2. Linting of k8s output (manifests) that are generated from the `.demo/env/*` input happens in the build pipelines (via `otomi validate-templates`).
   It tests k8s output from the stack for correct CRs based on their CRDs and OPA rules defined.
   Therefore it is very important to always add test data that generates all of your templates (to keep up coverage).
3. OPA policy checks are also done in the pipeline via `otomi check-policies`.
4. Scripting is done in `bash`, and these shell scripts are available in `bin/*`. We use the `bats` testing framework as explained in [documentation about bats](./BATS.md).

### 2. End-to-end tests

Coming soon!

### 3. Runtime tests targeting a cluster

After values are pushed the cluster's drone will do a deployment run. A number of tests are run in `bin/test.sh` (final templates are validated, dry runs are attempted) before the final deployment of the artifacts.

If you have any meaningful additions to this, please let us know!
