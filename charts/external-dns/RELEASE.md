
### Added

- Add value `.service.enabled` to enable the creation of the Kubernetes service. [#6400](https://github.com/kubernetes-sigs/external-dns/pull/6400) @jullianow
- Add value `replicaCount` to set the number of `external-dns` replicas (bounded to `0` or `1`, since external-dns does not support leader election). [#6503](https://github.com/kubernetes-sigs/external-dns/pull/6503) @yugstar
- Add `crd` as a valid `registry` value and grant the matching RBAC on `dnsrecords` for the CRD registry. [#6513](https://github.com/kubernetes-sigs/external-dns/pull/6513) @mloiseleur
- Add value `hostAliases` to inject entries into the `Pod`'s `/etc/hosts`, for reaching a provider or webhook by a hostname that cluster DNS cannot resolve. [#6588](https://github.com/kubernetes-sigs/external-dns/pull/6588) @jetersen

### Changed

- **Breaking:** `policy` no longer defaults to `upsert-only` and is now required. You must set `policy` explicitly to one of `create-only`, `sync`, or `upsert-only`. [#6508](https://github.com/kubernetes-sigs/external-dns/pull/6508) @mloiseleur
- Update _ExternalDNS_ OCI image version to [`v0.22.0`](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.22.0). [#6650](https://github.com/kubernetes-sigs/external-dns/pull/5479) @stevehipwell

### Fixed

- RBAC compliance checkbox for dnsendpoints/status [#6442](https://github.com/kubernetes-sigs/external-dns/pull/6442) @vflaux
