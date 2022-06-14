# Navigating through the code

Effective development starts with understanding of the code structure and relationship between defferent components of the system.

## Code structure

```
otomi-core
├── .values                     # Boilerplate for initializing git repository
├── adr                         # Architectural Decision Records [read more](https://adr.github.io/madr/)
├── bin                         # Otomi CLI entrypoint (deprecated)
├── binzx                       # Otomi CLI entrypoint
├── chart                       # Helm chart for installing Otomi
├── charts                      # All other Helm charts that comprise Otomi
├── docs                        # Documentation
├── helmfile.d/helmfile-*.yaml  # Helmfile files ordered by name and executed accordigly by otomi apply command
├── helmfile.d/snippets         # Reusable code snippets
├── helmfile.tpl                # Additional Helmfiles that do not have corresponding chartare not executed on otomi apply command
├── k8s                         # Kubernetes manifests that before any other chart
├── policies                    # OPA policies for Gatekeeper
├── src                         # Otomi CLI source code
├── tests                       # Values used for testing purpose
├── upgrades.yaml               # Upgrade presync hooks
├── values                      # Value templates that serves as input to coresponing Helm charts
├── values-changes.yaml         # Definiitons for performing data migrations
├── values-schema.yaml          # JSON schema that defines Otomi interface
└── versions.yaml               # Version tags of otomi-api, otomi-console and otomi-tasks
```

It is important that you get familiar with code snippets, because most of them are reused in many places. Below I describe the most essential ones:

```
otomi-core/helmfile.d/snippets
├── defaults.yaml             # static defaults that can be overwritten by user values and/or derived values
├── derived.gotmpl            # values derived from default and user values
├── env.gotmpl                # define helmfile environment settings
└── templates.gotmpl          # define YAML anchors that are used to define releases in helmfile
```

Code snippets are referenced with []node anchors (e.g.: `<<: *default`). It means that before Helmfile starts processing any release the YAML engine will parse the anchor. Anchors are defined in `helmfile.d/snippets/templates.gotmpl` file (e.g.: `&default`).

# Helmfile

Helmfile is a declarative spec for deploying helm charts. You are encouraged to read more about Helmifle at https://github.com/helmfile/helmfile

In Otomi all helmfile specs are defined in `helmfile.d/` directory and executed in alpahbetical order.
Majority of helmfile have the following structure

```go-template
# helmfile.d/999-helmifle.yaml
bases:
  - snippets/defaults.yaml
---
bases:
  - snippets/env.gotmpl
---
bases:
  - snippets/derived.gotmpl
---
{{ readFile "snippets/templates.gotmpl" }}
{{- $v := .Values }}
{{- $a := $v.apps }}

releases:
  - name: my-app
    installed: {{ $a | get "my-app.enabled" }}
    namespace: my-namespace
    <<: *default
```

From above there are three `bases`, which are merged in the following order `snippets/defaults.yaml`, `snippets/env.gotmpl` and `snippets/derived.gotmpl`.

> Helmfile merges all the "base" state files before processing.

Next, there is one release defined: `my-app`. The release is installed `apps.my-app.enabled` flag is set. The release is deployed to `my-namespace` with the values defined under `*default` snippet, which points to [alias](https://yaml.org/spec/1.2.2/#71-alias-nodes) defined in `snippets/templates.gotmpl`.

## Data flow

Once you got familiar with the otomi-core project structure, you can learn how particular files incorporate to the data flow while executin otomi CLI commands.

```mermaid
flowchart LR


    subgraph Helm chart
        values.yaml --> V2[.Values]
        V2 --> chart
    end
    subgraph Helmfile release
        direction TB
        .Values.apps.my-app._rawValues --> V2
        values/my-app/my-app.gotmpl --> V2
    end

    subgraph Helmfile bases
        snippets/derived.gotmpl --> .Values
        snippets/env.gotmpl --> .Values
        snippets/default.yaml --> .Values
        .Values --> values/my-app/my-app.gotmpl
    end

    subgraph Values repo
        R[(env/*)] --> snippets/env.gotmpl
    end
    chart --> test[Kubernetes manifests]
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
