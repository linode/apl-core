# Dex security hardening — egress policy, fork cleanup, istiod ingress scoping, and pod security context

- Status: accepted

A security review of the Dex OIDC implementation found several weaknesses. We fix them by locking down Dex's network access and pod security, and accept the remaining risk of the `password` grant instead of removing it.

## Decision

- **Keep the `password` grant.** Platform tooling authenticates non-interactively against Dex, so the grant stays in `grantTypes`. PKCE cannot protect it, so the risk is accepted and mitigated by the egress NetworkPolicy and by having no external connector (the grant is only exercised against the local password database).
- **Restrict Dex network access.** The Dex NetworkPolicy selects only the Dex pod and limits egress to DNS, Istio and the Kubernetes API server, since a compromised Dex pod has cluster-scoped RBAC access to all its state (stored as CRDs).
- **Scope istio-system ingress.** Port 5556 must stay `PERMISSIVE` mTLS because istiod has no sidecar and cannot fetch the JWKS over mTLS. As compensation, only the istiod pod may reach Dex, and only on port 5556.
- **Harden the pod.** Run as non-root with the `RuntimeDefault` seccomp profile, no privilege escalation, all capabilities dropped and a read-only root filesystem (plus a `/tmp` `emptyDir`).
- **Drop the stale fork warning.** Both upstream Dex PRs we depended on are merged and the chart uses the official image, so the "do not release while pinned to a fork" warning no longer applies.

## Consequences

Open findings that are not addressed by this decision:

- `insecure_oidc_allow_unverified_email = true` in oauth2-proxy remains a risk for deployments using the external OIDC connector enabled by `otomi.hasExternalIDP`; `passwordConnector: local` does not constrain browser authentication through that connector.
- `ssoSharedWithDefault: all` with `skipApprovalScreen: true` silently authenticates a user to all registered clients.
- The static `platform-admin` account cannot be disabled after bootstrap.
- Email uniqueness is not enforced in Dex.
- Logout does not propagate to other apps, see [ADR-2026-10-06](2026-10-06-dex-logout-session-propagation.md).
