# Gateway API

This chart can expose Gitea through [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) resources
alongside (or instead of) the existing `Ingress` and OpenShift `Route` support. The following resources
are rendered:

- `HTTPRoute` — required for HTTP traffic
- `TCPRoute` — optional, typically for SSH (port 22)
- `BackendTLSPolicy` — optional, for encrypted backend traffic
- `ClientSettingsPolicy` — optional, **NGINX Gateway Fabric only**, to raise the client request body size limit

All resources are disabled by default. Enabling them requires Gateway API CRDs (and an implementation that supports them) to already be installed in the cluster.

The chart does **not** render a `Gateway` resource — provisioning and managing the Gateway is the responsibility of the cluster / platform administrator.

## Prerequisites

| Resource               | API version                          | Status (as of writing) |
| ---------------------- | ------------------------------------ | ---------------------- |
| `HTTPRoute`            | `gateway.networking.k8s.io/v1`       | GA                     |
| `TCPRoute`             | `gateway.networking.k8s.io/v1alpha2` | Experimental           |
| `BackendTLSPolicy`     | `gateway.networking.k8s.io/v1`       | GA (v1.2+)             |
| `ClientSettingsPolicy` | `gateway.nginx.org/v1alpha1`         | NGINX Gateway Fabric   |

## Common topology

Most users should attach to a pre-existing, shared `Gateway` managed by the cluster administrator:

```yaml
gatewayAPI:
  core:
    httpRoute:
      enabled: true
      tls: true            # the shared Gateway terminates TLS
      hostnames:
        - git.example.com
      parentRefs:
        - group: gateway.networking.k8s.io
          kind: Gateway
          name: shared-gateway
          namespace: gateway-system
          sectionName: https-gitea   # pin to a specific listener (see below)
    tcpRoute:
      enabled: true
      parentRefs:
        - group: gateway.networking.k8s.io
          kind: Gateway
          name: shared-gateway
          namespace: gateway-system
          sectionName: ssh
```

With this configuration:

- `ROOT_URL`, `DOMAIN`, and `SSH_DOMAIN` resolve to the first HTTPRoute hostname.
- Setting `gatewayAPI.core.httpRoute.tls: true` switches `ROOT_URL` to `https://`.
- The default HTTPRoute rule forwards `/` to the Gitea HTTP `Service`. The default TCPRoute rule forwards to the SSH `Service`.
- Custom `rules` and `hostnames` are rendered through `tpl`, so Helm template expressions work inside them.

### Why `sectionName` matters

Omitting `sectionName` attaches the route to **every** matching listener on the Gateway. On implementations
that use per-host HTTPS listeners (Envoy Gateway, Cilium Gateway), that means Gitea's HTTPRoute will try
to bind to every HTTPS listener — usually not what you want. Always pin to a named listener
(e.g. `https-gitea`, `ssh`) when the Gateway has more than one. The corresponding listener on the Gateway
side typically looks like:

```yaml
listeners:
  - name: https-gitea
    port: 443
    protocol: HTTPS
    hostname: git.example.com
    tls:
      certificateRefs:
        - name: git-example-com-tls
    allowedRoutes:
      kinds:
        - kind: HTTPRoute
      namespaces:
        from: Selector
        selector:
          matchLabels:
            kubernetes.io/metadata.name: gitea
  - name: ssh
    port: 22
    protocol: TCP
    allowedRoutes:
      kinds:
        - kind: TCPRoute
      namespaces:
        from: Selector
        selector:
          matchLabels:
            kubernetes.io/metadata.name: gitea
```

### Sharing a hostname between HTTP and SSH

HTTP (443) and SSH (22) are different ports, so a single hostname like `git.example.com` can serve both —
clients disambiguate by port. This is the recommended pattern: one DNS record, `ssh git@git.example.com`
and `https://git.example.com` both work, and `SSH_DOMAIN` / `DOMAIN` resolve to the same value with no
extra configuration.

If you want SSH on a **different** hostname (e.g. `gitea-ssh.example.com`), set it explicitly — the chart
cannot infer it from TCPRoute config because TCPRoutes don't carry hostnames:

```yaml
gitea:
  config:
    server:
      SSH_DOMAIN: gitea-ssh.example.com
```

## BackendTLSPolicy

Use this when the Gitea HTTP backend is terminating TLS itself (for example, when running Gitea with
`PROTOCOL=https`, or when fronting another HTTPS service from the same chart) and the Gateway needs to
verify the backend certificate before forwarding the request.

### Configuring Gitea to serve HTTPS directly

Gitea serves HTTPS via three `[server]` app.ini options
([cheat sheet](https://docs.gitea.com/administration/config-cheat-sheet#server-server)). Mount the
cert/key with `extraVolumes` + `extraContainerVolumeMounts` and point Gitea at them with absolute paths:

```yaml
gitea:
  config:
    server:
      PROTOCOL: https
      CERT_FILE: /etc/gitea-tls/tls.crt
      KEY_FILE: /etc/gitea-tls/tls.key

extraVolumes:
  - name: gitea-tls
    secret:
      secretName: gitea-backend-tls   # cert-manager-issued Secret, etc.
extraContainerVolumeMounts:
  - name: gitea-tls
    mountPath: /etc/gitea-tls
    readOnly: true
```

- Relative `CERT_FILE`/`KEY_FILE` values resolve against Gitea's `CustomPath` (`/data/gitea` in the
  official image); absolute paths are clearer.
- Both options are ignored when `gitea.config.server.ENABLE_ACME` is `true`.
- For chained certs, the server cert comes first, intermediates after.
- The Service still forwards raw TCP — no `service.http.*` changes needed. The pod's container port
  (3000 by default) is now speaking HTTPS instead of HTTP.

### BackendTLSPolicy example

Verify the backend with a CA bundle stored in a `ConfigMap`:

```yaml
gatewayAPI:
  core:
    backendTLSPolicy:
      enabled: true
      validation:
        hostname: gitea.svc.cluster.local
        caCertificateRefs:
          - name: gitea-backend-ca
            group: ""
            kind: ConfigMap
```

This renders a single `BackendTLSPolicy` whose `targetRefs` defaults to the chart's HTTP `Service`
(`<fullname>-http`), and whose `validation` is passed through verbatim. `validation` is required by the
API; the template fails fast if omitted.

### System CA trust and explicit targetRefs

To trust the system CA store (Gateway API v1.1+) or target a different Service, use `wellKnownCACertificates`
and `targetRefs`:

```yaml
gatewayAPI:
  core:
    backendTLSPolicy:
      enabled: true
      targetRefs:
        - group: ""
          kind: Service
          name: gitea-sidecar
      validation:
        hostname: sidecar.gitea.svc.cluster.local
        wellKnownCACertificates: System
```

Notes:

- `targetRefs[].kind` is almost always `Service`; `group: ""` is the core API group.
- `wellKnownCACertificates: System` requires Gateway API v1.1 and an implementation that supports it
  (otherwise stick with `caCertificateRefs`).
- The corresponding HTTPRoute must reference the backend by the same `Service` (and, if used,
  `sectionName`/`port`) — `BackendTLSPolicy` attaches to the Service-side reference, not to the route.

## Raising the request body size limit (NGINX Gateway Fabric)

NGINX defaults `client_max_body_size` to `1m`. Requests exceeding it are rejected with `413 Request
Entity Too Large`. This blocks uploading larger artifacts to Gitea's package/container registry (container
images, DEB/RPM packages, etc.). With the NGINX **Ingress** controller you raised this via the
`nginx.ingress.kubernetes.io/proxy-body-size` annotation — that annotation does **not** apply to Gateway
API. NGINX Gateway Fabric instead reads the limit from a
[`ClientSettingsPolicy`](https://docs.nginx.com/nginx-gateway-fabric/reference/api/) (`spec.body.maxSize`).

This is specific to **NGINX Gateway Fabric**. Other implementations (Envoy Gateway, Cilium, Istio, …) do
**not** impose a default request body size limit, so large uploads work without any extra configuration —
leave `gatewayAPI.nginx.clientSettingsPolicies` disabled.

```yaml
gatewayAPI:
  enabled: true
  nginx:
    clientSettingsPolicies:
      enabled: true
      body:
        maxSize: 100m   # bytes, or with a k / m / g suffix; 0 disables the limit
```

This renders a single `ClientSettingsPolicy` whose `targetRef` defaults to the chart's `HTTPRoute`
(`<fullname>`), so the limit applies to all traffic routed to Gitea. `body` is required when enabled; the
template fails fast if omitted. `spec.body` is passed through verbatim, so other fields (e.g. `timeout`)
are supported too.

To attach the policy elsewhere — for example the whole `Gateway` so the limit is inherited by every route —
override `targetRef`:

```yaml
gatewayAPI:
  nginx:
    clientSettingsPolicies:
      enabled: true
      targetRef:
        group: gateway.networking.k8s.io
        kind: Gateway
        name: shared-gateway
      body:
        maxSize: 100m
```

Notes:

- `ClientSettingsPolicy` is an inherited policy: attaching it to a `Gateway` cascades to its routes, while
  attaching it to an `HTTPRoute` scopes it to that route only.
- The policy must live in the same namespace as its `targetRef`.
- Gitea also enforces its own upload limits independently (`gitea.config` `[repository.upload]` and
  `[packages]` sections) — raising the proxy limit alone is not always sufficient.

## Interaction with `ingress` and `route`

The three exposure mechanisms are independent and can coexist, but `ROOT_URL` / `DOMAIN` / `SSH_DOMAIN` resolution uses the first defined source in this order:

1. `route.host` (when `route.enabled`)
2. `httpRoute.hostnames[0]` (when `gatewayAPI.core.httpRoute.enabled`)
3. First `ingress.hosts[0].host`
4. The in-cluster Service DNS name

Likewise, `ROOT_URL` becomes `https://` if any of these terminate TLS: `route.tls.termination`, `ingress.tls`, or `gatewayAPI.core.httpRoute.tls`.

## SSH considerations

- `TCPRoute` is still experimental. Many production-grade implementations support it (Envoy Gateway, Istio, Kgateway, NGINX Gateway Fabric), but you should verify before relying on it.
- If your Gateway implementation does not support `TCPRoute`, keep using `service.ssh.type: LoadBalancer` (or `NodePort`) and only enable `httpRoute` for HTTP traffic.
- The default TCPRoute rule points at the Gitea SSH `Service` on `service.ssh.port` (typically 22), which itself proxies to `gitea.config.server.SSH_LISTEN_PORT` inside the pod.
