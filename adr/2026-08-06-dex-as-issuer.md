# Dex replaces Keycloak as the OIDC issuer

- Status: accepted
- Deciders: APL team

## Context and Problem Statement

Keycloak fills two roles in APL: it is the OIDC issuer every platform application trusts, and it is the store holding user credentials. Serving both costs roughly 650m CPU and 1.25Gi memory in requests plus 20Gi of block storage, spread over five pods — the Keycloak deployment, `apl-keycloak-operator`, and a two-instance CloudNativePG cluster with WAL volumes. A typical APL realm holds a handful of users, so the platform runs a Java application and a replicated SQL database to authenticate a population that would fit in a ConfigMap.

Dex is an identity broker that needs no database. Can it take over the issuer role, and what is lost if it does?

## Decision Drivers

- Reducing the footprint of an APL installation is an explicit product goal, and Keycloak with its database is the largest component that exists purely for authentication.
- Most of `apl-tasks/src/tasks/keycloak/realm-factory.ts` — realm bootstrap, client registration, client scopes, protocol mappers, group-to-role mapping — is Keycloak-specific ceremony with no equivalent in a broker.
- Group membership drives all platform authorization, so whatever holds users must be able to express it.
- Clusters that bring their own identity provider (`otomi.hasExternalIDP: true`) must keep working as they do today.
- Existing Keycloak clusters must keep working after this lands.

## Considered Options

- Keep Keycloak as the issuer (status quo)
- Dex, with users held in Dex storage
- Dex, with users held in the Dex configuration file
- Dex as a pure broker, requiring every cluster to bring an external identity provider

## Decision Outcome

Chosen option: **Dex, with users held in the Dex configuration file.**

The issuer is selected per cluster by `apps.dex.enabled`. New installations default to Dex; existing clusters keep Keycloak until migrated. Migration is decided separately in [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md).

Dex uses `storage.type: kubernetes` for the state it owns — auth codes, refresh tokens, sessions and signing keys. Users and clients are **not** kept there.

### Why users live in configuration

Dex offers three ways to hold users, and only one can express what APL needs:

| Interface | Users with groups | Supported |
|---|---|---|
| configuration file | yes | yes |
| gRPC API | **no** — the `Password` message has no groups field | yes |
| custom resources | yes | **no** — Dex documents them as internal state |

The gRPC `Password` message in `api/v2/api.proto` carries only `email`, `hash`, `username` and `user_id`, and `server/apiserver/passwords.go` copies just those four into `storage.Password`, which does have a `Groups` field. The custom resources work, but Dex's storage documentation states they are internal and not to be used directly; their object names are derived from an undocumented FNV-64 and base32 scheme.

So configuration it is. The consequence is that adding a user, adding a team, or changing group membership requires Dex to restart, because Dex reads its configuration only at startup and never reloads it.

That restart is made harmless rather than avoided: Dex runs two replicas with `maxUnavailable: 0`, and a checksum of the rendered configuration is annotated on the Deployment so a change rolls the pods automatically. Sessions live in Dex storage, not pod memory, so a roll does not log anybody out.

### Subjects are derived from the values repository

A Dex password entry carries an explicit `userID`, and Dex derives the subject as `base64url(proto{user_id, connector_id})`. Setting `userID` to the APL user's existing UUID makes subjects repository-derived rather than Dex-allocated: they survive a cluster rebuild, and any user's subject is computable offline before a cluster is touched.

The connector ID is part of every subject and must never be renamed.

### Two user populations

Bringing an external identity provider remains supported, and the two populations stay mutually exclusive, as they are under Keycloak:

- **Users created in APL** are recorded in the values repository and rendered into Dex's `staticPasswords`. The values repository is their system of record; Dex holds their credential and group membership.
- **Federated users** arrive through a Dex `oidc` connector configured from the existing `oidc.*` settings. They are never written to the values repository, and their team membership comes from group claims.

### Positive Consequences

- Removes the Keycloak deployment, `apl-keycloak-operator` and the `keycloak-otomi-db` CloudNativePG cluster: roughly 650m CPU, 1.25Gi memory, 20Gi block storage and five pods, replaced by two pods at roughly 40m/128Mi in total.
- Removes the `platformBackups.database.keycloak` path and its alerting rule.
- Realm bootstrap, client registration, client scopes, protocol mappers and group mapping have no successor — most of `realm-factory.ts` is deleted rather than ported.
- Subjects become computable from the values repository, which is what makes a future subject-remapping migration tractable.

### Negative Consequences

- **Users cannot change their own password.** Static passwords are configuration. Keycloak offered a self-service account console; Dex has no equivalent, and the gRPC API cannot carry groups, so it is not a usable alternative. Password changes are administrative until Dex accepts groups over the API.
- **Every user or team change restarts Dex.** Mitigated by two replicas and a surge-first rollout, but it is a restart nonetheless.
- **Runs a pre-release Dex.** Auth sessions and RP-initiated logout are merged on Dex's master branch but unreleased (dexidp/dex#4560). Without sessions there is no single sign-on across applications that run their own OIDC flow, and no logout endpoint. The image is therefore pinned to a master digest with `DEX_SESSIONS_ENABLED=true`. **APL must not be released while this pin stands.**
- **Single sign-on needs explicit configuration.** `sessions.ssoSharedWithDefault` defaults to `none`, which gives no SSO at all. It is set to `all`.
- **Every claim must be requested.** Keycloak attached `groups` through a protocol mapper regardless of scope; Dex only emits a claim when its scope is requested (`server/tokens/issuer.go`). Consumers that previously asked for `openid` alone now need the full scope list, or they authenticate successfully with no authorization.
- **Logout requires the ID token.** Dex refuses `post_logout_redirect_uri` without `id_token_hint`, and a browser redirect cannot carry one. Logout is therefore driven from oauth2-proxy's `backend_logout_url`, which substitutes `{id_token}`.
- `apl-api` calls the Keycloak admin API directly (`src/utils/userUtils.ts`) for an email-uniqueness check. Dex exposes no equivalent; the values repository already holds every user and should serve the check instead.
- Two issuer implementations coexist until migration completes, and both must stay covered by CI.

## Pros and Cons of the Options

### Keep Keycloak as the issuer

- Good, because nothing changes and no capability is lost.
- Good, because it provides self-service password change, RP-initiated logout and an admin API.
- Bad, because it leaves the largest reducible component of the footprint in place on every installation.
- Bad, because it keeps `realm-factory.ts` and the Keycloak operator in maintenance indefinitely.

### Dex with users in storage

- Good, because users could be changed at runtime with no restart.
- Bad, because the gRPC API cannot set groups, which every authorization decision depends on.
- Bad, because the custom resources that can express groups are documented as internal, with undocumented naming; depending on them would couple APL to Dex's private implementation.

### Dex with users in configuration

- Good, because it is the only supported interface that expresses a user with groups.
- Good, because it removes the SQL database entirely.
- Good, because `userID` is settable, making subjects deterministic and repository-derived.
- Bad, because configuration is read only at startup, so user and team changes require a restart.
- Bad, because static passwords are immutable, removing self-service password change.

### Dex as a pure broker, external identity provider mandatory

- Good, because it is the smallest footprint and simplest configuration.
- Good, because it matches how Dex is most commonly deployed.
- Bad, because a cluster could not be installed and logged into without the customer first providing an identity provider.
- Bad, because most existing clusters run with `otomi.hasExternalIDP: false`.

## Links

- Migration decided in [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md)
- Builds on [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md)
- [Dex storage documentation](https://dexidp.io/docs/configuration/storage/) — states the custom resources are internal
- [dexidp/dex#4560](https://github.com/dexidp/dex/issues/4560) — auth sessions, merged but unreleased
