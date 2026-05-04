# APL Core - AI Coding Agent Instructions

## Project Overview

APL Core (App Platform for Linode) is a Kubernetes platform that integrates 30+ cloud-native applications (Istio, Argo CD, Keycloak, Tekton, Harbor, etc.) into a cohesive, multi-tenant PaaS. The codebase is a hybrid of TypeScript (CLI/operators), Helm charts, Helmfile manifests, and Go templates.

## Knowledge Base

Use AGENTS.md files as your primary reference for understanding the codebase structure, conventions, and critical patterns. Each AGENTS.md file provides a comprehensive overview of its respective directory.

| Path                                                             | Focus                                               |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                         | High level design                                   |
| [`src/AGENTS.md`](src/AGENTS.md)                                 | TypeScript source structure, conventions, dev setup |
| [`src/cmd/AGENTS.md`](src/cmd/AGENTS.md)                         | CLI command inventory, patterns                     |
| [`src/common/AGENTS.md`](src/common/AGENTS.md)                   | Shared utility modules, dependency graph            |
| [`src/operator/AGENTS.md`](src/operator/AGENTS.md)               | GitOps operator architecture, execution flow        |
| [`helmfile.d/AGENTS.md`](helmfile.d/AGENTS.md)                   | Helmfile release phases, execution order            |
| [`helmfile.d/snippets/AGENTS.md`](helmfile.d/snippets/AGENTS.md) | Critical templates, defaults, derived values        |
| [`charts/AGENTS.md`](charts/AGENTS.md)                           | Custom vs vendored chart inventory                  |
| [`charts/team-ns/AGENTS.md`](charts/team-ns/AGENTS.md)           | Team namespace chart (most complex)                 |
