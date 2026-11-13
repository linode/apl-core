# Dex security hardening — egress policy, fork cleanup, istiod ingress scoping, and pod security context

- Status: accepted

Five security findings were addressed during a review of the Dex OIDC implementation.

## 1 — Password grant type retained

The `password` OAuth2 grant type (Resource Owner Password Credentials) allows a client to POST credentials directly to Dex's `/token` endpoint without the browser redirect flow, bypassing PKCE. It was initially removed in this change but was subsequently restored because it is required by platform tooling that authenticates non-interactively against Dex.

The grant remains in `grantTypes` in `helmfile.d/snippets/dex-config.gotmpl` alongside `authorization_code` and `refresh_token`. The risk is accepted and mitigated by the egress NetworkPolicy (§2) and the absence of an external connector — the password grant is only exercised against the local password database.

### PKCE background

PKCE (Proof Key for Code Exchange) protects the authorization code flow against code interception: the client commits to a hashed verifier before the redirect, then proves it owns the verifier when exchanging the code. The password grant bypasses this flow entirely — credentials go straight to the token endpoint. PKCE cannot compensate for a password grant; the compensating control here is network-level restriction.

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

## 5 — Harden pod and container security context

Neither `podSecurityContext` nor `securityContext` was set in `values/dex/dex.gotmpl`, leaving the Dex pod with default (permissive) kernel-level controls. The following settings were added:

**Pod security context:**
- `runAsNonRoot: true` — the pod spec itself rejects a root-UID container image, independent of Dex's own `USER` directive.
- `runAsUser: 1001` / `runAsGroup: 1001` — matches the `dex` user baked into `ghcr.io/dexidp/dex`.
- `seccompProfile: { type: RuntimeDefault }` — restricts syscalls to the container runtime's safe baseline, blocking unusual syscalls that an exploit might need.

**Container security context:**
- `allowPrivilegeEscalation: false` — prevents any setuid/setgid binary from gaining elevated privileges, even if one were planted in the image.
- `capabilities: { drop: [ALL] }` — removes all Linux capabilities. Dex listens on port 5556 (non-privileged), so no capability is needed.
- `readOnlyRootFilesystem: true` — the container filesystem is immutable at runtime; an attacker cannot write payloads, cron entries, or modified binaries to disk. All Dex state lives in Kubernetes CRDs, not on-disk.

A `/tmp` `emptyDir` volume was added to `volumes`/`volumeMounts` to give the Go runtime a writable temp directory (Go's `os.TempDir()` resolves to `/tmp`). All other writable paths used by Dex (config secret, web overlay ConfigMap) are already volume mounts and are unaffected by `readOnlyRootFilesystem`.

## Open items

The security review identified additional findings that remain open:

- `insecure_oidc_allow_unverified_email = true` is hardcoded in oauth2-proxy. This is benign with the local password connector but becomes a risk if an external connector (GitHub, Google) is added.
- `ssoSharedWithDefault: all` and `skipApprovalScreen: true` together mean authenticating to any registered client silently authenticates to all others with no consent prompt.
- The static `platform-admin` account has no post-bootstrap disable mechanism.
- Email uniqueness is not enforced in Dex (noted in the dex-as-issuer ADR, unimplemented).
- Logout does not propagate to other apps' oauth2-proxy sessions (tracked separately in `2026-10-06-dex-logout-session-propagation.md`).
