# Gitea Helm Chart — Copilot Instructions

## Project Overview

Kubernetes Helm chart for deploying [Gitea](https://gitea.com). Uses Go/Helm templating (`templates/`), YAML values (`values.yaml`), and includes sub-charts for PostgreSQL, PostgreSQL-HA, Valkey, and Valkey-cluster.

## Build & Test

```bash
make readme            # Regenerate README.md parameter table + lint
make unittests-helm    # Run Helm unit tests (helm-unittest plugin required)
make unittests-bash    # Run bash/bats script tests (requires git submodule init)
make unittests         # Both of the above
```

Always run `make readme` after changing `values.yaml` `@param` annotations.
Always run `make unittests-helm` after changing templates or unit tests.

## Conventions

### values.yaml

- Use `## @param path.to.key Description` annotations for every user-facing value. These drive the auto-generated README parameter table.
- Property ordering within a resource block: `enabled`, `annotations`, `labels` first, then type-specific fields.
- Top-level keys are sorted alphabetically within their section group.
- Use [Helm Values](https://docs.renovatebot.com/modules/manager/helm-values/#additional-information) pattern from renovatebot. Ensure that the attributes `registry`, `repository` and `tag` are available as part of the dict `image`. For example:

```yaml
image:
  registry: docker.io
  repository: library/busybox
  tag: 0.1.0
```

### Templates

- Helm templates live in `templates/gitea/`. Helpers live in `templates/_helpers.tpl`.
- Use camelCase for all files and variables (e.g `httpRoute`, `backendTLSPolicy`, `gatewayAPI`, `statefulSet`).
- Use `include "gitea.fullname"` for naming resources.
- Use `fail` for required-value validation with clear error messages referencing the full values path.
- Ensure, that the attributes `annotations`, `labels`, `name` and `namespace` are alphabetically sorted.
- Render all attributes, even if they are empty, to prevent drift in Argo CD. For example, `labels` must be rendered, while `annotations` are defined as `yaml:"annotations,omitempty"`.
- Use plural for `*.tpl` files, because they may contain functions for multiple resources of the same kind (e.g. `_services.tpl` for `httpService.yaml` or `sshService.yaml`, `_backendTLSPolicies.tpl` for `backendTLSPolicy.yaml`).

### Unit Tests

- Helm unit tests live in `unittests/helm/` mirroring the template structure.
- Test files are YAML using the [helm-unittest](https://github.com/helm-unittest/helm-unittest) format.
- Each test must set all required values explicitly — do not rely on cross-test state.
- The `values.yaml` file must pass `yamllint`. The configuration is in `.yamllint`. Use `make yamllint` to run the linter.

### Commits & PRs

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for PR titles and commit messages (e.g. `feat:`, `fix:`, `refactor:`, `docs:`, `style:`).
- See `CONTRIBUTING.md` for full PR requirements.
- Explain in detail why a change is needed, not just what the change is. Include links to relevant issues, PRs, or external references.
- Add co-authors for any contributions that are not your own. Use the `Co-authored-by:` trailer in the commit message.

### Documentation

- `docs/` contains topic-specific guides (e.g. `gateway-api.md`, `ha-setup.md`).
- `README.md` parameter tables are auto-generated — never edit them manually.
