# Demo topology — two teams, nine role-distinguishable accounts

Fork-only, not intended for upstream. Read `CLAUDE.md` first for how this file fits with the
others, and `TEAM-WORKLOAD-CATALOG.md` for the workload/catalog mechanism this topology's
`agentic-sdlc` demo pipeline already sits on.

**What this is:** a repeatable example org chart for demos — two teams (`green`, `blue`), each with
a Product Owner, a Team Admin, a Developer, and an "agent" identity, plus one platform-wide agentic
admin account, all named so role and agent-vs-human status are legible at a glance. Each team owns
one project that's both a Gitea repo and a Vikunja project.

## The accounts

Domain `@demo.apl` — deliberately not this cluster's `nip.io` domain, so the account set reads
identically across rebuilds. `agent-` prefix is unclaimed by the platform's existing `apl-`/`bot-`
service-account conventions. Passwords: `passwords.txt` at the repo root (gitignored, same posture
`SETUP.md` already uses for the platform-admin credential).

| email (login) | firstName | lastName | isPlatformAdmin | isTeamAdmin | teams |
|---|---|---|---|---|---|
| po-green@demo.apl | Green | PO | false | false | `[green]` |
| admin-green@demo.apl | Green | TeamAdmin | false | **true** | `[green]` |
| dev-green@demo.apl | Green | Developer | false | false | `[green]` |
| agent-green@demo.apl | Green | Agent | false | false | `[green]` |
| po-blue@demo.apl | Blue | PO | false | false | `[blue]` |
| admin-blue@demo.apl | Blue | TeamAdmin | false | **true** | `[blue]` |
| dev-blue@demo.apl | Blue | Developer | false | false | `[blue]` |
| agent-blue@demo.apl | Blue | Agent | false | false | `[blue]` |
| agent-platform@demo.apl | Platform | Agent | **true** | false | `[]` |

`agent-platform` is a *second*, separate account from the pre-existing human
`platform-admin@<domainSuffix>` bootstrap user — both carry `isPlatformAdmin: true`, on purpose,
distinguished only by name and origin (one is a real operator, one is the demo's agent).

There is no native "Product Owner" vs "Developer" concept at the platform level — the entire role
vocabulary is `isPlatformAdmin` / `isTeamAdmin` (global, not per-team) / plain membership
(`values-schema.yaml:1398-1428`). PO vs Developer is expressed by naming, and by different Vikunja
project permissions once real logins happen (see "The Vikunja project" below).

**`lastName` must never contain anything outside letters/spaces/hyphens/apostrophes.** Keycloak
rejects other characters with `error-person-name-invalid-character`, and because
`apl-keycloak-operator` creates all pending users in one batch, a single bad value blocks every
not-yet-created user, not just the offending one — found live: `"Agent (bot)"` as a first attempt
at the agent accounts' lastName silently blocked `po-green` too, which has nothing to do with
parentheses.

## The two projects

| | Gitea | Vikunja |
|---|---|---|
| container | org `team-green` / `team-blue` | — |
| artifact | repo `team-<id>/team-<id>-project` | project titled `team-<id>` |

Repo name is `team-<id>-project`, not bare `green`/`blue` — `team-labteam/green` already exists as
the unrelated sample-app repo. Vikunja project titled `team-<id>` establishes a naming convention
this app never had before (its pre-existing projects are ad hoc names like `webhooktestprojekt`).

## How the accounts and teams got here

`env/teams/<id>/` (namespace, ArgoCD project/repo, Gitea org, Keycloak group) and the nine Keycloak
users are **fully declarative** — see the `users:` / `teamConfig:` block added to `SETUP.md`'s
step 7 heredoc. A fresh `SETUP.md` run reproduces both teams and all nine users with correct group
memberships automatically, no live scripting.

**The Gitea repos and Vikunja projects have no declarative path** — confirmed live:
`teamConfig.<id>` alone does not create a Gitea org (both 404'd immediately after team creation,
despite an unrelated pre-existing org for another team suggesting otherwise at first glance). Run
once, after `SETUP.md` completes and the two teams' namespaces are `Active`:

```bash
D=<domainSuffix>
GT_U=$(kubectl get secret gitea-admin-secret -n gitea -o jsonpath='{.data.username}' | base64 -d)
GT_P=$(kubectl get secret gitea-admin-secret -n gitea -o jsonpath='{.data.password}' | base64 -d)
VK_U=$(kubectl get secret vikunja-admin-credentials -n vikunja -o jsonpath='{.data.username}' | base64 -d)
VK_P=$(kubectl get secret vikunja-admin-credentials -n vikunja -o jsonpath='{.data.password}' | base64 -d)
VT=$(curl -sk -X POST "https://vikunja.$D/api/v1/login" -H 'Content-Type: application/json' \
      -d "{\"username\":\"$VK_U\",\"password\":\"$VK_P\"}" | jq -r .token)

for T in green blue; do
  curl -sk -u "$GT_U:$GT_P" -X POST "https://gitea.$D/api/v1/orgs" \
    -H 'Content-Type: application/json' -d "{\"username\":\"team-$T\",\"full_name\":\"Team $T\",\"visibility\":\"private\"}"
  curl -sk -u "$GT_U:$GT_P" -X POST "https://gitea.$D/api/v1/orgs/team-$T/repos" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"team-$T-project\",\"private\":true,\"auto_init\":true,\"default_branch\":\"main\"}"
  curl -sk -X PUT "https://vikunja.$D/api/v1/projects" -H "Authorization: Bearer $VT" \
    -H 'Content-Type: application/json' -d "{\"title\":\"team-$T\",\"description\":\"Demo project for team $T\"}"
done
```

## Membership — mostly automatic, one gap closed tonight

**Gitea** is claim-driven and needs no explicit action: the moment any team member completes a
real SSO login, Gitea reads their Keycloak `team-<id>` group claim and adds them to the org itself.
Verified live: `agent-green@demo.apl` logged in via a scripted `agent-browser` SSO flow, registered
as Gitea user `agent-green-demo-apl` (usernames are derived from the OIDC `nickname` claim, not the
email local part — don't assume they match), and appeared in `team-green`'s member list with zero
further action. A Gitea PAT for such an account can then be minted fully non-interactively:
`kubectl exec -n gitea deploy/gitea -c gitea -- gitea admin user generate-access-token -u
<username> -t <name> --scopes ...`.

**Vikunja** used to need one explicit API push per member (`MCP.md`'s two-call sequence — `PUT`
then `POST`, field name changes from `right` to `permission` between the two calls, the first call's
`right` is silently ignored). **That gap is closed as of tonight**: `apl-vikunja-operator`
(`vikunja.teamSync.enabled`, already on for this cluster) now also creates a Vikunja project per
team and shares it with the matching Vikunja team automatically — see
`vikunja-patches/README.md`'s "apl-tasks" section for the extension and the real bug it hit
(`GET /projects/{id}/teams` returns the team's own `id` field, not `team_id` — that name only
exists in the `PUT` request body). Verified live: `team-green` (Vikunja project 9) and `team-blue`
(project 10) both show `permission: 1` (Read & Write) shared with their matching Vikunja team,
confirmed clean across multiple reconcile cycles with no errors.

Sharing is at the **team** level, not per-member — every team member gets the same project
permission (Read & Write). The PO-vs-TeamAdmin-vs-Developer distinction from the account table
above is therefore expressed only through naming at the Vikunja-project layer, not through a
different permission per role — a deliberate simplification, not a limitation (see
`vikunja-patches/README.md` for the two-Vikunja-teams-per-platform-team alternative if that
distinction ever needs to become real).

Nobody but `agent-green` has actually logged into either app yet, so for every other account this
is all still pending its first real login — that login itself is intentionally not scripted for
the other eight (see `MEMORY.md`/session notes: browser automation was deliberately scoped to one
proof-of-mechanism account, not applied wholesale).

## Surviving a rebuild

**Teams and users**: fully covered by the `SETUP.md` diff — survives `kind delete cluster` +
reinstall with zero manual steps.

**Gitea repos and Vikunja projects**: do not survive a rebuild. Re-run the script above once,
after the fresh install completes. Nothing else needs it — the workload catalog
(`env/catalogs/team-pipelines.yaml`, `TEAM-WORKLOAD-CATALOG.md`) is cluster-scoped, not
team-scoped, so it's already visible to `green`/`blue` the moment they exist, no extra step.

**The extended Vikunja team-sync operator**: the code is durable
(`vikunja-patches/apl-tasks.patch`, committed), but the *built image* (currently
`docker.io/linode/apl-tasks:v0.0.1-vikunja-projects`) is only loaded into this `kind` node's local
Docker — a rebuild needs the same build-and-`kind load` sequence `vikunja-patches/README.md`
documents, same as `v0.0.0-vikunja` always did.
