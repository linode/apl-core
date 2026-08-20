# Migration path from Keycloak to Dex for existing clusters

- Status: accepted
- Deciders: APL team

## Context and Problem Statement

[ADR-2026-08-06](2026-08-06-dex-as-issuer.md) makes Dex the OIDC issuer. Existing clusters run Keycloak as both issuer and user store, and most of them hold their users locally rather than federating to a customer identity provider. Those users and their passwords cannot simply be moved.

Two findings constrain every option, and both come from the code rather than assumption.

**Dex always mints its own subject.** In `server/tokens/claims.go` the `sub` claim appears in `ReservedClaimNames` — *"derived from connector identity, must not be spoofed"* — and is forbidden even to token policies. Any cluster whose issuer becomes Dex issues new subjects to all of its users.

**Passwords cannot be carried across.** Team users are created in Keycloak with `temporary: true` (`apl-tasks/src/tasks/keycloak/config.ts`), so Keycloak forces a change on first login and the `initialPassword` in the values repository is stale for anyone who has logged in. Keycloak's PBKDF2 hashes cannot be converted to the bcrypt hashes Dex expects.

## Decision Drivers

- The footprint reduction should reach existing clusters, not only new ones.
- APL has no channel for delivering credentials to users, so a fleet-wide password reset is expensive operationally.
- Applications that persist a local account keyed on subject and issuer are orphaned when the issuer changes. **Harbor** stores `subiss` and refuses re-onboard on mismatch; **Gitea** links users to a login source and external ID. Consumers keyed on `groups` or `email` — Argo CD, Grafana, apl-api, oauth2-proxy, Istio — are unaffected.
- Subject discontinuity should happen at most once per cluster. Because Dex derives the subject from the connector ID, a cluster that changes connector later breaks subjects a second time.
- On a federated cluster (`hasExternalIDP: true`) no passwords exist in Keycloak at all, so that segment migrates far more cheaply.

## Considered Options

- Migrate every existing cluster automatically, requiring a fleet-wide password reset
- Keep Keycloak as an in-cluster identity provider behind Dex on every cluster
- Leave existing clusters on Keycloak, and document a manual migration for those who want it

## Decision Outcome

Chosen option: **leave existing clusters on Keycloak, and document a manual migration.**

Existing clusters keep Keycloak as their issuer and are not migrated by an upgrade. New installations use Dex. A written guide describes how an operator can move a cluster to Dex deliberately, with the consequences stated plainly.

The reasoning is that these clusters are already running Keycloak and their operators are evidently content with it. Nothing about an APL upgrade should force an authentication change on them, and no migration we could build avoids the two costs below. Making it a choice puts that trade in the hands of the person who has to live with it.

`apps.dex.enabled` selects the issuer. The values migration must write `apps.keycloak.enabled: true` into existing clusters before the default flips, so an upgrade never removes a running Keycloak.

The manual guide has to cover, at minimum:

- that every user's subject changes, because Dex cannot pass an upstream subject through
- that Harbor and Gitea accounts are orphaned as a result, and how to clean them up
- how to move users, either as Dex static passwords with new credentials, or by adopting an external identity provider
- that the platform admin password hash must be regenerated for Dex

### Positive Consequences

- No upgrade changes authentication on a running cluster. The riskiest part of this work never runs unattended.
- No fleet-wide password reset, and no migration tooling to build, test and support.
- New installations get the full footprint reduction immediately.
- Clusters that federate to an external identity provider have the cheapest path, since Keycloak is already only brokering there.

### Negative Consequences

- **The footprint reduction does not reach the existing fleet** unless an operator chooses to migrate. This work reduces the cost of a new installation, not of the fleet, and should not be presented otherwise.
- **Two issuer implementations stay supported indefinitely**, both covered by CI, until a later decision retires Keycloak.
- **The migration cost is moved, not removed.** Whoever follows the guide still faces the subject change and the orphaned Harbor and Gitea accounts, without tooling to help.
- A written guide can drift from the code. It needs an owner and a test pass each release.

## Pros and Cons of the Options

### Migrate every existing cluster automatically

- Good, because it delivers the footprint reduction across the fleet.
- Good, because only one configuration shape would remain supported.
- Bad, because every user must be issued a new password and APL has no channel to deliver one.
- Bad, because an upgrade would change authentication unattended, which is the highest-risk way to run this change.
- Bad, because fleet user counts are unknown, so the operational cost cannot be estimated in advance.

### Keep Keycloak as an in-cluster identity provider behind Dex on every cluster

- Good, because passwords and user records are untouched and no user action is required.
- Good, because it needs no credential distribution.
- Bad, because Keycloak and its database keep running, so nothing is saved on that cluster.
- Bad, because subjects still change, so Harbor and Gitea accounts still orphan — it buys password preservation and nothing else.
- Bad, because moving users into Dex afterwards breaks subjects a second time, since the connector ID changes.

### Leave existing clusters on Keycloak, with a manual guide

- Good, because no upgrade changes authentication on a running cluster.
- Good, because the trade is made by the person who has to live with the consequences.
- Good, because it needs no migration tooling.
- Bad, because the reduction never reaches the existing fleet unless someone opts in.
- Bad, because two issuer implementations must be maintained with no end date.
- Bad, because the cost is moved to the operator rather than removed.

## Links

- Refines [ADR-2026-08-06](2026-08-06-dex-as-issuer.md)
- Related to [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md)
