Alin:

Integrated Konstraint library to support Common Rego Language definitions.

https://github.com/plexsystems/konstraint/

### Considerations

We have run into the following problems when using the default Gatekeeper OPA policies:
It is hard to integrate with other tools such as conftest and wee need two versions of the policies: local vs online

We have investigated different library references including Raspernetes policy library, RedHat's policy library, Kubesec.io references, Gatekeeper policy library and Konstraint library

We have found that the best choice for writing OPA policies is to use Konstraint library, which has compatible `.rego` definitions for both Conftest and Gatekeeper

### Motivation:

The problem we are trying to solve is to have a common means of designing/testing/deploying OPA policies using common `.rego` packages.

Using `Konstraint` library introduces common abstractions for evaluating policies - allowing everyone to write the same `.rego` syntax for both Conftest and Gatekeeper contexts.

Users can write policies directly in the `policies` folder and evaluate the components statically, without the need to deploy any resources.
Common Language Definitions include: `core.resource` `core.parameters` objects.

### Components

Konstraint is used to generate yaml manifests (ConstraintTemplates, Constraint) from source `.rego` files, that get deployed in the `gatekeer-artifacts` chart.

Conftest makes use of these same `.rego` files to check all defined policies against the generated resources.
