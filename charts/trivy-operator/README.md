# trivy-operator

![Version: 0.18.4](https://img.shields.io/badge/Version-0.18.4-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.16.4](https://img.shields.io/badge/AppVersion-0.16.4-informational?style=flat-square)

Keeps security report resources updated

## Source Code

* <https://github.com/aquasecurity/trivy-operator>

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | affinity set the operator affinity |
| automountServiceAccountToken | bool | `true` | automountServiceAccountToken the flag to enable automount for service account token |
| compliance.cron | string | `"0 */6 * * *"` | cron this flag control the cron interval for compliance report generation |
| compliance.failEntriesLimit | int | `10` | failEntriesLimit the flag to limit the number of fail entries per control check in the cluster compliance detail report |
| compliance.reportType | string | `"summary"` | reportType this flag control the type of report generated (summary or all) |
| excludeNamespaces | string | `""` | excludeNamespaces is a comma separated list of namespaces (or glob patterns) to be excluded from scanning. Only applicable in the all namespaces install mode, i.e. when the targetNamespaces values is a blank string. |
| fullnameOverride | string | `""` | fullnameOverride override operator full name |
| global | object | `{"image":{"registry":""}}` | global values provide a centralized configuration for 'image.registry', reducing the potential for errors. If left blank, the chart will default to the individually set 'image.registry' values |
| image.pullPolicy | string | `"IfNotPresent"` | pullPolicy set the operator pullPolicy |
| image.pullSecrets | list | `[]` | pullSecrets set the operator pullSecrets |
| image.registry | string | `"ghcr.io"` |  |
| image.repository | string | `"aquasecurity/trivy-operator"` |  |
| image.tag | string | `""` | tag is an override of the image tag, which is by default set by the appVersion field in Chart.yaml. |
| managedBy | string | `"Helm"` | managedBy is similar to .Release.Service but allows to overwrite the value |
| nameOverride | string | `""` | nameOverride override operator name |
| nodeCollector.excludeNodes | string | `nil` | excludeNodes comma-separated node labels that the node-collector job should exclude from scanning (example kubernetes.io/arch=arm64,team=dev) |
| nodeCollector.imagePullSecret | string | `nil` | imagePullSecret is the secret name to be used when pulling node-collector image from private registries example : reg-secret It is the user responsibility to create the secret for the private registry in `trivy-operator` namespace |
| nodeCollector.registry | string | `"ghcr.io"` | registry of the node-collector image |
| nodeCollector.repository | string | `"aquasecurity/node-collector"` | repository of the node-collector image |
| nodeCollector.tag | string | `"0.0.8"` | tag version of the node-collector image |
| nodeCollector.volumeMounts | list | `[{"mountPath":"/var/lib/etcd","name":"var-lib-etcd","readOnly":true},{"mountPath":"/var/lib/kubelet","name":"var-lib-kubelet","readOnly":true},{"mountPath":"/var/lib/kube-scheduler","name":"var-lib-kube-scheduler","readOnly":true},{"mountPath":"/var/lib/kube-controller-manager","name":"var-lib-kube-controller-manager","readOnly":true},{"mountPath":"/etc/systemd","name":"etc-systemd","readOnly":true},{"mountPath":"/lib/systemd/","name":"lib-systemd","readOnly":true},{"mountPath":"/etc/kubernetes","name":"etc-kubernetes","readOnly":true},{"mountPath":"/etc/cni/net.d/","name":"etc-cni-netd","readOnly":true}]` | node-collector pod volumeMounts definition for collecting config files information |
| nodeCollector.volumes | list | `[{"hostPath":{"path":"/var/lib/etcd"},"name":"var-lib-etcd"},{"hostPath":{"path":"/var/lib/kubelet"},"name":"var-lib-kubelet"},{"hostPath":{"path":"/var/lib/kube-scheduler"},"name":"var-lib-kube-scheduler"},{"hostPath":{"path":"/var/lib/kube-controller-manager"},"name":"var-lib-kube-controller-manager"},{"hostPath":{"path":"/etc/systemd"},"name":"etc-systemd"},{"hostPath":{"path":"/lib/systemd"},"name":"lib-systemd"},{"hostPath":{"path":"/etc/kubernetes"},"name":"etc-kubernetes"},{"hostPath":{"path":"/etc/cni/net.d/"},"name":"etc-cni-netd"}]` | node-collector pod volumes definition for collecting config files information |
| nodeSelector | object | `{}` | nodeSelector set the operator nodeSelector |
| operator.accessGlobalSecretsAndServiceAccount | bool | `true` | accessGlobalSecretsAndServiceAccount The flag to enable access to global secrets/service accounts to allow `vulnerability scan job` to pull images from private registries |
| operator.batchDeleteDelay | string | `"10s"` | batchDeleteDelay the duration to wait before deleting another batch of config audit reports. |
| operator.batchDeleteLimit | int | `10` | batchDeleteLimit the maximum number of config audit reports deleted by the operator when the plugin's config has changed. |
| operator.builtInTrivyServer | bool | `false` | builtInTrivyServer The flag enable the usage of built-in trivy server in cluster ,its also override the following trivy params with built-in values trivy.mode = ClientServer and serverURL = http://<serverServiceName>.<trivy operator namespace>:4975 |
| operator.clusterComplianceEnabled | bool | `true` | clusterComplianceEnabled the flag to enable cluster compliance scanner |
| operator.configAuditScannerEnabled | bool | `true` | configAuditScannerEnabled the flag to enable configuration audit scanner |
| operator.configAuditScannerScanOnlyCurrentRevisions | bool | `true` | configAuditScannerScanOnlyCurrentRevisions the flag to only create config audit scans on the current revision of a deployment. |
| operator.controllerCacheSyncTimeout | string | `"5m"` | controllerCacheSyncTimeout the duration to wait for controller resources cache sync (default: 5m). |
| operator.exposedSecretScannerEnabled | bool | `true` | exposedSecretScannerEnabled the flag to enable exposed secret scanner |
| operator.infraAssessmentScannerEnabled | bool | `true` | infraAssessmentScannerEnabled the flag to enable infra assessment scanner |
| operator.leaderElectionId | string | `"trivyoperator-lock"` | leaderElectionId determines the name of the resource that leader election will use for holding the leader lock. |
| operator.logDevMode | bool | `false` | logDevMode the flag to enable development mode (more human-readable output, extra stack traces and logging information, etc) |
| operator.mergeRbacFindingWithConfigAudit | bool | `false` | mergeRbacFindingWithConfigAudit the flag to enable merging rbac finding with config-audit report |
| operator.metricsConfigAuditInfo | bool | `false` | MetricsConfigAuditInfo the flag to enable metrics about configuration audits be aware of metrics cardinality is significantly increased with this feature enabled. |
| operator.metricsExposedSecretInfo | bool | `false` | MetricsExposedSecretInfo the flag to enable metrics about exposed secrets be aware of metrics cardinality is significantly increased with this feature enabled. |
| operator.metricsFindingsEnabled | bool | `true` | metricsFindingsEnabled the flag to enable metrics for findings |
| operator.metricsInfraAssessmentInfo | bool | `false` | MetricsInfraAssessmentInfo the flag to enable metrics about Infra Assessment be aware of metrics cardinality is significantly increased with this feature enabled. |
| operator.metricsRbacAssessmentInfo | bool | `false` | MetricsRbacAssessmentInfo the flag to enable metrics about Rbac Assessment be aware of metrics cardinality is significantly increased with this feature enabled. |
| operator.metricsVulnIdEnabled | bool | `false` | metricsVulnIdEnabled the flag to enable metrics about cve vulns id be aware of metrics cardinality is significantly increased with this feature enabled. |
| operator.namespace | string | `""` | namespace to install the operator, defaults to the .Release.Namespace |
| operator.podLabels | object | `{}` | additional labels for the operator pod |
| operator.privateRegistryScanSecretsNames | object | `{}` | privateRegistryScanSecretsNames is map of namespace:secrets, secrets are comma seperated which can be used to authenticate in private registries in case if there no imagePullSecrets provided example : {"mynamespace":"mySecrets,anotherSecret"} |
| operator.rbacAssessmentScannerEnabled | bool | `true` | rbacAssessmentScannerEnabled the flag to enable rbac assessment scanner |
| operator.replicas | int | `1` | replicas the number of replicas of the operator's pod |
| operator.revisionHistoryLimit | string | `nil` | number of old history to retain to allow rollback (if not set, default Kubernetes value is set to 10) |
| operator.sbomGenerationEnabled | bool | `true` | the flag to enable sbom generation |
| operator.scanJobTTL | string | `""` | scanJobTTL the set automatic cleanup time after the job is completed |
| operator.scanJobTimeout | string | `"5m"` | scanJobTimeout the length of time to wait before giving up on a scan job |
| operator.scanJobsConcurrentLimit | int | `10` | scanJobsConcurrentLimit the maximum number of scan jobs create by the operator |
| operator.scanJobsRetryDelay | string | `"30s"` | scanJobsRetryDelay the duration to wait before retrying a failed scan job |
| operator.scanNodeCollectorLimit | int | `1` | scanNodeCollectorLimit the maximum number of node collector jobs create by the operator |
| operator.scannerReportTTL | string | `"24h"` | scannerReportTTL the flag to set how long a report should exist. "" means that the ScannerReportTTL feature is disabled |
| operator.trivyServerHealthCheckCacheExpiration | string | `"10h"` | trivyServerHealthCheckCacheExpiration The flag to set the interval for trivy server health cache before it invalidate |
| operator.vulnerabilityScannerEnabled | bool | `true` | the flag to enable vulnerability scanner |
| operator.vulnerabilityScannerScanOnlyCurrentRevisions | bool | `true` | vulnerabilityScannerScanOnlyCurrentRevisions the flag to only create vulnerability scans on the current revision of a deployment. |
| operator.webhookBroadcastTimeout | string | `"30s"` | webhookBroadcastTimeout the flag to set timeout for webhook requests if webhookBroadcastURL is enabled |
| operator.webhookBroadcastURL | string | `""` | webhookBroadcastURL the flag to set reports should be sent to a webhook endpoint. "" means that the webhookBroadcastURL feature is disabled |
| operator.webhookSendDeletedReports | bool | `false` | webhookSendDeletedReports the flag to enable sending deleted reports if webhookBroadcastURL is enabled |
| podAnnotations | object | `{}` | podAnnotations annotations added to the operator's pod |
| podSecurityContext | object | `{}` |  |
| priorityClassName | string | `""` | priorityClassName set the operator priorityClassName |
| rbac.create | bool | `true` |  |
| resources | object | `{}` |  |
| securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true}` | securityContext security context |
| service | object | `{"annotations":{},"headless":true,"metricsPort":80}` | service only expose a metrics endpoint for prometheus to scrape, trivy-operator does not have a user interface. |
| service.annotations | object | `{}` | annotations added to the operator's service |
| serviceAccount.annotations | object | `{}` |  |
| serviceAccount.create | bool | `true` | Specifies whether a service account should be created. |
| serviceAccount.name | string | `""` | name specifies the name of the k8s Service Account. If not set and create is true, a name is generated using the fullname template. |
| serviceMonitor.annotations | object | `{}` | Additional annotations for the serviceMonitor |
| serviceMonitor.enabled | bool | `false` | enabled determines whether a serviceMonitor should be deployed |
| serviceMonitor.endpointAdditionalProperties | object | `{}` | EndpointAdditionalProperties allows setting additional properties on the endpoint such as relabelings, metricRelabelings etc. |
| serviceMonitor.honorLabels | bool | `true` | HonorLabels chooses the metric’s labels on collisions with target labels |
| serviceMonitor.interval | string | `nil` | Interval at which metrics should be scraped. If not specified Prometheus’ global scrape interval is used. |
| serviceMonitor.labels | object | `{}` | Additional labels for the serviceMonitor |
| serviceMonitor.namespace | string | `nil` | The namespace where Prometheus expects to find service monitors |
| targetNamespaces | string | `""` | targetNamespace defines where you want trivy-operator to operate. By default, it's a blank string to select all namespaces, but you can specify another namespace, or a comma separated list of namespaces. |
| targetWorkloads | string | `"pod,replicaset,replicationcontroller,statefulset,daemonset,cronjob,job"` | targetWorkloads is a comma seperated list of Kubernetes workload resources to be included in the vulnerability and config-audit scans if left blank, all workload resources will be scanned |
| tolerations | list | `[]` | tolerations set the operator tolerations |
| trivy.additionalVulnerabilityReportFields | string | `""` | additionalVulnerabilityReportFields is a comma separated list of additional fields which can be added to the VulnerabilityReport. Supported parameters: Description, Links, CVSS, Target, Class, PackagePath and PackageType |
| trivy.clientServerSkipUpdate | bool | `false` | clientServerSkipUpdate is the flag to enable skip databases update for Trivy client. Only applicable in ClientServer mode. |
| trivy.command | string | `"image"` | command. One of `image`, `filesystem` or `rootfs` scanning, depending on the target type required for the scan. For 'filesystem' and `rootfs` scanning, ensure that the `trivyOperator.scanJobPodTemplateContainerSecurityContext` is configured to run as the root user (runAsUser = 0). |
| trivy.createConfig | bool | `true` | createConfig indicates whether to create config objects |
| trivy.dbRegistry | string | `"ghcr.io"` |  |
| trivy.dbRepository | string | `"aquasecurity/trivy-db"` |  |
| trivy.dbRepositoryInsecure | string | `"false"` | The Flag to enable insecure connection for downloading trivy-db via proxy (air-gaped env)  |
| trivy.debug | bool | `false` | debug One of `true` or `false`. Enables debug mode. |
| trivy.githubToken | string | `nil` | githubToken is the GitHub access token used by Trivy to download the vulnerabilities database from GitHub. Only applicable in Standalone mode. |
| trivy.httpProxy | string | `nil` | httpProxy is the HTTP proxy used by Trivy to download the vulnerabilities database from GitHub. |
| trivy.httpsProxy | string | `nil` | httpsProxy is the HTTPS proxy used by Trivy to download the vulnerabilities database from GitHub. |
| trivy.ignoreFile | string | `nil` | ignoreFile can be used to tell Trivy to ignore vulnerabilities by ID (one per line) |
| trivy.ignoreUnfixed | bool | `false` | ignoreUnfixed is the flag to show only fixed vulnerabilities in vulnerabilities reported by Trivy. Set to true to enable it.  |
| trivy.image.imagePullSecret | string | `nil` | imagePullSecret is the secret name to be used when pulling trivy image from private registries example : reg-secret It is the user responsibility to create the secret for the private registry in `trivy-operator` namespace |
| trivy.image.pullPolicy | string | `"IfNotPresent"` | pullPolicy is the imge pull policy used for trivy image , valid values are (Always, Never, IfNotPresent) |
| trivy.image.registry | string | `"ghcr.io"` | registry of the Trivy image |
| trivy.image.repository | string | `"aquasecurity/trivy"` | repository of the Trivy image |
| trivy.image.tag | string | `"0.45.1"` | tag version of the Trivy image |
| trivy.insecureRegistries | object | `{}` | The registry to which insecure connections are allowed. There can be multiple registries with different keys. |
| trivy.javaDbRegistry | string | `"ghcr.io"` | javaDbRegistry is the registry for the Java vulnerability database. |
| trivy.javaDbRepository | string | `"aquasecurity/trivy-java-db"` |  |
| trivy.mode | string | `"Standalone"` | mode is the Trivy client mode. Either Standalone or ClientServer. Depending on the active mode other settings might be applicable or required. |
| trivy.noProxy | string | `nil` | noProxy is a comma separated list of IPs and domain names that are not subject to proxy settings. |
| trivy.nonSslRegistries | object | `{}` | Registries without SSL. There can be multiple registries with different keys. |
| trivy.offlineScan | bool | `false` | offlineScan is the flag to enable the offline scan functionality in Trivy This will prevent outgoing HTTP requests, e.g. to search.maven.org |
| trivy.podLabels | string | `nil` | podLabels is the extra pod labels to be used for trivy server |
| trivy.priorityClassName | string | `""` | priorityClassName is the name of the priority class used for trivy server |
| trivy.registry | object | `{"mirror":{}}` | Mirrored registries. There can be multiple registries with different keys. Make sure to quote registries containing dots |
| trivy.resources | object | `{"limits":{"cpu":"500m","memory":"500M"},"requests":{"cpu":"100m","memory":"100M"}}` | resources resource requests and limits for scan job containers |
| trivy.server.podSecurityContext | object | `{"fsGroup":65534,"runAsNonRoot":true,"runAsUser":65534}` | podSecurityContext set trivy-server podSecurityContext |
| trivy.server.replicas | int | `1` | the number of replicas of the trivy-server |
| trivy.server.resources | object | `{"limits":{"cpu":1,"memory":"1Gi"},"requests":{"cpu":"200m","memory":"512Mi"}}` | resources set trivy-server resource |
| trivy.server.securityContext | object | `{"privileged":false,"readOnlyRootFilesystem":true}` | securityContext set trivy-server securityContext |
| trivy.serverCustomHeaders | string | `nil` | serverCustomHeaders is a comma separated list of custom HTTP headers sent by Trivy client to Trivy server. Only applicable in ClientServer mode. |
| trivy.serverInsecure | bool | `false` | serverInsecure is the flag to enable insecure connection to the Trivy server. |
| trivy.serverPassword | string | `""` | serverPassword this param is the server user to be used to download db from private registry |
| trivy.serverServiceName | string | `"trivy-service"` | serverServiceName this param is the server service name to be used in cluster |
| trivy.serverToken | string | `nil` | serverToken is the token to authenticate Trivy client with Trivy server. Only applicable in ClientServer mode. |
| trivy.serverTokenHeader | string | `"Trivy-Token"` | serverTokenHeader is the name of the HTTP header used to send the authentication token to Trivy server. Only application in ClientServer mode when trivy.serverToken is specified. |
| trivy.serverUser | string | `""` | serverUser this param is the server user to be used to download db from private registry |
| trivy.severity | string | `"UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL"` | severity is a comma separated list of severity levels reported by Trivy. |
| trivy.skipDirs | string | `nil` | a comma separated list of directories for Trivy to skip |
| trivy.skipJavaDBUpdate | bool | `false` | skipJavaDBUpdate is the flag to enable skip Java index databases update for Trivy client. |
| trivy.slow | bool | `true` | slow this flag is to use less CPU/memory for scanning though it takes more time than normal scanning. It fits small-footprint |
| trivy.sslCertDir | string | `nil` | sslCertDir can be used to override the system default locations for SSL certificate files directory, example: /ssl/certs |
| trivy.storageClassEnabled | bool | `true` | whether to use a storage class for trivy server or emptydir (one mey want to use ephemeral storage) |
| trivy.storageClassName | string | `""` | storageClassName is the name of the storage class to be used for trivy server PVC. If empty, tries to find default storage class |
| trivy.supportedConfigAuditKinds | string | `"Workload,Service,Role,ClusterRole,NetworkPolicy,Ingress,LimitRange,ResourceQuota"` | The Flag is the list of supported kinds separated by comma delimiter to be scanned by the config audit scanner  |
| trivy.timeout | string | `"5m0s"` | timeout is the duration to wait for scan completion. |
| trivy.useBuiltinRegoPolicies | string | `"true"` | The Flag to enable the usage of builtin rego policies by default  |
| trivy.vulnType | string | `nil` | vulnType can be used to tell Trivy to filter vulnerabilities by a pkg-type (library, os) |
| trivyOperator.additionalReportLabels | string | `""` | additionalReportLabels comma-separated representation of the labels which the user wants the scanner pods to be labeled with. Example: `foo=bar,env=stage` will labeled the reports with the labels `foo: bar` and `env: stage` |
| trivyOperator.configAuditReportsPlugin | string | `"Trivy"` | configAuditReportsPlugin the name of the plugin that generates config audit reports. |
| trivyOperator.metricsResourceLabelsPrefix | string | `"k8s_label_"` | metricsResourceLabelsPrefix Prefix that will be prepended to the labels names indicated in `reportResourceLabels` when including them in the Prometheus metrics |
| trivyOperator.policiesConfig | string | `""` | policiesConfig Custom Rego Policies to be used by the config audit scanner See https://github.com/aquasecurity/trivy-operator/blob/main/docs/tutorials/writing-custom-configuration-audit-policies.md for more details. |
| trivyOperator.reportRecordFailedChecksOnly | bool | `true` | reportRecordFailedChecksOnly flag is to record only failed checks on misconfiguration reports (config-audit and rbac assessment) |
| trivyOperator.reportResourceLabels | string | `""` | reportResourceLabels comma-separated scanned resource labels which the user wants to include in the Prometheus metrics report. Example: `owner,app` |
| trivyOperator.scanJobAnnotations | string | `""` | scanJobAnnotations comma-separated representation of the annotations which the user wants the scanner pods to be annotated with. Example: `foo=bar,env=stage` will annotate the scanner pods with the annotations `foo: bar` and `env: stage` |
| trivyOperator.scanJobAutomountServiceAccountToken | bool | `false` | scanJobAutomountServiceAccountToken the flag to enable automount for service account token on scan job |
| trivyOperator.scanJobCompressLogs | bool | `true` | scanJobCompressLogs control whether scanjob output should be compressed or plain |
| trivyOperator.scanJobNodeSelector | object | `{}` | scanJobNodeSelector nodeSelector to be applied to the scanner pods so that they can run on nodes with matching labels |
| trivyOperator.scanJobPodPriorityClassName | string | `""` | scanJobPodPriorityClassName Priority class name to be set on the pods created by trivy operator jobs. This accepts a string value |
| trivyOperator.scanJobPodTemplateContainerSecurityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true}` | scanJobPodTemplateContainerSecurityContext SecurityContext the user wants the scanner and node collector containers (and their initContainers) to be amended with. |
| trivyOperator.scanJobPodTemplateLabels | string | `""` | scanJobPodTemplateLabels comma-separated representation of the labels which the user wants the scanner pods to be labeled with. Example: `foo=bar,env=stage` will labeled the scanner pods with the labels `foo: bar` and `env: stage` |
| trivyOperator.scanJobPodTemplatePodSecurityContext | object | `{}` | scanJobPodTemplatePodSecurityContext podSecurityContext the user wants the scanner and node collector pods to be amended with. Example:   RunAsUser: 10000   RunAsGroup: 10000   RunAsNonRoot: true |
| trivyOperator.scanJobTolerations | list | `[]` | scanJobTolerations tolerations to be applied to the scanner pods and node-collector so that they can run on nodes with matching taints |
| trivyOperator.skipInitContainers | bool | `false` | skipInitContainers when this flag is set to true, the initContainers will be skipped for the scanner and node collector pods |
| trivyOperator.skipResourceByLabels | string | `""` | skipResourceByLabels comma-separated labels keys which trivy-operator will skip scanning on resources with matching labels |
| trivyOperator.vulnerabilityReportsPlugin | string | `"Trivy"` | vulnerabilityReportsPlugin the name of the plugin that generates vulnerability reports `Trivy` |
| volumeMounts | list | `[]` |  |
| volumes | list | `[]` |  |

