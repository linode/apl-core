# Architectural Decision Log

This log lists the architectural decisions for apl-core.

<!-- adrlog -- Regenerate the content by using "npm run adr". -->

- [ADR-2020-10-01](2020-10-01-github-workflow.md) - Our GitHub workflow
- [ADR-2020-10-02](2020-10-02-docker-compose.md) - docker compose
- [ADR-2020-11-06](2020-11-06-bash-style-guide.md) - Bash coding standard
- [ADR-2020-11-06](2020-11-06-konstraint-policy-library.md) - Konstraint library to support Common Rego Language definitions
- [ADR-2021-10-18](2021-10-18-defaults-and-derived.md) - Derived values
- [ADR-2021-10-28](2021-10-28-internal-values.md) - Internal values
- [ADR-2022-03-24](2022-03-24-custom-ca.md) - urice:
- [ADR-2022-04-22](2022-04-22-values-migration.md) - Values migration
- [ADR-2022-04-23](2022-04-23-pre-upgrade.md) - A new otomi pre-upgrade command
- [ADR-2022-05-17](2022-05-17-destroy-upon-uninstall.md) - Extra flags to accomodate destroy upon uninstall
- [ADR-2022-06-07](2022-06-07-ingress-classes.md) - Ingress classes *(superseded by ADR-2026-05-20)*
- [ADR-2022-07-02](2022-07-02-node-affinity.md) - Node affinity
- [ADR-2022-08-26](2022-08-26-other-dns-provider.md) - Other DNS provider
- [ADR-2026-06-12](2026-06-12-auth-policy-pod-label.md) - Auth policy pod label (`otomi.io/auth-policy`)
- [ADR-2026-06-25](2026-06-25-drop-sops-for-sealedsecrets.md) - Drop SOPS in favour of SealedSecrets
- [ADR-2026-06-25](2026-06-25-manifests-directory.md) - Manifests directory in the values repo
- [ADR-2026-06-25](2026-06-25-git-server-as-default-values-repo.md) - git-server as the default values repository backend
- [ADR-2026-05-20](2026-05-20-gateway-api.md) - Kubernetes Gateway API replaces Ingress CR and Istio IngressGateway
- [ADR-2026-06-25](2026-06-25-git-credential-management.md) - Git credential management via Kubernetes Secret
- [ADR-2026-07-07](2026-07-07-apl-addons-argocd-project.md) - apl-addons ArgoCD project for platform-admin addon deployments

<!-- adrlogstop -->

For new ADRs, please use [template.md](.template.md) as basis.
More information on MADR is available at <https://adr.github.io/madr/>.
General information about architectural decision records is available at <https://adr.github.io/>.
