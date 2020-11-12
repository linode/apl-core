Alin:

### Integrated Konstraint library to support Common Rego Language definitions.

https://github.com/plexsystems/konstraint/

The purpose of this is to introduce all possible abstractions for evaluating policies - allowing everyone to write the same .rego syntax for both Conftest and Gatekeeper contexts.

Konstraint is used to generate yaml manifests (ConstraintTemplates, Constraint) from source `.rego` files, that get deployed from the `gatekeer-operator-artifacts` chart.

### Usage:

Users can write policies directly in the `policies` folder and evaluate the stack components statically, without the need to deploy any resources.
Common Language Definitions include: `core.resource` `core.parameters` objects.

### To run static analysis chcking:

`$ otomi validate-policies` (uses Conftest under the hood to check all .rego policies against the generated stack)

NOTE:

Contributed to Konstraint library for a Common Language Definition for the .rego files designated for static and online analysis.
