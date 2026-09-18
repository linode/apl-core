# Native nodeSelector for platform apps

- Status: accepted
- Supersedes: [ADR-2022-07-02](2022-07-02-node-affinity.md) (Node affinity)

## Why

The node selector settings allow the user to control where APL pods are scheduled. Currently it relies on Kyverno and does not cover all the core apps. It should be natively supported instead.

## Decision

For every platform app the `nodeSelector` field can be set (if possible through chart values). The node selector can be set by setting `otomi.nodeSelector`. This covers all App Platform managed Helm charts. Team workloads are never touched, `otomi.nodeSelector` only steers platform infrastructure, not tenant pods.

If a chart didn't expose a `nodeSelector` field, we added one (`git-server`, `tekton-triggers`, `tekton-dashboard`, `kubernetes-gateways`, all apl-core's own charts). No mutating webhook is involved anymore.

CNPG database clusters (`otomi-db`) get it too, via the native `spec.affinity.nodeSelector` field. Moving a database is safe. CNPG rolls replicas onto the new nodes first (re-syncing via streaming replication, no downtime), then moves the primary last via `switchover` or `restart`. No data loss as long as storage is network-attached (the platform default), the PVC just reattaches to the new node. A single-instance database has a short outage during the move since there's no replica to fail over to, but the volume and its data are untouched either way.

## Excluded by design

DaemonSets that must run on every node are never given `otomi.nodeSelector`. Doing so would starve non-selected nodes of the thing the DaemonSet provides. This currently means:

- `prometheus-operator-prometheus-node-exporter`: one instance per node scrapes host metrics, restricting it would blind monitoring on every other node.
- the OTEL log collector (`platform-logs-collector`): one instance per node ships that node's logs, restricting it would drop logs from every other node.
- `istio-cni` and `ztunnel`: cluster networking and ambient-mesh dataplane, required on every node regardless of platform node pool.

## Not yet covered

Two apps are still gaps, both because they're vendored charts (`charts/dependencies.yaml`) with no native `nodeSelector` field. Patching them means patching upstream chart templates, not just values, which is a bigger call than this change:

- `knative-operator` and its `operator-webhook` (from `knative.github.io/operator`).
- `tekton-events-controller` (from the `tekton-pipeline` chart, `cdfoundation.github.io/tekton-helm-chart`).


`kubernetes-gateways` provisioned Gateway pods (ingress and the Knative local gateway) are covered via the Istio Gateway API's `infrastructure.parametersRef` ConfigMap, not a plain Deployment field. Same effect, different mechanism.
