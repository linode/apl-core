# Auth policy pod label (`otomi.io/auth-policy`)

Two labels work together to enforce authentication and authorization on platform workloads via Istio:

- `otomi.io/auth: platform` — selects pods targeted by `RequestAuthentication` (JWT validation against Keycloak). Currently there is only one authentication provider, so only one value is in use.
- `otomi.io/auth-policy: <tier>` — selects pods targeted by an Istio `AuthorizationPolicy` (ALLOW action). The label value names the authorization tier the workload belongs to.

## Why pod label selector instead of `targetRefs`

Gateway-level policies (the oauth2-proxy CUSTOM action) use `targetRefs` pointing to a `Gateway`, which applies to all traffic through that gateway. Pod label selectors let a single `AuthorizationPolicy` target exactly the workloads that belong to a given tier, across namespaces.

## Why the label value encodes the access tier, not the workload identity

The label value (`platform`, `platform-admin`, `platform-team`, `monitoring-<teamId>`, …) names _who can access_ the workload, not _what the workload is_. Multiple workloads share the same tier label so they can share a single `AuthorizationPolicy`. This makes the access intent visible directly on the pod spec without reading the policy resource.
