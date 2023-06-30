The following table shows the compatibility of `Jaeger Operator helm chart` with different components, in this particular case we shows Jaeger Operator, Kubernetes and Strimzi operator compatibility. Cert-manager installed or certificate for webhook service in a secret is required in version 2.29.0+ of the helm chart.

| Chart version             | Jaeger Operator | Kubernetes      | Strimzi Operator   | Cert-Manager |
|---------------------------|-----------------|-----------------|--------------------|--------------|
| 2.46.0                    | v1.46.x         | v1.19 to v1.26  | v0.23              | v1.6.1+      |
| 2.45.0                    | v1.45.x         | v1.19 to v1.26  | v0.23              | v1.6.1+      |
| 2.42.0                    | v1.43.x         | v1.19 to v1.26  | v0.23              | v1.6.1+      |
| 2.41.0                    | v1.42.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| (Missing)                 |                 | v1.19 to v1.23  | v0.23              | v1.6.1+      |
| (Missing)                 | v1.41.x         | v1.19 to v1.23  | v0.23              | v1.6.1+      |
| (Missing)                 | v1.40.x         | v1.19 to v1.23  | v0.23              | v1.6.1+      |
| 2.37.0                    | v1.39.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| 2.36.0                    | v1.38.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| 2.35.0                    | v1.37.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| 2.34.0                    | v1.36.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| 2.33.0                    | v1.35.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| 2.32.0(C), 2.32.1, 2.32.2 | v1.34.x         | v1.19 to v1.24  | v0.23              | v1.6.1+      |
| (Missing)                 | v1.33.x         | v1.19 to v1.23  | v0.23              | v1.6.1+      |
| 2.30.0(C), 2.31.0(C)      | v1.32.x         | v1.19 to v1.21  | v0.23              | v1.6.1+      |
| 2.29.0(C)                 | v1.31.x         | v1.19 to v1.21  | v0.23              | v1.6.1+      |
| 2.28.0                    | v1.30.x         | v1.19 to v1.21  | v0.23              |              |
| 2.27.1                    | v1.29.x         | v1.19 to v1.21  | v0.23              |              |
| 2.27.0                    | v1.28.x         | v1.19 to v1.21  | v0.23              |              |
| 2.26.0                    | v1.27.x         | v1.19 to v1.21  | v0.23              |              |
| (Missing)                 | v1.26.x         | v1.19 to v1.21  | v0.23              |              |
| (Missing)                 | v1.25.x         | v1.19 to v1.21  | v0.23              |              |
| 2.23.0, 2.24.0, 2.25.0    | v1.24.x         | v1.19 to v1.21  | v0.23              |              |
| (Missing)                 | v1.23.x         | v1.19 to v1.21  | v0.19, v0.20       |              |
| 2.21.*                    | v1.22.x         | v1.18 to v1.20  | v0.19              |              |
Legend:
- `(C)` Chart is corrupted. Please do not use it, see [link](https://github.com/jaegertracing/helm-charts/issues/351) and [link](https://github.com/jaegertracing/helm-charts/issues/373)
- `(Missing)` Missing chart version for specified Jaeger Operator version