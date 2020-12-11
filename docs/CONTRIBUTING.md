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

1. Spec validation of values happens automatically in the values repo by using `otomi commit`
2. Linting of k8s output (manifests) that are generated from the `.demo/env/*` input happens in the build pipelines.
   It tests k8s output from the stack for correct CRs based on their CRDs and OPA rules defined.
   Therefor it is very important to always add test data that generates all of your templates (to keep up coverage).

### 2. End-to-end tests

Coming soon!

### 3. Runtime tests targeting a cluster

After values are pushed the cluster's drone will do a deployment run. Helmfile diff is used targeting `$CLOUD` & `$CLUSTER` before the final deployment of the artifacts.

If you have any meaningful additions to this, please let us know!

## Schema validation

### Guidelines/best practices

We intend to be very exact in our speech regarding schema validation. Currently we perform meta-schema validation on the `values-schema.yaml` file. By having accurate and consistent descriptions (using the `description` keyword), we can provide the user with a better experience in his configuration management of the `otomi-values` repository.

[Under the Apache V2.0 license agreement we are free to distribute the following content:](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#validation)

API objects are validated upon receipt by the apiserver. Validation errors are flagged and returned to the caller in a Failure status with reason set to Invalid. In order to facilitate consistent error messages, we ask that validation logic adheres to the following guidelines whenever possible (though exceptional cases will exist).

```
- Be as precise as possible.
- Telling users what they CAN do is more useful than telling them what they CANNOT do.
- When asserting a requirement in the positive, use "must". Examples: "must be greater than 0", "must match regex '[a-z]+'". Words like "should" imply that the assertion is optional, and must be avoided.
- When asserting a formatting requirement in the negative, use "must not". Example: "must not contain '..'". Words like "should not" imply that the assertion is optional, and must be avoided.
- When asserting a behavioral requirement in the negative, use "may not". Examples: "may not be specified when otherField is empty", "only name may be specified".
- When referencing a literal string value, indicate the literal in single-quotes. Example: "must not contain '..'".
- When referencing another field name, indicate the name in back-quotes. Example: "must be greater than request".
- When specifying inequalities, use words rather than symbols. Examples: "must be less than 256", "must be greater than or equal to 0". Do not use words like "larger than", "bigger than", "more than", "higher than", etc.
- When specifying numeric ranges, use inclusive ranges when possible.
```

Excellent:

```

oauth2-proxy:
type: object
additionalProperties: false
properties:
config:
type: object
properties:
cookieSecret:
type: string
description: Cookie secret must be 128 bit base64 encoded string.
pattern: ^(?:[A-Za-z0-9+/]{4})\\\*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\$

```

Seeing a small improvement:

```

armAuth:
type: object
additionalProperties: false
description: A service Principal secret ey An explanation about the purpose of this instance.
properties:
secretJSON:
description: A service Principal secret JSON key (base64 encoded)
type: string

```

This could be modified to:

```

armAuth:
type: object
additionalProperties: false
description: A service Principal secret ey An explanation about the purpose of this instance.
properties:
secretJSON:
description: **Must be** a service Principal secret JSON key (base64 encoded)
type: string

```

etc.
