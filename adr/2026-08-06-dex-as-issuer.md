# Dex replaces Keycloak as the OIDC issuer for newly installed clusters

- Status: accepted
- Deciders: APL team

## Context and Problem Statement

Keycloak currently fills two roles in APL: it is the OIDC issuer that every platform application trusts, and it is the store holding user credentials. Serving both roles costs roughly 650m CPU and 1.25Gi memory in requests plus 20Gi of block storage, spread over five pods — the Keycloak deployment, `apl-keycloak-operator`, and a two-instance CloudNativePG cluster with WAL volumes. A typical APL realm holds a handful of users, so the platform is running a Java application and a replicated SQL database to authenticate a population that would fit in a ConfigMap.

Dex is an identity broker that stores its state in Kubernetes custom resources and needs no database. Can it take over the issuer role, and what is lost if it does?

## Decision Drivers

- Reducing the resource footprint of an APL installation is an explicit product goal; Keycloak and its database are the largest single component that exists purely to support authentication.
- Most of what `apl-tasks/src/tasks/keycloak/realm-factory.ts` does — realm bootstrap, client registration, client scopes, protocol mappers, group-to-role mapping — is Keycloak-specific ceremony that carries ongoing maintenance cost and has no equivalent requirement in a broker.
- Users created in APL must still be able to change their own password without a platform admin editing the values repository.
- For users created in APL, the values repository must remain the system of record; the issuer should hold their credentials only. This does not apply to federated users, who are never recorded in the values repository.
- Clusters that bring their own identity provider (`otomi.hasExternalIDP: true`) must keep working exactly as they do today.

## Considered Options

- Keep Keycloak as the issuer (status quo)
- Dex with Kubernetes CRD storage and the built-in password database enabled
- Dex as a pure broker, requiring every cluster to bring an external identity provider

## Decision Outcome

Chosen option: "Dex with Kubernetes CRD storage and the built-in password database enabled", **for newly installed clusters only**. Existing clusters continue to run Keycloak unchanged; the issuer becomes a per-cluster choice rather than a platform constant. The migration path for existing clusters is deliberately not decided here — see [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md).

Dex is configured with `enablePasswordDB: true` and `storage.type: kubernetes`, so credentials live as `passwords.dex.coreos.com` custom resources that are mutable at runtime. This preserves self-service password change, which `staticPasswords` alone cannot offer. Credentials living outside git is not a change of model — today they live in Keycloak's Postgres — only the backup mechanism differs.

A Dex password entry carries an explicit `userID`, and Dex derives the subject claim as `base64url(proto{user_id, connector_id})`. We set `userID` to the APL user's existing UUID, which is already the SealedSecret filename under `env/manifests/namespaces/apl-users/sealedsecrets/`. Subjects are therefore derived from repository data rather than allocated by Dex.

### Two user populations

Bringing an external identity provider remains supported, and the distinction between the two populations is preserved as it stands today:

- **Users created in APL** are recorded in the values repository and projected into Dex as password entries. The values repository is their system of record; Dex holds only their credential and their group membership.
- **Federated users** arrive from the cluster's own identity provider through a Dex `oidc` connector, configured from the existing `oidc.*` settings (`issuer`, `clientID`, `clientSecret`, `usernameClaimMapper`, `subClaimMapper`). They are never written to the values repository — they appear on first login, and their team membership is derived from group claims via `oidc.platformAdminGroupID`, `oidc.allTeamsAdminGroupID`, `oidc.teamAdminGroupID` and each team's `settings.oidc.groupMapping`. This is self-service by design, and is unchanged from how Keycloak federation works today.

The two populations are mutually exclusive today: `IDPManager` in `apl-tasks/src/operators/keycloak/keycloak.ts` runs `manageUsers` only when `hasExternalIDP` is false, so a federated cluster ignores the values-repository user list entirely. Dex is able to serve both at once — a local password connector alongside an `oidc` connector — but this decision preserves the existing either/or behaviour rather than widening it.

### Positive Consequences

- Removes the Keycloak deployment, `apl-keycloak-operator`, and the `keycloak-otomi-db` CloudNativePG cluster from new installations: roughly 650m CPU, 1.25Gi memory, 20Gi block storage and five pods, replaced by a single pod at roughly 20m/64Mi.
- Removes the `platformBackups.database.keycloak` backup path and its alerting rule (`values/prometheus-operator/rules/keycloak-db-backup.yaml`) from new installations.
- Team membership travels on the `groups` field of the password entry, taken straight from the APL user record. Realm bootstrap, client registration, client scopes, protocol mappers and group-to-role mapping have no successor — most of `realm-factory.ts` is deleted rather than ported.
- Because subjects derive from repository data, they survive a cluster rebuild, and any user's future Dex subject is computable offline from the values repository alone. This is what makes a subject-remapping migration tractable if one is later built.

### Negative Consequences

- **Dex keeps no session at the issuer, and has no logout endpoint.** Auth sessions and RP-initiated logout exist only as an accepted design proposal in the Dex repository (`docs/enhancements/auth-sessions-2026-02-18.md`); neither is implemented in 2.45.1, and the v2.45.0 release notes do not mention them. A running 2.45.1 advertises no `end_session_endpoint`. Two consequences follow. Logout degrades to clearing local sessions, which is complete precisely because there is no issuer session to end — the four call sites that build a Keycloak logout URL (`routes.gotmpl`, `values/team-ns/`, `values/kubernetes-gateways/`, and apl-console) now redirect straight to the console. More significantly, **applications that run their own OIDC flow rather than sitting behind oauth2-proxy may prompt for credentials again**, because there is no browser session at the issuer to reuse. Keycloak holds such a session today, so this is a single-sign-on regression whose size depends on how many applications bypass oauth2-proxy. Revisit when Dex ships the sessions feature.
- **The derived layer must become issuer-agnostic first.** Keycloak's URL shape has leaked into eight consumer templates — `/realms/otomi` and `/protocol/openid-connect/*` appear across `helmfile.d/snippets/derived.gotmpl`, `grafana.gotmpl`, `routes.gotmpl`, `values/team-ns/`, `values/kubernetes-gateways/`, `values/prometheus-operator/` and `values/otomi-api/`. Dex has neither. These must be replaced with fully-formed derived endpoints (`oidcAuthUrl`, `oidcTokenUrl`, `oidcJwksUrl`, `oidcUserInfoUrl`, `oidcLogoutUrl`) as a standalone refactor that renders byte-identical output against Keycloak, so the Dex work is provably additive.
- `apl-api` calls the Keycloak admin API directly (`src/utils/userUtils.ts`) to list users for an email-uniqueness check. Dex exposes no equivalent; this path needs a different implementation on Dex clusters.
- Two issuer implementations coexist until the migration ADR is resolved, and both must be covered by CI.
- The connector ID is baked into every subject permanently. It must be chosen once and never renamed, since renaming re-orphans every downstream account. It also means the same person authenticating through two different connectors would receive two different subjects, which is a further reason to keep the two populations mutually exclusive.

## Pros and Cons of the Options

### Keep Keycloak as the issuer

- Good, because nothing changes for existing or new clusters, and no capability is lost.
- Good, because Keycloak provides RP-initiated logout, a self-service account console, and an admin API that `apl-api` already consumes.
- Bad, because it leaves the largest reducible component of the platform footprint in place on every installation.
- Bad, because it keeps `realm-factory.ts` and the Keycloak operator in maintenance indefinitely.

### Dex with Kubernetes CRD storage and the password database enabled

- Good, because it removes the SQL database entirely — Dex stores state in custom resources.
- Good, because passwords remain mutable, so self-service password change survives.
- Good, because `userID` is settable, which makes the subject deterministic and repository-derived.
- Good, because group membership is a plain field on the password entry, deleting a large amount of Keycloak-specific mapping code.
- Bad, because Dex holds no session at the issuer, so it offers no logout endpoint and cannot spare applications that run their own OIDC flow from prompting again.
- Bad, because credentials sit in etcd rather than in a database with an existing backup path.

### Dex as a pure broker, external identity provider mandatory

- Good, because it is the smallest possible footprint and the simplest configuration.
- Good, because it matches how Dex is most commonly deployed.
- Bad, because it removes the out-of-box experience: a cluster could not be installed and logged into without the customer first providing an identity provider.
- Bad, because roughly nine in ten existing clusters run with `otomi.hasExternalIDP: false`, so this option does not describe how APL is actually used.

## Links

- Migration for existing clusters decided separately in [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md)
- Builds on [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md) — APL users are stored as SealedSecrets in the values repository
- [Dex storage: Kubernetes custom resource definitions](https://dexidp.io/docs/configuration/storage/#kubernetes-custom-resource-definitions-crds)