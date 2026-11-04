# loki

Helm chart for Grafana Loki supporting monolithic, simple scalable, and microservices modes.

## Source Code

* <https://github.com/grafana/loki>
* <https://grafana.com/oss/loki/>
* <https://grafana.com/docs/loki/latest/>

## Requirements

The Following are installed via subchart

| Repository | Name |
|------------|------|
| https://grafana.github.io/helm-charts | rollout_operator(rollout-operator) |

Find more information in the Loki Helm Chart [documentation](https://grafana.com/docs/loki/latest/setup/install/helm/).

## Installing the Chart

### OCI Registry

OCI registries are preferred in Helm as they implement unified storage, distribution, and improved security.

```console
helm install RELEASE-NAME oci://ghcr.io/grafana-community/helm-charts/loki
```

### HTTP Registry

```console
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
helm install RELEASE-NAME grafana-community/loki
```

## Uninstalling the Chart

To remove all of the Kubernetes objects associated with the Helm chart release:

```console
helm delete RELEASE-NAME
```

## Gateway proxy

The chart uses NGINX for the Loki gateway by default. Envoy is available as an opt-in, experimental implementation; its `gateway.envoyConfig` values and the rendered Envoy configuration may change in minor releases:

```yaml
gateway:
  type: envoy
```

The generated Envoy configuration keeps the same Loki API routing and deployment-mode targets as the generated NGINX configuration, including an unauthenticated `200` for `/` and `/livez`. Unknown paths return `404` instead of being proxied. It accepts HTTP/1.1 and cleartext HTTP/2, listens on IPv4 and IPv6 by default, enables frontend and backend keep-alive, and writes access logs to stdout. Envoy exposes native Prometheus metrics from the existing gateway metrics Service at `/stats/prometheus`; its administration listener allows only `/ready` and `/stats/prometheus`. Kubernetes readiness checks use `/ready` on the administration listener, while liveness checks use `/livez`, which is excluded from proxy access logs.

Envoy uses Loki's cleartext HTTP/2 support for regular upstream requests by default. WebSocket tail requests use a dedicated HTTP/1.1 upstream cluster. Disable `gateway.envoyConfig.upstreamHTTP2` for older Loki versions or custom upstreams that support only HTTP/1.1.

For HTTPS Loki upstreams, Envoy verifies the certificate chain against the image's system CA bundle and checks the upstream hostname. Set `gateway.envoyConfig.upstreamTLS.caCertificateFile` to a mounted custom CA bundle when needed. `gateway.envoyConfig.upstreamTLS.insecureSkipVerify: true` explicitly disables both checks.

Use `gateway.envoyConfig` to configure listeners, timeouts, logging, TLS, remote JWKS validation, upstream HTTP/2, or the complete Envoy configuration. The existing `gateway.nginxConfig.schema` and `customReadUrl`/`customWriteUrl`/`customBackendUrl` values are also honored; Envoy accepts scheme, host and port in these URLs and rejects a path component, because its routes forward the original request path unchanged.

Envoy uses its native Basic Auth filter and the existing `gateway.basicAuth` `.htpasswd` Secret contract, so no authorization sidecar is added. The native filter only accepts `{SHA}` htpasswd entries, an unsalted SHA-1 digest that is weaker than the bcrypt hashes NGINX uses by default and can be brute-forced offline by anyone who can read the Secret; the chart derives that format from plaintext `password` values, while other `passwordHash` formats remain supported by NGINX only. Generate an Envoy hash with `printf %s 'password' | openssl dgst -sha1 -binary | openssl base64 -A`, then prefix the result with `{SHA}`. When `loki.tenants` is configured and at least one authentication method is enabled, the gateway overwrites any client-supplied `X-Scope-OrgID` header with the mapped tenant name; with only `gateway.basicAuth.username` and no tenants, Basic Auth is enforced but the client header passes through unchanged, as with NGINX. A tenant that defines `jwtSubClaim` or `clientCertificateCN` accepts Basic Auth only when it also sets `password` or `passwordHash`. Only `name`, `password`, and `passwordHash` are shared by both gateway implementations; `basicAuthUsername`, `clientCertificateCN`, and `jwtSubClaim` are Envoy-only. `basicAuthUsername` defaults to the tenant name and can map a distinct username to one or more Loki tenants:

```yaml
loki:
  tenants:
    - name: "cluster1|cluster2|cluster3"
      basicAuthUsername: grafana
      passwordHash: "{SHA}eJy+BAeECxwgQcszRS/2Dxm/WMw="
```

Envoy reads the `.htpasswd` Secret when it starts and the chart deliberately adds no password-derived checksum to the pod template, because such a checksum would expose the unsalted hash to anyone who can read pods. After changing chart-managed credentials or rotating an `existingSecret`, restart the gateway Deployment or change `gateway.podAnnotations` to trigger a rollout.

Tenant entries can additionally set lists of `clientCertificateCN` and `jwtSubClaim` aliases. Client-certificate mapping requires Envoy TLS termination with `gateway.envoyConfig.tls.enabled` and a Secret containing `tls.crt`, `tls.key`, and `ca.crt`. JWT mapping requires `gateway.envoyConfig.jwt.enabled`. Its defaults validate Kubernetes projected ServiceAccount tokens with issuer `https://kubernetes.default.svc.<global.clusterDomain>` and the Helm-templated audience `{{ include "loki.name" . }}.{{ include "loki.namespace" . }}`, and fetch JWKS from `https://kubernetes.default.svc.<global.clusterDomain>./openid/v1/jwks`, using the namespace `kube-root-ca.crt` ConfigMap. Envoy fetches and caches the JWKS over HTTP(S), validates the token signature, issuer, expiration, and optional audiences, and only then maps `sub`; JWT verification keys are not mounted from disk.

Envoy's `jwt_authn` filter cannot attach credentials to its JWKS requests, so the chart routes them through a loopback listener (`gateway.envoyConfig.jwt.remoteJwks.credentialInjectorPort`, bound to `127.0.0.1` only) whose credential injector adds `Authorization: Bearer` from `gateway.envoyConfig.jwt.remoteJwks.bearerTokenFile`. By default that file is a projected token of the gateway ServiceAccount mounted at `/etc/envoy/kubernetes/token`; Kubernetes grants every ServiceAccount the `system:service-account-issuer-discovery` ClusterRole, so the JWKS fetch needs no extra RBAC and keeps working with `--anonymous-auth=false` and `rbac.namespaced: true`. Envoy reloads the token when the kubelet rotates it. Failed JWKS requests are retried with a short backoff (`gateway.envoyConfig.jwt.remoteJwks.retries`) before the listener starts serving; if every retry fails, JWT requests are rejected with `401` until the next fetch succeeds about a second later. Point `bearerTokenFile` at another mounted file to send a different credential, or set it to `null` to fetch the JWKS anonymously.

The chart's loki-canary authenticates with Basic Auth by default. A loki-canary build that supports the `-bearer-token-file` option (see [grafana/loki#24533](https://github.com/grafana/loki/pull/24533)) can authenticate through the JWT path instead. Enable its projected token and map the canary ServiceAccount subject to its tenant:

```yaml
lokiCanary:
  tenant:
    bearerToken:
      enabled: true

gateway:
  type: envoy
  envoyConfig:
    jwt:
      enabled: true

loki:
  tenants:
    - name: self-monitoring
      jwtSubClaim:
        - system:serviceaccount:<namespace>:<canary-service-account-name>
```

When the JWKS is fetched anonymously (`bearerTokenFile: null`), the JWKS endpoint must be readable without credentials. Kubernetes only grants the built-in `system:service-account-issuer-discovery` ClusterRole to `system:serviceaccounts` by default, so the chart's default bearer token is the recommended way to reach the Kubernetes JWKS endpoint. The chart does not create cluster-wide RBAC for anonymous access; use an existing binding or an external issuer when disabling the bearer token.

When `networkPolicy.enabled` and Envoy JWT verification are enabled, the chart allows gateway egress on the JWKS URI's TCP port. Kubernetes NetworkPolicy cannot select the API server Service by name, so the rule permits any destination on that port by default. Set `networkPolicy.gatewayJwks.cidrs` to restrict destinations when your cluster's API server address is stable; verify CIDR matching with your network plugin because Service address translation can affect policy evaluation. Cilium-specific policies are not supported by this chart.

Clusters configured with a custom Kubernetes ServiceAccount issuer or audience must override `gateway.envoyConfig.jwt.issuer`, `gateway.envoyConfig.jwt.audiences`, `gateway.envoyConfig.jwt.remoteJwks.uri`, and `lokiCanary.tenant.bearerToken.audience` together.

`gateway.configs` accepts any number of extra templated configuration files. Envoy can reference them at `/etc/envoy/<name>` from an overridden `gateway.envoyConfig.file`.

## Changelog

See the [changelog](https://grafana-community.github.io/helm-charts/changelog/?chart=loki).

---

## StatefulSet immutability

Most StatefulSet spec fields are immutable. Storage class, PVC size, access modes, `podManagementPolicy`, selector, and `serviceName` are install-time unless the recreate job below covers the change.

### Which workloads render StatefulSets

| Deployment mode | Typical StatefulSet components |
| --- | --- |
| Monolithic (`singleBinary`) | `singleBinary` when `singleBinary.kind=StatefulSet` (the default) |
| Simple Scalable | `write`, `backend` (and `read` only if `read.kind=StatefulSet`) |
| Distributed | `ingester`, `indexGateway`, `compactor`, `ruler`, plus `patternIngester` / bloom components when enabled and `kind=StatefulSet` |
| Caches | `resultsCache` / `chunksCache` memcached StatefulSets when those caches are enabled |

### Values that map to immutable StatefulSet fields

Paths are per component (`singleBinary.*`, `write.*`, `backend.*`, `ingester.*`, and so on) unless noted.

| Values | Recreate job covers it? |
| --- | --- |
| `*.persistence.storageClass`, `*.persistence.claims[].storageClass`, zone storageClass overrides | No |
| `*.persistence.size`, `*.persistence.claims[].size`, cache `persistence.storageSize` | Yes, if `*.statefulSetRecreateJob.enabled` (Loki components only). Also patches PVCs when `defaults.statefulSetRecreateJob.patchPVC` is true |
| `*.persistence.accessModes`, `claims[].accessModes` | No |
| `*.persistence.selector` | No |
| `*.persistence.volumeAttributesClassName` and claims equivalent | No |
| `*.persistence.labels`, `claims[].labels`, claim `name` | Count/name/size mismatch only |
| `*.persistence.annotations`, `claims[].annotations` | No |
| `*.podManagementPolicy` | Yes, if the recreate job is enabled |
| `nameOverride`, `fullnameOverride`, `*.fullnameOverride`, Helm release name | `serviceName` only |
| Chart-generated selector labels | No |

`*.selectorLabels` in `values.yaml` is **not rendered** into `spec.selector`.

### Recreate job (experimental)

Set `*.statefulSetRecreateJob.enabled=true` on a Loki component. On `helm upgrade`, a pre-upgrade Job deletes the StatefulSet with `--cascade=orphan` when `podManagementPolicy`, `serviceName`, volume-claim count, claim name, or claim **size** differs, and optionally expands PVCs when `defaults.statefulSetRecreateJob.patchPVC` is true.

It does not migrate `storageClass`, `accessModes`, VCT selectors, VCT labels/annotations, or `volumeAttributesClassName`. Memcached cache StatefulSets do not have this Job. `lookup` needs a live cluster; `helm template` / dry-run will not emit it.

This chart emits `apiVersion: v1` and `kind: PersistentVolumeClaim` on each VCT. Older live objects that lack those fields can fail server-side apply even when values did not change.

---

## Upgrading

### From 20.0.2 to 20.0.3 ([#941](https://github.com/grafana-community/helm-charts/pull/941))

The memberlist Service, used as the seed list for `memberlist.join_members`, now only selects components that always run a memberlist listener. query-frontend, query-scheduler, index-gateway, the bloom components and overrides-exporter no longer carry the `app.kubernetes.io/part-of: memberlist` pod label. They still join the memberlist cluster through the seed nodes when their configuration needs it.

The unused `indexGateway.joinMemberlist` value has been removed.

If you run custom NetworkPolicies that allow port 7946 only between pods labeled `app.kubernetes.io/part-of: memberlist`, also allow the components that listen in some setups: query-frontend and query-scheduler with `loki.query_scheduler.use_scheduler_ring`, index-gateway and the bloom components with `loki.index_gateway.mode: ring`, and every component with `loki.ui.enabled`.

### From 19.x to 20.0.0

**Breaking** The MinIO subchart, deprecated since 17.0.0, has been removed together with the `minio` and `ignoreMinioDeprecation` values and the `loki.minio` template helper. Setting `minio.enabled` no longer deploys MinIO or configures Loki storage.

If you still run the built-in MinIO, finish the migration to an external object storage backend on 19.x first, following the 17.0.0 notes below, and upgrade to 20.0.0 only after the old data has aged out. Alternatively, deploy MinIO separately and point `loki.storage.s3` at it.

`loki.testSchemaConfig` now always uses the `filesystem` object store.

The example `monolithic-values.yaml`, `simple-scalable-values.yaml` and `distributed-values.yaml` files now expect an external S3-compatible object store; replace the `FIXME` placeholders under `loki.storage`.

**Breaking** The values schema no longer allows unknown top-level keys. `helm install`, `helm upgrade` and `helm template` now fail with `additional properties '<key>' not allowed` when your values contain a top-level key the chart does not define, for example a typo or a leftover such as `minio`, `ignoreMinioDeprecation` or `bloomCompactor`. Remove those keys before upgrading. Keys under `global` are still accepted as-is.

### From 19.2.x to 19.3.0 ([#809](https://github.com/grafana-community/helm-charts/pull/809))

Pod templates no longer carry `helm.sh/chart` or `app.kubernetes.io/version`. `helm.sh/chart` changed on every chart version bump, and because it sat inside the pod template it rolled every workload on upgrade even when neither the configuration nor the image had changed. They remain on the objects themselves, so `kubectl get deploy -L helm.sh/chart` is unaffected.

If you group metrics by pod label (`kube_pod_labels` joined on `label_app_kubernetes_io_version`, for example), those series will stop being populated for Loki pods. Use the object-level label, or add the value you need through `commonLabels` or a component `podLabels` block.

`commonLabels` still applies to the pod templates of the Loki components. The gateway, canary and memcached pod templates do not carry it, as before.

### From 18.x to 19.0.0 ([#883](https://github.com/grafana-community/helm-charts/pull/883))

The `.Values.loki.service.headlessService`, `.Values.defaults.service.headlessService` and `.Values.component.service.headlessService` blocks have been introduced to separate the management of labels and annotations for the headless and primary service.

**Breaking** annotations that had previously been inherited by the headless services from `loki.serviceAnnotations`, `defaults.service.annotations`, `.Values.component.service.annotations` are no longer applied to the headless service, and will only apply to the primary service.

If you wish to continue applying the same annotations to both the headless and primary service, these values need to be copied directly into  `.Values.loki.service.headlessService`, `.Values.defaults.service.headlessService` or `.Values.component.service.headlessService` respectively.

**Breaking** labels that had previously been inherited by the headless services from `loki.serviceLabels`, `defaults.service.labels`, `.Values.component.service.labels` are no longer applied to the headless service, and will only apply to the primary service.

If you wish to continue applying the same labels to both the headless and primary service, these values need to be copied directly into  `.Values.defaults.service.headlessService` or `.Values.component.service.headlessService` respectively.

### From 17.x to 18.0.0 ([#193](https://github.com/grafana-community/helm-charts/pull/193))

The `.Values.monitoring` block has been refactored and the root `.Values.clusterLabelOverride` field removed and merged into `.Values.monitoring`. Users should not assume backwards compatibility with any prior monitoring configuration — review this section in full before upgrading.

All dashboards, recording rules, and alert rules are now generated from the upstream [loki-mixin](https://github.com/grafana/loki/tree/main/production/loki-mixin) rather than maintained as static files. This ensures dashboard queries work correctly across all deployment modes (Monolithic, SimpleScalable, Distributed) and keeps the chart aligned with the upstream Loki observability stack.

#### `cluster` label repurposed; new `app_instance` label

The metric label that identifies the Loki Helm release has changed from `cluster` to `app_instance`. The `cluster` label is no longer added by default — it is now an optional label for multi-cluster environments, controlled by `monitoring.multiCluster.enabled`. When enabled, its value comes from `monitoring.multiCluster.clusterName` and represents the Kubernetes cluster, not the Helm release.

Actions required:
- Update any alerting rules, dashboards, or downstream recording rules that filter on `cluster=~"<release-name>"` to use `app_instance=~"<release-name>"` instead.
- Existing Grafana dashboard URLs that encode the `cluster` variable in the URL will need to be updated.
- If you run Loki across multiple Kubernetes clusters, enable `monitoring.multiCluster.enabled` and set `monitoring.multiCluster.clusterName` to restore the `cluster` label with a per-cluster value.

#### Alerts separated from rules

Alert rules have been split into a new `monitoring.alerts` section, separate from `monitoring.rules` (which now only controls recording rules). Users who had `monitoring.rules.alerting: true` must switch to `monitoring.alerts.enabled: true`.

The old `monitoring.rules.configs` block (with per-alert `enabled`, `for`, `lookbackPeriod`, `threshold`, `severity`) has been removed. Alerts are now generated from the loki-mixin and can be individually disabled or customised:

```yaml
monitoring:
  alerts:
    enabled: true
    disabled: {}    # disable specific alerts: { LokiRequestErrors: true }
    overrides: {}   # override per-alert for/severity: { LokiRequestErrors: { for: 5m, severity: warning } }
    keepFiringFor: ""
```

Note: `lookbackPeriod` and `threshold` are not carried forward as they did not generalize to all PromQL alert expressions.

#### Removed and renamed values

| Old value | Replacement |
|---|---|
| `ingester.updateStrategy` | `ingester.strategy` |
| `clusterLabelOverride` | `monitoring.appInstanceLabelName` and `monitoring.appInstanceLabelValue` |
| `monitoring.serviceMonitor.clusterLabel` | `monitoring.appInstanceLabelName` and `monitoring.appInstanceLabelValue` |
| `monitoring.dashboards.namespace` | `monitoring.namespace` (applies to all monitoring resources) |
| `monitoring.rules.namespace` | `monitoring.namespace` |
| `monitoring.rules.additionalGroups` | `monitoring.additionalPrometheusRules` (dict structure, supports both recording rules and alerts — see `values.yaml` for examples) |
| `monitoring.dashboards.multiCluster` | `monitoring.multiCluster` (hoisted to monitoring level) |

#### Recording rule names

Recording rule `record:` names now use the `cluster_job:`, `cluster_job_route:`, and `cluster_namespace_job_route:` conventions from the upstream loki-mixin. If you reference recording rule metrics directly in custom alerts or dashboards, update your queries.

#### Multi-cluster configuration

`monitoring.multiCluster` supports two modes:

| Setting | Behavior |
|---|---|
| `enabled: true` + `clusterName: "my-cluster"` | **Basic mode.** The chart adds `cluster` labels to ServiceMonitor relabeling, recording rules, and alerts. Recording rule aggregations include `cluster` in `by()` clauses. Dashboards show the `cluster` variable. |
| `enabled: true` + `clusterName: ""` | **Externally managed mode.** Only dashboards are modified — the `cluster` variable is shown. Recording rules, alerts, and ServiceMonitor are not modified. Use this when an external tool (e.g. Grafana Alloy) handles cluster label injection and PromQL rewriting. |

To restore the old `cluster` label behavior (not recommended), set `monitoring.appInstanceLabelName` to `cluster`. This may cause confusion in multi-cluster environments and does not align with community conventions.

#### Dashboard architecture changed

Dashboards are now generated from loki-mixin into individual ConfigMap resources (one per dashboard) instead of a single ConfigMap containing all dashboards. The static JSON source files under `src/dashboards/` have been removed.

New dashboard configuration options:
- `monitoring.dashboards.defaultDashboardsTimezone` (default: `utc`)
- `monitoring.dashboards.defaultDashboardsEditable` (default: `true`)
- `monitoring.dashboards.defaultDashboardsInterval` (default: `1m`)
- `monitoring.dashboards.grafanaOperator` — optional deployment via Grafana Operator CRD instead of ConfigMaps
- `monitoring.dashboards.grafanaOperator.instanceSelector` — label selector matching your Grafana instance's labels (default: `{}`)

### From 16.x to 17.0.0 ([#366](https://github.com/grafana-community/helm-charts/pull/366))

The built-in MinIO subchart is now **officially deprecated**. Enabling `minio.enabled=true` now fails chart rendering by default.

Actions required:
1. Configure a dedicated external object storage backend instead of the built-in MinIO dependency (for example: AWS S3, GCS, or Azure Blob). Potential self-hosted S3-compatible options include RustFS and Garage; validate production suitability for your environment before adoption.
2. Deploy a transition release that keeps old MinIO data readable but writes new data to the external store.
3. Keep both stores configured until old data in MinIO has aged out according to retention.
4. Remove the MinIO-related config only after retention has fully elapsed.

Recommended migration values flow:

Before (legacy state using built-in MinIO):

```yaml
minio:
  enabled: true

loki:
  schemaConfig:
    configs:
      - from: "2024-01-01"
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: index_
          period: 24h
```

Transition release (temporary dual-store period):

```yaml
# Temporary escape hatch while migrating
ignoreMinioDeprecation: true
minio:
  enabled: true

loki:
  # Use structuredConfig so you can configure named stores explicitly
  structuredConfig:
    storage_config:
      named_stores:
        aws:
          minio:
            endpoint: '{{ include "loki.minio" $ }}'
            bucketnames: chunks
            secret_access_key: '{{ $.Values.minio.rootPassword }}'
            access_key_id: '{{ $.Values.minio.rootUser }}'
            s3forcepathstyle: true
            insecure: true
          s3-loki-chunks:
            endpoint: 's3.example.com'
            bucketnames: chunks
            access_key_id: '<s3-access-key>'
            secret_access_key: '<s3-secret-key>'
            s3forcepathstyle: true
            insecure: true
    schema_config:
      configs:
        # Keep old data in MinIO readable
        - from: "2024-01-01"
          store: tsdb
          object_store: minio
          schema: v13
          index:
            prefix: index_
            period: 24h
        # Write new data to external S3
        - from: "2026-05-01" # Adjust this date as needed based on your retention period. Should be in the near future
          store: tsdb
          object_store: s3-loki-chunks
          schema: v13
          index:
            prefix: index_
            period: 24h
```

Final release (after retention has elapsed):

The chart still requires `loki.storage.bucketNames` for helper-generated storage sections such as `common.storage` and ruler storage.

```yaml
loki:
  storage:
    bucketNames:
      chunks: chunks
      ruler: ruler
  structuredConfig:
    storage_config:
      named_stores:
        aws:
          s3-loki-chunks:
            endpoint: 's3.example.com'
            bucketnames: chunks
            access_key_id: '<s3-access-key>'
            secret_access_key: '<s3-secret-key>'
            s3forcepathstyle: true
            insecure: true
    schema_config:
      configs:
        - from: "2026-05-01"
          store: tsdb
          object_store: s3-loki-chunks
          schema: v13
          index:
            prefix: index_
            period: 24h
```

Reference docs:
- <https://grafana.com/docs/loki/latest/operations/storage/schema/>
- <https://grafana.com/docs/loki/latest/configure/storage/>
- Potential self-hosted S3-compatible options:
  - RustFS: <https://docs.rustfs.com/installation/docker/>
  - Garage: <https://garagehq.deuxfleurs.fr/documentation/quick-start/>

### From 15.x to 16.0.0 ([#499](https://github.com/grafana-community/helm-charts/pull/499))

The `loki-canary` workload no longer uses the shared Loki pod template. This change isolates canary rendering from Loki component configuration after users reported that shared settings were unintentionally inherited by canary and could break canary startup.

What changed:
- `loki-canary` no longer inherits metadata from `loki.*` values such as `loki.annotations`, `loki.serviceAnnotations`, and `loki.serviceLabels`.
- Canary pod annotations are now sourced only from `lokiCanary.podAnnotations`.
- Canary pod API token mount behavior is now controlled explicitly by `lokiCanary.automountServiceAccountToken`.

Actions required:
- Move canary-specific metadata from `loki.*` keys to `lokiCanary.*` keys.
- If you previously relied on inherited settings, set the canary values explicitly.

Before:

```yaml
loki:
  annotations:
    team: observability
  serviceAnnotations:
    prometheus.io/scrape: "true"
  serviceLabels:
    app: loki
```

After:

```yaml
lokiCanary:
  annotations:
    team: observability
  podAnnotations:
    team: observability
  service:
    annotations:
      prometheus.io/scrape: "true"
    labels:
      app: loki-canary
  automountServiceAccountToken: false
```

### From 14.x to 15.0.0 ([#413](https://github.com/grafana-community/helm-charts/pull/413))

Support for Cilium-specific network policies has been removed from this chart.

Actions required:
- Remove `networkPolicy.flavor` from your values file. The chart now renders Kubernetes `NetworkPolicy` resources only.
- Remove `networkPolicy.egressWorld.enabled` and `networkPolicy.egressKubeApiserver.enabled` from your values file.
- If you relied on Cilium-only behavior, manage those `CiliumNetworkPolicy` rules outside this chart (for example with separate manifests managed by your GitOps workflow).

Before:

```yaml
networkPolicy:
  enabled: true
  flavor: cilium
  egressWorld:
    enabled: true
  egressKubeApiserver:
    enabled: true
```

After:

```yaml
networkPolicy:
  enabled: true
```

### From 13.x to 14.0.0 ([#479](https://github.com/grafana-community/helm-charts/pull/479))

The dot-based registry heuristic has been removed. Previously, if the `repository` value contained a dot (`.`) in its first path segment, the chart assumed it already included a registry and silently skipped prepending `global.imageRegistry` or the service-level `registry`. This caused configured registries to be ignored for image references like `mirror.gcr.io/grafana/loki` or `foo.com/loki-fips`.

**This is now the expected behavior**: when a registry is configured (via `global.imageRegistry` or a component's `image.registry`), it is always prepended unconditionally.
`global.imageRegistry` is intentionally the highest-precedence registry setting and overrides all component-level `image.registry` values.

Actions required:
- If you stored a fully-qualified image reference in `repository` (e.g. `repository: private.registry.com/grafana/loki`) and relied on the dot-heuristic to prevent double-prefixing, split the value into separate `registry` and `repository` fields:

Before:

```yaml
loki:
  image:
    repository: private.registry.com/grafana/loki
```

After:

```yaml
loki:
  image:
    registry: private.registry.com
    repository: grafana/loki
```

Users who only set `repository` to a plain path (e.g. `grafana/loki`) or who use `global.imageRegistry` / `image.registry` correctly are unaffected.

### From 12.x to 13.0.0 ([#258](https://github.com/grafana-community/helm-charts/pull/258))

The persistence configuration for ephemeral volumes has been flattened.

Actions required:
- Replace `persistence.ephemeralDataVolume.enabled: true` with `persistence.enabled: true` and `persistence.type: ephemeral`.
- Move any fields under `persistence.ephemeralDataVolume` (`accessModes`, `size`, `storageClass`, `volumeAttributesClassName`, `selector`, `annotations`, `labels`) directly under `persistence`.

Before:

```yaml
<component>:
  persistence:
    ephemeralDataVolume:
      enabled: true
      accessModes:
        - ReadWriteOnce
      size: 10Gi
      storageClass: null
```

After:

```yaml
<component>:
  persistence:
    enabled: true
    type: ephemeral
    accessModes:
      - ReadWriteOnce
    size: 10Gi
    storageClass: null
```


### From 11.x to 12.0.0 ([#258](https://github.com/grafana-community/helm-charts/pull/258))

The `deploymentMode` default value has been changed to `Monolithic`. `SingleBinary` has been renamed to `Monolithic`.
The old naming `SingleBinary` is still supported. `SimpleScalable` is still supported but will be removed in Loki 4.0.0.

Actions required:
- If you are using `SimpleScalable` deployment mode, you have to explicitly set `deploymentMode: SimpleScalable` in your values file to avoid breaking changes. Consider migrating to `Monolithic` deployment mode as `SimpleScalable` will be removed in Loki 4.0.0.
- If you are using `SingleBinary` deployment mode, you have to explicitly set `deploymentMode: Monolithic` in your values file to avoid breaking changes.

### From 10.x to 11.0.0 ([#273](https://github.com/grafana-community/helm-charts/pull/273))

The `read.legacyReadTarget` option has been removed. Simple scalable deployments always requires a dedicated backend target.

### From 9.x to 10.0.0 ([#270](https://github.com/grafana-community/helm-charts/pull/270))

The `indexGateway.persistence.inMemory` has been replaced with `indexGateway.persistence.dataVolumeParameters` to establish a more consistent configuration for persistence across all components.

Before:

```yaml
indexGateway:
  persistence:
    inMemory: true
    size: 10Gi
```

After:

```yaml
indexGateway:
  persistence:
    dataVolumeParameters:
      emptyDir:
        medium: Memory
        sizeLimit: 10Gi
```

### From 8.x to 9.0.0 ([#187](https://github.com/grafana-community/helm-charts/pull/187))

The `monitoring.selfMonitoring` component has been removed along with `grafana-agent-operator` subchart dependency.  Additionally, loki-canary tenant authentication has been moved as it was located under selfMonitoring.

Actions required:
- `monitoring.selfMonitoring` has been removed because [Grafana Agent is EOL](https://grafana.com/docs/agent/latest/).  Native support for collection and shipment of logs to Loki is no longer supported in the chart.  [Grafana Alloy](https://grafana.com/docs/alloy/latest/) is the successor to Grafana Agent if you're to re-implement the same functionality.
- `monitoring.serviceMonitor.metricsInstance` has been removed as it implemented a (Grafana Agent) CRD object no longer supported.
- loki-canary authentication is now configured via `lokiCanary.tenant.name` and `lokiCanary.tenant.password`.

### From 7.x to 8.0.0 ([#184](https://github.com/grafana-community/helm-charts/pull/184))

Grafana Enterprise Logs (GEL) / Loki Enterprise support has been removed from this chart. This chart is intended for open-source Loki users only.

If you are a GEL user, do not migrate to this chart. The upstream `grafana/loki` chart remains available for GEL users. Consult your Grafana Labs account team about your migration options. See the [migration announcement](https://github.com/grafana/loki/issues/20705) for details.

### From 6.x to 7.0.0 ([#183](https://github.com/grafana-community/helm-charts/pull/183))

Support for deprecated Kubernetes APIs has been dropped. **Kubernetes 1.25 or later is now required.**

Actions required:

- Remove `rbac.pspEnabled` and `rbac.pspAnnotations` from your values file — PodSecurityPolicy support has been removed (PSP was removed in Kubernetes 1.25).
- Ingress resources now use `networking.k8s.io/v1` only; `v1beta1` is no longer supported.
- PodDisruptionBudget resources now use `policy/v1` only.
