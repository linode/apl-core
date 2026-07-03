# Kubernetes Gateway API replaces Ingress CR and Istio IngressGateway

- Status: accepted, supersedes [ADR-2022-06-07](2022-06-07-ingress-classes.md)
- Deciders: merll, j-zimnowoda

Technical Story: [#3246](https://github.com/linode/apl-core/pull/3246)

## Context and Problem Statement

APL previously exposed platform and team services through ingress-nginx (handling the `Ingress` CR) fronting an Istio IngressGateway (handling mesh-internal routing via `VirtualService`). The two-controller chain proved unstable — the link between nginx and the Istio gateway produced intermittent routing failures. Beyond the instability, the `networking.k8s.io/v1 Ingress` CR is a maintained-for-compatibility resource: it lacks the expressiveness needed for traffic splitting, header manipulation, and CNAME-based listeners, and ingress-nginx has no native understanding of the service mesh.

## Decision Drivers

- The `Ingress` CR is a legacy dead-end; ingress-nginx does not interoperate natively with Istio and requires a fragile two-controller chain to route traffic through the mesh.
- The Kubernetes Gateway API reached GA (v1.0, 2023) and Istio adopted it as its primary routing surface, making it the supported long-term path for service exposure.

## Considered Options

- Keep ingress-nginx + Istio `VirtualService` (status quo)
- Kubernetes Gateway API (`Gateway` / `HTTPRoute`) with Istio as the `GatewayClass` implementation

## Decision Outcome

Chosen option: **Kubernetes Gateway API with Istio**, because it eliminates the unstable nginx→Istio bridge, aligns with the upstream-supported routing model, and gives a single consistent API for both platform and team traffic.

### Positive Consequences

- Single routing layer: `HTTPRoute` resources reference Istio `Gateway` objects directly — no intermediate nginx controller.
- Richer routing primitives (traffic splitting, header manipulation, path matching) are first-class in the API, not annotation hacks.
- Alignment with the Kubernetes ecosystem: Gateway API is the endorsed successor to `Ingress` and is implemented natively by Istio.
- The `kubernetes-gateways` chart bundles Gateway API CRDs, making the dependency explicit and version-controlled.

## Pros and Cons of the Options

### Keep ingress-nginx + Istio VirtualService

- Good, because it was the existing setup with known operational behaviour.
- Bad, because the bridge between ingress-nginx and the Istio gateway was unstable and caused intermittent routing failures.
- Bad, because `Ingress` CR provides no native traffic-splitting, CNAME listeners, or mesh-aware routing.
- Bad, because it requires maintaining two separate controller stacks (ingress-nginx + Istio) with overlapping responsibilities.

### Kubernetes Gateway API with Istio

- Good, because it removes the unstable two-controller chain.
- Good, because `HTTPRoute` is a first-class Kubernetes API resource with rich, extensible semantics.
- Good, because Istio is the `GatewayClass` implementation, so the mesh and the ingress layer are the same system.

## Links

- Supersedes [ADR-2022-06-07](2022-06-07-ingress-classes.md) — Ingress classes
