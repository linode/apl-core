# Migration path from Keycloak to Dex for existing clusters

- Status: accepted

[ADR-2026-08-06](2026-08-06-dex-as-issuer.md) makes Dex the new issuer, but Dex always mints its own subject (`ReservedClaimNames` in `server/tokens/claims.go`) and Keycloak's PBKDF2 password hashes can't convert to Dex's bcrypt — so no existing cluster's users or passwords can simply be carried over. We leave existing clusters on Keycloak and document a manual migration rather than migrating the fleet automatically: no upgrade should force an authentication change on a running cluster, and no migration we could build avoids the subject change or a fleet-wide credential reset anyway. `otomi.issuer` selects the issuer; the values migration writes `otomi.issuer: keycloak` into existing clusters before the default flips, so an upgrade never changes a running cluster's issuer.

## Considered Options

- Migrate every cluster automatically — reaches the whole fleet, but forces an unattended, unrecoverable password reset with no delivery channel for new credentials.
- Keep Keycloak as an in-cluster IdP behind Dex everywhere — no user action needed, but keeps Keycloak's footprint running and subjects still change, so it buys nothing but password preservation.
- Leave existing clusters on Keycloak, with a manual guide (chosen) — puts the choice and its cost in the hands of the operator who has to live with it.

## Consequences

- The footprint reduction reaches only new installs, not the existing fleet, unless an operator opts in.
- Two issuer implementations stay supported, both covered by CI, until Keycloak is retired in a later decision.
- The manual guide must cover: every user's subject changing, Harbor/Gitea accounts orphaning as a result (both key on subject+issuer), how to move users (new credentials via `apl-api`, or an external IdP), and regenerating the platform admin password hash for Dex.
- The guide needs an owner and a test pass each release, or it drifts from the code.

## Links

- Refines [ADR-2026-08-06](2026-08-06-dex-as-issuer.md)
- Related to [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md)
