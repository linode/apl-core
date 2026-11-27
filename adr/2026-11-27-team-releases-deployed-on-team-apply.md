# Team releases are labelled and deployed on every team apply

- Status: accepted

## Context and Problem Statement

When every change in a new values repo revision is inside `env/teams/`, the apl-operator runs a team apply instead of a full apply. A team apply runs `applyTeams` (the `team=true` releases of `helmfile.tpl/helmfile-init.yaml.gotmpl`) and then `applyAsApps` for the `helmfile.d/` releases labelled `pipeline=otomi-task-teams`. Until now only the per-team releases in `helmfile-60.teams.yaml.gotmpl` carried that label.

Many platform releases outside `helmfile-60` render `teamConfig`. Some depend on the list of team IDs, and some on fields inside a team (`settings.oidc.groupMapping`, `settings.selfService.apps`, `settings.managedMonitoring.*`, `services`). A team apply skipped them, so creating, removing or editing a team left them stale until the next full apply. For example, a new team got no gateway AuthorizationPolicy.

## Decision

Every release whose values depend on `teamConfig`, on the team list or on any team's contents is a **team release**. Each one carries `pipeline: otomi-task-teams`, so a team apply deploys it every time. The label selector of the team apply does not change.

- **Some releases obatin extra label: `pipeline: otomi-task-teams`.
- **The releases labelled by this decision** are `dex-artifacts`, `kubernetes-gateways-artifacts`, `apl-gitea-operator-artifacts`, `apl-keycloak-operator-artifacts`, `apl-harbor-operator-artifacts`, `loki-artifacts`, `rabbitmq`, `tekton-dashboard`, `apl-network-policies`, `prometheus-operator`, `loki`, `trivy-operator`, `oauth2-proxy` and `otel-operator-artifacts`.

## Considered Options

- **A full apply whenever the team set changes** (a team directory under `env/teams/` is created, deleted or renamed). Not chosen. Platform releases also read fields inside existing teams, so editing a team's settings would still leave them stale.
- **That rule plus a denylist** (a full apply when a team's `settings.yaml` or `services/` changes). Not chosen. It still depends on knowing which team files the platform templates read, and it turns common edits into full applies.
- **An allowlist** of team subdirectories that only per-team releases read. Not chosen. It needs every team subdirectory audited, and new kinds of team resources would fall back to a full apply.
- **A separate label, such as `teamDependent: true`,** with the team apply selecting `pipeline=otomi-task-teams` or `teamDependent=true`. Not chosen. Reusing `pipeline` leaves the selector unchanged and makes one label the single marker of a team release. The comment carries the meaning that a separate label name would have.

## Consequences

- A team apply now templates and syncs the platform team releases as well. ArgoCD changes nothing, and nothing rolls out, unless their values changed.
- Deploying a release is not the same as restarting the app that reads it. An app that reads team-derived data at startup from a Secret written by ESO still needs a config restart. `dex` already has one through Reloader. Loki's `loki-multi-tenant-proxy` reads `reverse-proxy-auth-config` at startup and is handled separately. Its `checksum/team-config` annotation hashes only the team IDs and races with ESO's refresh.
