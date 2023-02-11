# Trivy-Operator

Kubernetes-native security toolkit helm chart installation

## Introduction

This chart bootstraps a Trivy-operator deployment on a [Kubernetes](http://kubernetes.io) cluster using the
[Helm](https://helm.sh) package manager.

## Prerequisites

- Kubernetes 1.12+
- Helm 3+

Install the operator in the `trivy-system` namespace and configure it to select all namespaces,
except `trivy-system`:

1. Install the chart from the Aqua chart repository:

   ```
   helm install trivy-operator aqua/trivy-operator \
     --namespace trivy-system \
     --create-namespace \
     --set="trivy.ignoreUnfixed=true" \
     --version {{ var.chart_version }}
   ```

   There are many values in the chart that can be set to configure Trivy-Operator.

## Configuration

You can configure Trivy-Operator to control it's behavior and adapt it to your needs. Aspects of the operator machinery are configured using environment variables on the operator Pod, while aspects of the scanning behavior are controlled by ConfigMaps and Secrets.

## Operator Configuration

| NAME                                                         | DEFAULT                | DESCRIPTION                                                                                                                                                                                                  |
|--------------------------------------------------------------|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `OPERATOR_NAMESPACE`                                         | N/A                    | See [Install modes](#install-modes)                                                                                                                                                                          |
| `OPERATOR_TARGET_NAMESPACES`                                 | N/A                    | See [Install modes](#install-modes)                                                                                                                                                                          |
| `OPERATOR_EXCLUDE_NAMESPACES`                                | N/A                    | A comma separated list of namespaces (or glob patterns) to be excluded from scanning in all namespaces [Install mode](#install-modes).                                                                       |
 | `OPERATOR_TARGET_WORKLOADS`                                  | All workload resources | A comma seperated list of Kubernetes workloads to be included in the vulnerability and config-audit scans                                                                                                    |
| `OPERATOR_SERVICE_ACCOUNT`                                   | `trivy-operator`       | The name of the service account assigned to the operator's pod                                                                                                                                               |
| `OPERATOR_LOG_DEV_MODE`                                      | `false`                | The flag to use (or not use) development mode (more human-readable output, extra stack traces and logging information, etc).                                                                                 |
| `OPERATOR_SCAN_JOB_TIMEOUT`                                  | `5m`                   | The length of time to wait before giving up on a scan job                                                                                                                                                    |
| `OPERATOR_CONCURRENT_SCAN_JOBS_LIMIT`                        | `10`                   | The maximum number of scan jobs create by the operator                                                                                                                                                       |
| `OPERATOR_SCAN_JOB_RETRY_AFTER`                              | `30s`                  | The duration to wait before retrying a failed scan job                                                                                                                                                       |
| `OPERATOR_BATCH_DELETE_LIMIT`                                | `10`                   | The maximum number of config audit reports deleted by the operator when the plugin's config has changed.                                                                                                     |
| `OPERATOR_BATCH_DELETE_DELAY`                                | `10s`                  | The duration to wait before deleting another batch of config audit reports.                                                                                                                                  |
| `OPERATOR_METRICS_BIND_ADDRESS`                              | `:8080`                | The TCP address to bind to for serving [Prometheus][prometheus] metrics. It can be set to `0` to disable the metrics serving.                                                                                |
| `OPERATOR_HEALTH_PROBE_BIND_ADDRESS`                         | `:9090`                | The TCP address to bind to for serving health probes, i.e. `/healthz/` and `/readyz/` endpoints.                                                                                                             |
| `OPERATOR_VULNERABILITY_SCANNER_ENABLED`                     | `true`                 | The flag to enable vulnerability scanner                                                                                                                                                                     |
| `OPERATOR_CONFIG_AUDIT_SCANNER_ENABLED`                      | `false`                | The flag to enable configuration audit scanner                                                                                                                                                               |
| `OPERATOR_RBAC_ASSESSMENT_SCANNER_ENABLED`                   | `true`                 | The flag to enable rbac assessment scanner                                                                                                                                                                   |
| `OPERATOR_CONFIG_AUDIT_SCANNER_SCAN_ONLY_CURRENT_REVISIONS`  | `true`                 | The flag to enable config audit scanner to only scan the current revision of a deployment                                                                                                                    |
| `OPERATOR_CONFIG_AUDIT_SCANNER_BUILTIN`                      | `true`                 | The flag to enable built-in configuration audit scanner                                                                                                                                                      |
| `OPERATOR_VULNERABILITY_SCANNER_SCAN_ONLY_CURRENT_REVISIONS` | `true`                 | The flag to enable vulnerability scanner to only scan the current revision of a deployment                                                                                                                   |
| `OPERATOR_ACCESS_GLOBAL_SECRETS_SERVICE_ACCOUNTS`            | `true`                 | The flag to enable access to global secrets/service accounts to allow `vulnerability scan job` to pull images from private registries  
| `OPERATOR_SCANNER_REPORT_TTL`                                | `"24h"`                | The flag to set how long a report should exist. When a old report is deleted a new one will be created by the controller. It can be set to `""` to disabled the TTL for vulnerability scanner. |
| `OPERATOR_LEADER_ELECTION_ENABLED`                           | `false`                | The flag to enable operator replica leader election                                                                                                                                                          |
| `OPERATOR_LEADER_ELECTION_ID`                                | `trivy-operator-lock`  | The name of the resource lock for leader election                                                                                                                                                            |
| `OPERATOR_EXPOSED_SECRET_SCANNER_ENABLED`                    | `true`                 | The flag to enable exposed secret scanner                                                                                                                                                                    |
| `OPERATOR_WEBHOOK_BROADCAST_URL`                             | `""`                   | The flag to enable operator reports to be sent to a webhook endpoint. "" means that this feature is disabled                                                                                                 |
| `OPERATOR_BUILT_IN_TRIVY_SERVER`                             | `false`                | The flag enable the usage of built-in trivy server in cluster ,its also overwrite the following trivy params with built-in values trivy.mode = ClientServer and serverURL = <http://[server> Service Name].[trivy Operator Namespace]:4975
| `TRIVY_SERVER_HEALTH_CHECK_CACHE_EXPIRATION`                 | `10h`                  | The flag to set the interval for trivy server health cache before it invalidate
| `OPERATOR_WEBHOOK_BROADCAST_TIMEOUT`                         | `30s`                  | The flag to set operator webhook timeouts, if webhook broadcast is enabled                                                                                                                                   |
| `OPERATOR_PRIVATE_REGISTRY_SCAN_SECRETS_NAMES`               | `{}`                   | The flag is map of namespace:secrets, secrets are comma seperated which can be used to authenticate in private registries in case if there no imagePullSecrets provided example : {"mynamespace":"mySecrets,anotherSecret"}                                                                                                                   |
| `OPERATOR_MERGE_RBAC_FINDING_WITH_CONFIG_AUDIT`              | `false`                | The flag to enable merging rbac finding with config-audit report

The values of the `OPERATOR_NAMESPACE` and `OPERATOR_TARGET_NAMESPACES` determine the install mode, which in turn determines the multitenancy support of the operator.

| MODE| OPERATOR_NAMESPACE | OPERATOR_TARGET_NAMESPACES | DESCRIPTION|
|---|---|---|---|
| OwnNamespace| `operators`| `operators`| The operator can be configured to watch events in the namespace it is deployed in.                             |
| SingleNamespace| `operators`| `foo`| The operator can be configured to watch for events in a single namespace that the operator is not deployed in. |
| MultiNamespace| `operators`| `foo,bar,baz`| The operator can be configured to watch for events in more than one namespace.                                 |
| AllNamespaces| `operators`| (blank string)| The operator can be configured to watch for events in all namespaces.|

## Scanning configuration

| CONFIGMAP KEY| DEFAULT| DESCRIPTION                                                                                                                                                                                                                                                                                     |
|---|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `vulnerabilityReports.scanner`| `Trivy`| The name of the plugin that generates vulnerability reports. Either `Trivy` or `Aqua`.                                                                                                                                                                                                          |
| `vulnerabilityReports.scanJobsInSameNamespace` | `"false"`| Whether to run vulnerability scan jobs in same namespace of workload. Set `"true"` to enable.                                                                                                                                                                                                   |
| `scanJob.tolerations`| N/A| JSON representation of the [tolerations] to be applied to the scanner pods and node-collector so that they can run on nodes with matching taints. Example: `'[{"key":"key1", "operator":"Equal", "value":"value1", "effect":"NoSchedule"}]'`                                                                       |
| `scanJob.nodeSelector`| N/A| JSON representation of the [nodeSelector] to be applied to the scanner pods so that they can run on nodes with matching labels. Example: `'{"example.com/node-type":"worker", "cpu-type": "sandylake"}'`                                                                                        |
| `scanJob.automountServiceAccountToken`         | `"false"`   | the flag to enable automount for service account token on scan job. Set `"true"` to enable.                                                                                                                                                                                                     |
| `scanJob.annotations`| N/A| One-line comma-separated representation of the annotations which the user wants the scanner pods to be annotated with. Example: `foo=bar,env=stage` will annotate the scanner pods with the annotations `foo: bar` and `env: stage`                                                             |
| `scanJob.templateLabel`| N/A| One-line comma-separated representation of the template labels which the user wants the scanner pods to be labeled with. Example: `foo=bar,env=stage` will labeled the scanner pods with the labels `foo: bar` and `env: stage`                                                                 |
| `scanJob.podTemplatePodSecurityContext`| N/A| One-line JSON representation of the template securityContext which the user wants the scanner pods to be secured with. Example: `{"RunAsUser": 1000, "RunAsGroup": 1000, "RunAsNonRoot": true}`                                                                                                 |
| `scanJob.podTemplateContainerSecurityContext`| N/A| One-line JSON representation of the template securityContext which the user wants the scanner containers (and their initContainers) to be amended with. Example: `{"allowPrivilegeEscalation": false, "capabilities": { "drop": ["ALL"]},"privileged": false, "readOnlyRootFilesystem": true }` |
| `report.resourceLabels`| N/A| One-line comma-separated representation of the scanned resource labels which the user wants to include in the Prometheus metrics report. Example: `owner,app,tier`|
| `metrics.resourceLabelsPrefix`| `k8s_label`| Prefix that will be prepended to the labels names indicated in `report.ResourceLabels` when including them in the Prometheus metrics|
|`report.recordFailedChecksOnly`| `"true"`| this flag is to record only failed checks on misconfiguration reports (config-audit and rbac assessment)
| `skipResourceByLabels`| N/A| One-line comma-separated labels keys which trivy-operator will skip scanning on resources with matching labels. Example: `test,transient`|
| `node.collector.imageRef`             | ghcr.io/aquasecurity/node-collector:0.0.5                | The imageRef use for node-collector job .                                                                                                                                                                                                                                                                                                               |

## Trivy Configuration

| CONFIGMAP KEY                         | DEFAULT                            | DESCRIPTION                                                                                                                                                                                                                                                                                                                                                                           |
|---------------------------------------|------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `trivy.repository`                    | `ghcr.io/aquasecurity/trivy`       | Repository of the Trivy image                                                                                                                                                                                                                                                                                                                                                         |
| `trivy.tag`                           | `0.36.0`                           | Version of the Trivy image
| `trivy.imagePullSecret`               | N/A                                | imagePullSecret is the secret name to be used when pulling trivy image from private registries example: `reg-secret`. It is the user responsibility to create the secret for the private registry in `trivy-operator` namespace.                                                                                                                                                                                                                                                                                    |
| `trivy.dbRepository`                  | `ghcr.io/aquasecurity/trivy-db`    | External OCI Registry to download the vulnerability database                                                                                                                                                                                                                                                                                                                          |
| `trivy.dbRepositoryInsecure`          | `false`                            | The Flag to enable insecure connection for downloading trivy-db via proxy (air-gaped env)                                                                                                                                                                                                                                                                                             |
| `trivy.mode`                          | `Standalone`                       | Trivy client mode. Either `Standalone` or `ClientServer`. Depending on the active mode other settings might be applicable or required.                                                                                                                                                                                                                                                |
| `additionalVulnerabilityReportFields` | N/A                                | A comma separated list of additional fields which can be added to the VulnerabilityReport. Possible values: `Description,Links,CVSS,Target,Class,PackageType`. Description will add more data about vulnerability. Links - all the references to a specific vulnerability. CVSS - data about CVSSv2/CVSSv3 scoring and vectors. Target - vulnerable element. Class - OS or library vulnerability  |
| `trivy.command`                       | `image`                            | command. One of `image`, `filesystem` or `rootfs` scanning. Depending on the target type required for the scan.                                                                                                                                                                                                                                                                                 |
| `trivy.slow`                          | `true`                            | this flag is to use less CPU/memory for scanning though it takes more time than normal scanning. It fits small-footprint                                                                                                        |
| `trivy.severity`                      | `UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL` | A comma separated list of severity levels reported by Trivy                                                                                                                                                                                                                                                                                                                           |
| `trivy.ignoreUnfixed`                 | N/A                                | Whether to show only fixed vulnerabilities in vulnerabilities reported by Trivy. Set to `"true"` to enable it.                                                                                                                                                                                                                                                                        |
| `trivy.offlineScan`                   | N/A                                | Whether to enable the offline scan mode of Trivy preventing outgoing calls, e.g. to <search.maven.org> for additional vulnerability information. Set to `"true"` to enable it.                                                                                                                                                                                                        |
| `trivy.skipFiles`                     | N/A                                | A comma separated list of file paths for Trivy to skip traversal.                                                                                                                                                                                                                                                                                                                     |
| `trivy.skipDirs`                      | N/A                                | A comma separated list of directories for Trivy to skip traversal.                                                                                                                                                                                                                                                                                                                    |
| `trivy.ignoreFile`                    | N/A                                | It specifies the `.trivyignore` file which contains a list of vulnerability IDs to be ignored from vulnerabilities reported by Trivy.                                                                                                                                                                                                                                                 |
| `trivy.ignorePolicy`                  | N/A                                | It specifies a fallback [policy](https://aquasecurity.github.io/trivy/latest/docs/vulnerability/examples/filter/#by-open-policy-agent) file which allows to customize which vulnerabilities are reported by Trivy.                                                                                                                                                                    |
| `trivy.ignorePolicy.{ns}`             | N/A                                | It specifies a namespace specific [policy](https://aquasecurity.github.io/trivy/latest/docs/vulnerability/examples/filter/#by-open-policy-agent) file which allows to customize which vulnerabilities are reported by Trivy.                                                                                                                                                          |
| `trivy.ignorePolicy.{ns}.{wl}`        | N/A                                | It specifies a namespace/workload specific [policy](https://aquasecurity.github.io/trivy/latest/docs/vulnerability/examples/filter/#by-open-policy-agent) file which allows to customize which vulnerabilities are reported by Trivy.                                                                                                                                                 |
| `trivy.timeout`                       | `5m0s`                             | The duration to wait for scan completion                                                                                                                                                                                                                                                                                                                                              |
| `trivy.serverURL`                     | N/A                                | The endpoint URL of the Trivy server. Required in `ClientServer` mode.                                                                                                                                                                                                                                                                                                                |
| `trivy.serverTokenHeader`             | `Trivy-Token`                      | The name of the HTTP header to send the authentication token to Trivy server. Only application in `ClientServer` mode when `trivy.serverToken` is specified.                                                                                                                                                                                                                          |
| `trivy.serverInsecure`                | N/A                                | The Flag to enable insecure connection to the Trivy server.                                                                                                                                                                                                                                                                                                                           |
| `trivy.insecureRegistry.<id>`         | N/A                                | The registry to which insecure connections are allowed. There can be multiple registries with different registry `<id>`.                                                                                                                                                                                                                                                              |
| `trivy.nonSslRegistry.<id>`           | N/A                                | A registry without SSL. There can be multiple registries with different registry `<id>`.                                                                                                                                                                                                                                                                                              |
| `trivy.registry.mirror.<registry>`    | N/A                                | Mirror for the registry `<registry>`, e.g. `trivy.registry.mirror.index.docker.io: mirror.io` would use `mirror.io` to get images originated from `index.docker.io`                                                                                                                                                                                                                   |
| `trivy.httpProxy`                     | N/A                                | The HTTP proxy used by Trivy to download the vulnerabilities database from GitHub.                                                                                                                                                                                                                                                                                                    |
| `trivy.httpsProxy`                    | N/A                                | The HTTPS proxy used by Trivy to download the vulnerabilities database from GitHub.                                                                                                                                                                                                                                                                                                   |
| `trivy.noProxy`                       | N/A                                | A comma separated list of IPs and domain names that are not subject to proxy settings.                                                                                                                                                                                                                                                                                                |
| `trivy.resources.requests.cpu`        | `100m`                             | The minimum amount of CPU required to run Trivy scanner pod.                                                                                                                                                                                                                                                                                                                          |
| `trivy.resources.requests.memory`     | `100M`                             | The minimum amount of memory required to run Trivy scanner pod.                                                                                                                                                                                                                                                                                                                       |
| `trivy.resources.limits.cpu`          | `500m`                             | The maximum amount of CPU allowed to run Trivy scanner pod.                                                                                                                                                                                                                                                                                                                           |
| `trivy.resources.limits.memory`       | `500M`                             | The maximum amount of memory allowed to run Trivy scanner pod.                                                                                                                                                                                                                                                                                                                        |

| SECRET KEY| DESCRIPTION|
|---|---|
| `trivy.githubToken`| The GitHub access token used by Trivy to download the vulnerabilities database from GitHub. Only applicable in `Standalone` mode. |
| `trivy.serverToken`| The token to authenticate Trivy client with Trivy server. Only applicable in `ClientServer` mode.|
| `trivy.serverCustomHeaders`| A comma separated list of custom HTTP headers sent by Trivy client to Trivy server. Only applicable in `ClientServer` mode.|

## Install as Helm dependency

There are cases, when potential chart developers want to add the operator as dependency. An example would be the creation of an umbrella chart for an application, which depends on 3d-party charts.

In this case, It maybe not suitable to install the Trivy Operator in the same namespace as the main application. Instead, we can use the Helm value `operator.namespace` to define a namespace where only the operator will be installed. The Operator chart will then either create a new namespace if not existing or use the existing one.

## Uninstall

You can uninstall the operator with the following command:

```
helm uninstall trivy-operator -n trivy-system
```

You have to manually delete custom resource definitions created by the `helm install` command:

!!! danger
    Deleting custom resource definitions will also delete all security reports generated by the operator.

    ```
    kubectl delete crd vulnerabilityreports.aquasecurity.github.io
    kubectl delete crd configauditreports.aquasecurity.github.io
    kubectl delete crd clusterconfigauditreports.aquasecurity.github.io
    kubectl delete crd rbacassessmentreports.aquasecurity.github.io
    kubectl delete crd infraassessmentreports.aquasecurity.github.io
    kubectl delete crd clusterrbacassessmentreports.aquasecurity.github.io
    ```
