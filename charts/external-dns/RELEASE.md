
### Added

- Add value `.fqdnTemplates` to configure [FQDN templates](https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/fqdn-templating) for generating DNS records. [#6394](https://github.com/kubernetes-sigs/external-dns/pull/6394) @Schluggi
- Add value `eventsEmit` to set the _Kubernetes_ events _ExternalDNS_ emits and grant the matching RBAC to create `events.k8s.io` events. [#6817](https://github.com/kubernetes-sigs/external-dns/pull/6817) @dlanov
- Add value `hostUsers` to set the `Pod` `hostUsers` field, so that the `Pod` can run in a [user namespace](https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/). [#6827](https://github.com/kubernetes-sigs/external-dns/pull/6827) @A-RYAN-1

### Changed

- Update bundled `DNSEndpoint` and `DNSRecord` CRDs with admission validation. [#6620](https://github.com/kubernetes-sigs/external-dns/pull/6620) @mloiseleur
- Default `provider.webhook.securityContext` to no privilege escalation, no capabilities and a read-only root filesystem, like the `external-dns` container, so the `Pod` meets the _restricted_ Pod Security Standard. [#6785](https://github.com/kubernetes-sigs/external-dns/pull/6785) @LorbusChris
- Update _ExternalDNS_ OCI image version to [`v0.24.0`](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.24.0). [#6914](https://github.com/kubernetes-sigs/external-dns/pull/6914) @samuelmasuy
