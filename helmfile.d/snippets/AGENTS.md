# helmfile.d/snippets/ — Core Templates & Values

## OVERVIEW
Core configuration layer defining the platform's 3-stage values merge and release templates.

## FILE INVENTORY
| File | Purpose |
|------|---------|
| `defaults.yaml` | Stage 1: Static defaults for ALL apps (1203 lines). |
| `env.gotmpl` | Stage 2: Loads user values from `$ENV_DIR/env/**/*.yaml`. |
| `derived.gotmpl` | Stage 3: Computes `_derived.*` values (URLs, certs, gateways). |
| `templates.gotmpl` | Defines release anchors (`*default`, `*raw`, `*rawCR`, `*jobs`). |
| `common.gotmpl` | Shared values for releases (pull secrets, node selectors). |
| `routes.gotmpl` | HTTPRoute template for Gateway API routing and auth. |
| `domains.gotmpl` | Domain configuration and normalization helpers. |
| `authpolicy-jwt.gotmpl` | JWT authentication policy template. |
| `authpolicy-oauth2-ext.gotmpl` | OAuth2 external auth policy template. |
| `serviceentry.gotmpl` | Istio ServiceEntry for internal-to-external domain routing. |
| `alertmanager.gotmpl` | Platform-level Alertmanager configuration. |
| `alertmanager-teams.gotmpl` | Per-team Alertmanager configuration. |
| `alertmanager/opsgenie.gotmpl` | Opsgenie integration template for Alertmanager. |
| `alertmanager/slack.gotmpl` | Slack integration template for Alertmanager. |
| `blackbox-targets.gotmpl` | Targets for Prometheus blackbox prober. |
| `defaults.gotmpl` | Helper for loading default values in Go templates. |
| `grafana.gotmpl` | Grafana-specific configuration snippets. |
| `sops-env.gotmpl` | SOPS-encrypted environment variable loader. |
| `env.old.gotmpl` | Legacy environment loading (DEPRECATED). |
| `version-tags.gotmpl` | Component version mapping for platform services. |
| `provider-engine-map.gotmpl` | Maps cloud providers to specific engines. |
| `dockercfg.gotmpl` | Docker registry credential configuration. |
| `helmfile-utils.gotmpl` | Common Go template utilities for Helmfile specs. |

## CRITICAL FILES
1.  **`defaults.yaml`**: The source of truth for platform defaults. EVERY new app must register its default state, resources, and configuration here. It is the largest and most foundational file in the snippets directory, defining the initial state for the 3-stage merge.
2.  **`derived.gotmpl`**: Computes complex values from raw user input and defaults. Crucial for understanding how OIDC URLs, TLS secrets, and gateway names are formed. It acts as the "logical" layer that transforms user intent into platform-specific configuration.
3.  **`templates.gotmpl`**: Central registry of release patterns. Modifying an anchor here affects EVERY helmfile release that references it. It provides the standard `*default`, `*raw`, and `*jobs` building blocks used across all `helmfile-*.yaml` specs.

## TEMPLATE HELPERS
- **Routing**: `routes.gotmpl` handles the mapping of hostnames to services with integrated Istio AuthPolicy support for Gateway API.
- **Domains**: `domains.gotmpl` provides functions to compute admin and team application domains consistently across the platform using cluster-level settings.
- **Monitoring**: `alertmanager/*.gotmpl` contains integration-specific templates for Slack and Opsgenie, while `blackbox-targets.gotmpl` manages probe targets for health monitoring.
- **Versions**: `version-tags.gotmpl` ensures consistent component versioning across all platform services and Helm charts.
- **Utility**: `helmfile-utils.gotmpl` contains generic helpers for string manipulation and template rendering.

## ANTI-PATTERNS
- **Hardcoding**: Never hardcode values that belong in `defaults.yaml` or `derived.gotmpl`.
- **Direct Snippet Writes**: AI agents should never write temporary data to this directory.
- **Circular Logic**: Avoid cross-referencing between snippets that causes template recursion.
- **Stage Violation**: Don't put logic in `env.gotmpl` that belongs in `derived.gotmpl`.
- **Legacy Use**: Avoid modifying or using `env.old.gotmpl`; use the modern `env.gotmpl` instead.
