# Code development

# Code structure

```
otomi-core
├── adr
├── bin                       # deprecated otomi CLI
├── binzx                     # entrypoint to otomi CLI
├── chart                     # otomi chart used for initial installation only
├── charts                    # helm charts that otomi integrates
├── docs                      # documentation
├── helmfile.d                # many helmfiles executed on otomi apply command
├── helmfile.tpl              # additional helmfiles that are not executed on otomi apply command
├── k8s                       # kubernetes manifests that needs to be deployed before any other chart
├── policies                  # OPA policies for Gatekeeper
├── src                       # otomi CLI code
├── tests                     # values used for testing purpose
├── values                    # value templates that serves as input to helm charts
```

There are some essential concepts that you need to know before diving into code. The otomi-core follow DRY pattern thus, you can find many technics
In each helmfile you can find YAML anchors (e.g.: `<<: *default`). It means that before helmfile start processing any release the YAML engine will parse the anchor. Anchors are defined in `helmfile.d/snippets/templates.gotmpl` file (e.g.: `&default`).

It is important that you get familiar with code snippets, because most of them are reused in many places. Below I describe the most essential ones:

```
otomi-core/helmfile.d/snippets
├── defaults.yaml             # static defaults that can be overwritten by user values and/or derived values
├── derived.gotmpl            # values derived from default and user values
├── env.gotmpl                # define helmfile environment settings
└── templates.gotmpl          # define YAML anchors that are used to define releases in helmfile
```

# Adding new core application

## Defining realese

TBD

## Adding chart

TBD

## Adding chart artifacts

TBD

## Exposing public endpoints

TBD

## Integration with keycloak

TBD

# Local development

You can render templates of a given chart and validate it without having any cluster.
The easiest way is to start with values from `tests/fixtures` directory.

```
export ENV_DIR=$PWD/tests/fixtures
```

Also instruct otomi to use master container image tag

```
export OTOMI_TAG=master
```

**Rendering otomi values from ENV_DIR**

```
./binzx/otomi values
```

**Validating values from ENV_DIR**

```
./binzx/otomi validate-values
```

**Validating all rendered chart templates**

```
./binzx/otomi validate-templates
```

**Validating rendered chart templates**

```
./binzx/otomi validate-templates -l name=<release-name>
```

e.g.:

```
./binzx/otomi validate-templates -l name=nginx-ingress
```

**Rendering chart values**

```
./binzx/otomi x helmfile -l name=<release-name> write-values
```

e.g.:

```
./binzx/otomi x helmfile -l name=nginx-ingress write-values
```

**Rendering team chart values**

```
./binzx/otomi template -l name=team-ns-<team-name>
```

e.g.:

```
./binzx/otomi template -l name=team-ns-demo
```
