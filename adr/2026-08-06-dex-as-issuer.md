# Dex replaces Keycloak as the OIDC issuer

- Status: accepted

Keycloak serves as both OIDC issuer and user store, costing ~650m CPU / 1.25Gi memory / 20Gi storage across five pods to authenticate a handful of users per cluster. Dex needs no database. We replace Keycloak with Dex, holding users in Dex's own storage and managing them over its gRPC API (`CreatePassword`/`UpdatePassword`/`DeletePassword`), including group membership — `apl-api` calls Dex directly whenever a user, team, or group membership changes, so nothing restarts. Upstream Dex's gRPC `Password` message has no `groups` field, so this runs on our fork carrying that patch (dexidp/dex#4972, submitted upstream, not yet merged). The issuer is selected per cluster via a new `otomi.issuer` field (`dex` | `keycloak`), not `apps.dex.enabled`/`apps.keycloak.enabled` — this lets both apps coexist and be enabled independently rather than tying the choice to whichever chart happens to be installed. New installs default `otomi.issuer: dex`, existing clusters keep `otomi.issuer: keycloak` (migration is a separate decision, see below).

## Considered Options

- Keep Keycloak as the issuer — status quo, but keeps the largest reducible part of the footprint on every install indefinitely.
- Dex, users in storage via gRPC API (chosen) — needs our unmerged fork, but no restart on user/team change and a deterministic, settable subject (`user_id`).
- Dex, users in the config file — works against unmodified upstream Dex, but config is read only at startup, so every user or team change restarts Dex, and static passwords rule out self-service password change.
- Dex as a pure broker, external IdP mandatory — smallest footprint, but most existing clusters run without an external IdP and couldn't be installed at all.

## Consequences

- **Runs a fork of Dex.** The `groups` field is our unpublished patch; until dexidp/dex#4972 merges, apl-core builds and rebases its own Dex image.
- **Runs a pre-release Dex.** Auth sessions and RP-initiated logout are merged upstream but unreleased (dexidp/dex#4560); the image is pinned to a master digest with `DEX_SESSIONS_ENABLED=true`. **APL must not be released while this pin stands.** This now stacks two sets of unmerged/unreleased changes on the same image.
- **`apl-api` owns user provisioning end-to-end** — it computes the password hash and calls Dex directly, with no independent render step to verify what reached Dex.
- **SSO needs explicit config**: `sessions.ssoSharedWithDefault` is set to `all` (default `none` gives no SSO).
- **Every claim must be requested** — Dex only emits `groups` when its scope is requested, unlike Keycloak's protocol-mapper approach.
- **Logout needs the ID token** — driven from oauth2-proxy's `backend_logout_url`, which substitutes `{id_token}`, since Dex refuses `post_logout_redirect_uri` without `id_token_hint`.
- `apl-api`'s Keycloak-admin-API email-uniqueness check (`src/utils/userUtils.ts`) has no Dex equivalent; the values repository should serve that check instead.
- Two issuer implementations coexist, both covered by CI, until migration completes.

## Links

- Migration decided in [ADR-2026-08-06](2026-08-06-keycloak-to-dex-migration-path.md)
- Builds on [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md)
- [dexidp/dex#4560](https://github.com/dexidp/dex/issues/4560) — auth sessions, merged but unreleased
- [dexidp/dex#4972](https://github.com/dexidp/dex/issues/4972) — our patch adding `groups` to the gRPC `Password` message; unmerged, APL runs a fork carrying it
