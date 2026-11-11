# Dex security hardening — OAuth2 grant types, egress policy, fork cleanup, and istiod ingress scoping

- Status: accepted

Four security issues were found during a review of the Dex OIDC implementation and fixed in this change.

## 1 — Remove the ROPC (password) grant type

The `password` OAuth2 grant type was enabled on the platform OIDC client alongside `authorization_code` and `refresh_token`. The Resource Owner Password Credentials grant lets any party POST a username and password directly to Dex's `/token` endpoint without going through the browser redirect flow, bypassing PKCE protection and making automated credential attacks trivial.

No code in `apl-console` or `apl-api` uses the password grant against Dex. It was removed from `grantTypes` in `helmfile.d/snippets/dex-config.gotmpl`. The client now accepts only `authorization_code` and `refresh_token`, which require the browser login flow and are safe against automated stuffing.

### PKCE

PKCE stands for Proof Key for Code Exchange (pronounced "pixie"). It's a security extension to the OAuth2 authorization code flow.

The problem it solves

In the standard authorization code flow, after the user logs in, the browser receives a short-lived code and exchanges it for a token. If an attacker can intercept that code (e.g. via a malicious app on the same device reading redirect URIs, or a browser history leak), they can exchange it
themselves.

How PKCE prevents this

Before starting the login flow, the client generates a random secret called the code verifier. It hashes it (SHA-256) to produce the code challenge and sends that hash to the authorization server upfront. When the client later exchanges the code for a token, it also sends the original
unhashed verifier. The server checks that hash(verifier) == the challenge it received earlier.

An attacker who intercepts the code doesn't know the original verifier — they can't complete the exchange.

Why it matters for the password grant removal

The password grant completely bypasses the authorization code flow — there's no redirect, no code, no PKCE. The user's credentials go directly to the token endpoint. PKCE has nothing to protect here because the entire secure flow is skipped. That's why removing the password grant and
forcing use of authorization_code (which supports PKCE) is the right fix — it puts the login back through the browser flow where PKCE can do its job.

## 2 — Remove stale fork warning

When Dex replaced Keycloak, it ran on a custom in-house fork (pinned to a master digest) because two upstream PRs were not yet merged: `groups` field in the gRPC `Password` message (dexidp/dex#4972) and auth sessions / RP-initiated logout (dexidp/dex#4560). The ADR carried a warning that APL must not be released while this pin stood.

Both PRs have since been merged upstream. The chart was already updated to the official `ghcr.io/dexidp/dex:v2.46.0` image in October 2026 (the `tag: master` override was removed then). The ADR warning and a stale code comment in `values/dex/dex.gotmpl` were updated to reflect the current state.

## 3 — Add egress NetworkPolicy and tighten pod selector

The Dex NetworkPolicy had only `Ingress` in `policyTypes` and used `podSelector: {}` (all pods in the namespace). Two problems:

- **No egress restriction.** A compromised Dex pod could freely open outbound connections to any cluster service or the internet — including the Kubernetes API, which Dex has cluster-scoped RBAC access to (it stores all state — passwords, tokens, sessions, signing keys — as CRDs).
- **Overly broad pod selector.** The policy applied to any pod in the `dex` namespace, not just the Dex pod itself.

Both were fixed in `charts/apl-network-policies/templates/networkpolicies/dex.yaml`:

- `podSelector` now matches `app.kubernetes.io/name: dex`.
- `Egress` added to `policyTypes` with three allowlist rules: DNS (`kube-system`), Istio (`istio-system`), and the Kubernetes API server (port 443 and 6443, public IPs only, using the same private-CIDR-blocking pattern as `otomi-api`).

The same CIDR lists (`blockedEgressCidrsV4`, `blockedEgressCidrsV6`) and `apiServerPorts` used by `otomi-api` were added as a `dex:` section in `values/apl-network-policies/apl-network-policies.gotmpl` and as chart defaults in `charts/apl-network-policies/values.yaml` (required so `helm template` does not throw a nil pointer error when the gotmpl values are not present).

## 4 — Narrow istio-system ingress to istiod pod and port 5556

Port 5556 (the HTTP login/OIDC/JWKS endpoint) uses `PERMISSIVE` mTLS in the `PeerAuthentication` because istiod has no Istio sidecar and cannot complete a mTLS handshake when fetching the JWKS keys (`/keys`). This is a fundamental Istio limitation — istiod needs the JWKS to verify tokens, but cannot do mTLS to fetch them. The PERMISSIVE mode itself cannot be changed without architectural work.

The compensating control is the NetworkPolicy. The previous ingress rule allowed the entire `istio-system` namespace (Kiali, Jaeger, cert-manager webhook, etc.) to reach Dex on any port with no restriction. This was fixed in `charts/apl-network-policies/templates/networkpolicies/dex.yaml`:

- Added `podSelector: matchLabels: app: istiod` to the istio-system ingress rule (confirmed from the platform's own istiod chart at `charts/istiod/templates/deployment.yaml`).
- Added `port: 5556` restriction so only the JWKS/OIDC endpoint is reachable, not gRPC or telemetry.

Any other pod in `istio-system` that is compromised can no longer pivot directly to Dex's login endpoint, bypassing the ingress gateway.

## Open items

The security review identified additional findings that remain open:

- `insecure_oidc_allow_unverified_email = true` is hardcoded in oauth2-proxy. This is benign with the local password connector but becomes a risk if an external connector (GitHub, Google) is added.
- `ssoSharedWithDefault: all` and `skipApprovalScreen: true` together mean authenticating to any registered client silently authenticates to all others with no consent prompt.
- The static `platform-admin` account has no post-bootstrap disable mechanism.
- Email uniqueness is not enforced in Dex (noted in the dex-as-issuer ADR, unimplemented).
- Logout does not propagate to other apps' oauth2-proxy sessions (tracked separately in `2026-10-06-dex-logout-session-propagation.md`).
