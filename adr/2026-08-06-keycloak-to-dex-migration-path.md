# Migration path from Keycloak to Dex for existing clusters

- Status: proposed
- Deciders: APL team

## Context and Problem Statement

[ADR-2026-08-06](2026-08-06-dex-as-issuer.md) makes Dex the OIDC issuer for newly installed clusters and leaves existing clusters on Keycloak. A migration path will be provided; this record captures the analysis and the candidate options so the choice can be made deliberately rather than re-derived later.

Two findings constrain every option, and both were established from the code rather than assumed.

**Dex always mints its own subject.** In `server/tokens/claims.go` the `sub` claim appears in `ReservedClaimNames` — *"derived from connector identity, must not be spoofed"* — and is forbidden even to CEL token policies. There is no passthrough of an upstream subject. Any cluster whose issuer becomes Dex therefore issues new subjects to all of its users, regardless of where those users are stored.

**Passwords cannot be carried across.** Team users are created in Keycloak with `temporary: true` (`apl-tasks/src/tasks/keycloak/config.ts`), so Keycloak forces a password change on first login and the `initialPassword` held in the values repository is stale for every user who has ever logged in. `apl-tasks/src/operators/keycloak/keycloak.ts` confirms it is never re-synced, since `initialPassword` is in `omitUpdateFields`. Keycloak's PBKDF2/Argon2 hashes cannot be converted to the bcrypt hashes Dex expects.

## Decision Drivers

- The footprint reduction delivered by Dex should eventually reach existing clusters, not only new ones. Roughly nine in ten existing clusters run with `otomi.hasExternalIDP: false`, so a path that only serves federated clusters serves almost nobody.
- The two populations migrate very differently. On a federated cluster (`hasExternalIDP: true`) no passwords exist in Keycloak at all — Keycloak is already doing nothing but brokering, and the Dex `oidc` connector takes over that role directly, leaving subject remapping as the only impact. The password problem below applies solely to clusters holding users created in APL.
- Applications that persist a local account keyed on subject and issuer are orphaned when the issuer changes. **Harbor** stores `subiss` and refuses re-onboard on mismatch; **Gitea** links users to a login source plus external ID. Consumers keyed on the `groups` or `email` claims — Argo CD, Grafana, apl-api — are unaffected, as are oauth2-proxy and Istio `RequestAuthentication`, which hold no persistent user state.
- Subject discontinuity should happen at most once per cluster. Because Dex derives the subject from the connector ID, a cluster that first attaches Keycloak as an upstream source and later moves users into Dex breaks subjects a second time.
- APL has no channel for delivering credentials to users. Today a platform admin reads an initial password from the console and passes it on out of band.
- Whatever is chosen must not require a decision about disaster-recovery behaviour for credentials, which is being left open separately.

## Considered Options

- Migrate users into Dex, requiring a password reset
- Attach Keycloak to Dex as an upstream identity source
- Leave existing clusters on Keycloak indefinitely

## Decision Outcome

**Open.** No option is chosen yet. The team is leaning towards either migrating users into Dex with a password reset, or attaching Keycloak to Dex as an upstream identity source, and will decide after prototyping Dex on new clusters.

One constraint applies whichever is chosen: because a Dex password entry carries an explicit `userID` and the subject is `base64url(proto{user_id, connector_id})`, every user's post-migration subject is computable offline from the values repository alone, before any cluster is touched. This is what makes a Harbor and Gitea subject-remapping job feasible, and it should be preserved by any option that is chosen.

## Pros and Cons of the Options

### Migrate users into Dex, requiring a password reset

APL users already live in the values repository as SealedSecrets; they are rendered into Dex password entries with `userID` set to the existing user UUID. Keycloak and its database are removed. Every user receives a newly issued password.

- Good, because it delivers the full footprint reduction to the existing cluster — Keycloak, `apl-keycloak-operator` and the CloudNativePG cluster all go away.
- Good, because subject discontinuity happens exactly once, and the resulting subject is repository-derived and stable thereafter.
- Good, because it leaves the cluster in the same shape as a newly installed one, so only one configuration is supported long-term.
- Bad, because every user must be issued a new password, and APL has no delivery channel for that — it becomes platform-admin toil that scales with user count.
- Bad, because user counts across the fleet are currently unknown, so the size of that toil cannot yet be estimated.

### Attach Keycloak to Dex as an upstream identity source

Dex becomes the issuer; the existing in-cluster Keycloak is demoted to an upstream OIDC connector holding the user accounts. Users keep their passwords and log in through Keycloak as before, one hop further back.

- Good, because passwords are preserved and no user action is required.
- Good, because user records, groups and team membership are untouched.
- Good, because it is the only option that requires no credential distribution.
- Bad, because it saves nothing — Keycloak, its operator and its two-instance database keep running, so the resource goal is not met on that cluster.
- Bad, because subjects still change, so Harbor and Gitea accounts orphan anyway. It buys password preservation and nothing else.
- Bad, because if such a cluster is later moved onto Dex-held users, subjects break a **second** time, since the connector ID changes.
- Bad, because it introduces a third supported configuration alongside Keycloak-only and Dex-only.

### Leave existing clusters on Keycloak indefinitely

- Good, because it is genuinely zero impact — no subject change, no password reset, no orphaned accounts.
- Good, because it requires no engineering work at all.
- Bad, because the resource reduction never reaches the existing fleet, which is where most clusters are.
- Bad, because two issuer implementations must be maintained and tested with no end date.

## Links

- Refines [ADR-2026-08-06](2026-08-06-dex-as-issuer.md)
- Related to [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md) — APL users are stored as SealedSecrets in the values repository
