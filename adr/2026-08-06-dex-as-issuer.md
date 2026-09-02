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
- Dex, with users held in Dex storage, managed over the gRPC API
- Dex, with users held in the Dex configuration file
- Dex as a pure broker, requiring every cluster to bring an external identity provider

## Decision Outcome

Chosen option: **Dex, with users held in Dex storage, managed over the gRPC API.**

The issuer is selected per cluster by `apps.dex.enabled`. New installations default to Dex; existing clusters keep Keycloak until migrated. Migration is decided separately in [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md).

Dex uses `storage.type: kubernetes` for all the state it owns — auth codes, refresh tokens, sessions, signing keys, and now users. Nothing user-related is rendered into Dex's configuration.

### Why users live in storage now, not configuration

Dex offers three ways to hold users:

| Interface | Users with groups | Supported |
|---|---|---|
| configuration file | yes | yes |
| gRPC API | yes, on our fork | yes, upstream PR pending |
| custom resources | yes | **no** — Dex documents them as internal state |

The blocker recorded when this ADR was first written was that the gRPC `Password` message in `api/v2/api.proto` carried only `email`, `hash`, `username` and `user_id` — no `groups` — even though `storage.Password` itself has a `Groups` field. We patched that gap ourselves: our fork adds `groups` to the `Password` message and threads it through `server/apiserver/passwords.go` into `storage.Password`. That patch is the substance of dexidp/dex#4972, filed upstream and not yet merged; until it lands, APL's Dex image is built from our fork rather than upstream master.

With `groups` available over gRPC, storage-backed users are now fully expressible, and they win outright over the configuration-file approach:

- No restart on user or team change. `CreatePassword` / `UpdatePassword` / `DeletePassword` take effect immediately; Dex never re-reads a config file for this.
- No checksum-triggered rollout to reason about, and no dependency on `maxUnavailable: 0` timing to make a restart harmless.
- The custom-resource concern about undocumented internal naming doesn't apply here: callers never touch the `Password` custom resource directly, they go through the documented gRPC surface, and the storage backend is Dex's own concern.

### How users reach Dex

`apl-api` is the only writer. When a user is created, updated, or deleted — or a user's team membership changes — `apl-api` calls Dex's gRPC API directly (`CreatePassword` / `UpdatePassword` / `DeletePassword`) with the user's `email`, bcrypt `hash`, `username`, `user_id`, and `groups`. There is no intermediate render step and nothing for apl-core's Helmfile pipeline to generate for this.

The values repository is no longer in this path at all for user records reaching the issuer; it previously only existed to get ciphertext to a place apl-core could read it during apply, which is no longer necessary now that apl-api talks to Dex directly. User records may still be persisted as SealedSecrets in the `apl-users` namespace as APL's system of record and for backup/inspection, but Dex's own state is populated straight from the API call, independent of any apply cycle.

Group membership is derived the same way it always was — from the stored administrator flag and team list — but is now sent as part of the same gRPC call rather than reproduced separately at render time.

The password hash is still computed by `apl-api`, once, at the point it holds the plaintext — bcrypt stays salted and non-reproducible, but that no longer matters for a configuration checksum, since there is no configuration to check.

### Subjects are derived from the values repository

A Dex password entry carries an explicit `userID`, and Dex derives the subject as `base64url(proto{user_id, connector_id})`. Setting `userID` to the APL user's existing UUID makes subjects repository-derived rather than Dex-allocated: they survive a cluster rebuild, and any user's subject is computable offline before a cluster is touched.

The connector ID is part of every subject and must never be renamed.

### Two user populations

Bringing an external identity provider remains supported, and the two populations stay mutually exclusive, as they are under Keycloak:

- **Users created in APL** originate in the values repository and are rendered into Dex's `staticPasswords` from their materialised form on the cluster, as described above. The values repository remains their system of record.
- **Federated users** arrive through a Dex `oidc` connector configured from the existing `oidc.*` settings. They are never written to the values repository, and their team membership comes from group claims.

### Positive Consequences

- Removes the Keycloak deployment, `apl-keycloak-operator` and the `keycloak-otomi-db` CloudNativePG cluster: roughly 650m CPU, 1.25Gi memory, 20Gi block storage and five pods, replaced by two pods at roughly 40m/128Mi in total.
- Removes the `platformBackups.database.keycloak` path and its alerting rule.
- Realm bootstrap, client registration, client scopes, protocol mappers and group mapping have no successor — most of `realm-factory.ts` is deleted rather than ported.
- Subjects remain settable by `apl-api` on `CreatePassword` (see below), which is what makes a future subject-remapping migration tractable.
- No restart on user, team, or group-membership change — the configuration-file approach's central cost is gone.
- Password changes (`UpdatePassword`) also take effect immediately, without a restart, which reopens the door to self-service password change if a client is built for it.

### Negative Consequences

- **Runs a fork of Dex, not upstream.** The `groups` field on the gRPC `Password` message is our patch, submitted upstream as dexidp/dex#4972 but not yet merged. Until it merges, apl-core builds and tracks its own Dex image, rebasing our patch onto upstream as it moves — an ongoing maintenance cost with no fixed end date, and a real risk of drift if the fork is neglected.
- **Runs a pre-release Dex.** Auth sessions and RP-initiated logout are merged on Dex's master branch but unreleased (dexidp/dex#4560). Without sessions there is no single sign-on across applications that run their own OIDC flow, and no logout endpoint. The image is therefore pinned to a master digest with `DEX_SESSIONS_ENABLED=true`. **APL must not be released while this pin stands.** This now compounds with the fork above: the pinned image carries two sets of unreleased/unmerged changes at once.
- **User provisioning is now `apl-api`'s responsibility end-to-end.** It computes the password hash and calls Dex directly; there is no separate render step in apl-core to sanity-check or replay the call, so a bug in `apl-api`'s Dex client has no independent safety net.
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

### Dex with users in storage, managed over the gRPC API

- Good, because users, including group membership, can be created, updated and deleted at runtime with no restart.
- Good, because it removes the SQL database entirely.
- Good, because `user_id` is settable on `CreatePassword`, making subjects deterministic.
- Good, because it reopens self-service password change as a future possibility (`UpdatePassword` needs no restart).
- Bad, because upstream Dex's `Password` message has no `groups` field — this depends on our own unmerged patch (dexidp/dex#4972), so APL runs a fork rather than upstream Dex.
- Bad, because `apl-api` becomes the sole path for provisioning; there's no separate rendering step to independently verify what reached Dex.

### Dex with users in configuration

- Good, because it needs no fork or patch — it works against unmodified upstream Dex.
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
- [dexidp/dex#4972](https://github.com/dexidp/dex/issues/4972) — our patch adding `groups` to the gRPC `Password` message; unmerged, APL runs a fork carrying it
