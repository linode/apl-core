Alin:

Integrated Konstraint library to support Common Rego Language definitions.

https://github.com/plexsystems/konstraint/

### Components

Konstraint is used to generate yaml manifests (ConstraintTemplates, Constraint) from source `.rego` files, that get deployed in the `gatekeer-artifacts` chart.

`$ otomi validate-policies` uses Conftest under the hood to check all defined policies against the generated resources

### Motivation:

The problem we are trying to solve is to have a common means of designing/testing/deploying OPA policies using common `.rego` packages.

Using `Konstraint` library introduces common abstractions for evaluating policies - allowing everyone to write the same `.rego` syntax for both Conftest and Gatekeeper contexts.

Users can write policies directly in the `policies` folder and evaluate the components statically, without the need to deploy any resources.
Common Language Definitions include: `core.resource` `core.parameters` objects.
