# policy-reporter

Policy Reporter watches for PolicyReport Resources.
It creates Prometheus Metrics and can send rule validation events to different targets like Loki, Elasticsearch, Slack or Discord

![Version: 3.7.2](https://img.shields.io/badge/Version-3.7.2-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 3.7.2](https://img.shields.io/badge/AppVersion-3.7.2-informational?style=flat-square)

## Documentation

You can find detailed Information and Screens about Features and Configurations in the [Documentation](https://kyverno.github.io/policy-reporter-docs).

## Installation with Helm v3

Installation via Helm Repository

### Add the Helm repository
```bash
helm repo add policy-reporter https://kyverno.github.io/policy-reporter
helm repo update
```

### Basic Installation

The basic installation provides an Prometheus Metrics Endpoint and different REST APIs, for more details have a look at the [Documentation](https://kyverno.github.io/policy-reporter/guide/02-getting-started).

```bash
helm install policy-reporter policy-reporter/policy-reporter -n policy-reporter --create-namespace
```

## Policy Reporter UI

You can use the Policy Reporter as standalone Application along with the optional UI SubChart.

### Installation with Policy Reporter UI and Kyverno Plugin enabled

```bash
helm install policy-reporter policy-reporter/policy-reporter --set plugin.kyverno.enabled=true --set ui.enabled=true -n policy-reporter --create-namespace
kubectl port-forward service/policy-reporter-ui 8082:8080 -n policy-reporter
```
Open `http://localhost:8082/` in your browser.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| nameOverride | string | `""` | Override the chart name used for all resources |
| fullnameOverride | string | `"policy-reporter"` | Overwrite the fullname of all resources |
| namespaceOverride | string | `""` | Overwrite the namespace of all resources |
| apiVersionOverride | object | `{"podDisruptionBudget":""}` | Overwrite apiVersion for specific resources |
| image.registry | string | `"ghcr.io"` | Image registry |
| image.repository | string | `"kyverno/policy-reporter"` | Image repository |
| image.pullPolicy | string | `"IfNotPresent"` | Image pullPolicy |
| image.tag | string | `nil` | Image tag |
| imagePullSecrets | list | `[]` | Image pullSecrets |
| priorityClassName | string | `""` | Deployment priorityClassName |
| replicaCount | int | `1` | Deployment replica count |
| revisionHistoryLimit | int | `10` | The number of revisions to keep |
| updateStrategy | object | `{}` | Deployment strategy |
| port | object | `{"name":"http","number":8080}` | Container port |
| annotations | object | `{}` | Key/value pairs that are attached to all resources. |
| rbac.enabled | bool | `true` | Create RBAC resources |
| serviceAccount.create | bool | `true` | Create ServiceAccount |
| serviceAccount.automount | bool | `true` | Enable ServiceAccount automount |
| serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| serviceAccount.name | string | `""` | The ServiceAccount name |
| service.enabled | bool | `true` | Create Service |
| service.type | string | `"ClusterIP"` | Service type |
| service.port | int | `8080` | Service port |
| service.annotations | object | `{}` | Service annotations |
| service.labels | object | `{}` | Service labels |
| podSecurityContext | object | `{"fsGroup":1234}` | Security context for the pod |
| securityContext.runAsUser | int | `1234` |  |
| securityContext.runAsNonRoot | bool | `true` |  |
| securityContext.privileged | bool | `false` |  |
| securityContext.allowPrivilegeEscalation | bool | `false` |  |
| securityContext.readOnlyRootFilesystem | bool | `true` |  |
| securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| podAnnotations | object | `{}` | Additional annotations to add to each pod |
| podLabels | object | `{}` | Additional labels to add to each pod |
| selectorLabels | object | `{}` | Custom selector labels, overwrites the default set |
| resources | object | `{}` | Resource constraints |
| networkPolicy.enabled | bool | `false` | Create NetworkPolicy |
| networkPolicy.egress | list | `[{"ports":[{"port":6443,"protocol":"TCP"}],"to":null}]` | Egress rule to allow Kubernetes API Server access |
| networkPolicy.ingress | list | `[]` |  |
| ingress.enabled | bool | `false` | Create Ingress This ingress exposes the policy-reporter core app. |
| ingress.className | string | `""` | Ingress className |
| ingress.labels | object | `{}` | Labels for the Ingress |
| ingress.annotations | object | `{}` | Annotations for the Ingress |
| ingress.hosts | string | `nil` | Ingress host list |
| ingress.tls | list | `[]` | Ingress tls list |
| httproute.enabled | bool | `false` | Enable HTTPRoute resource (Gateway API alternative to Ingress) Requires Gateway API CRDs (v1) installed in cluster https://gateway-api.sigs.k8s.io/ |
| httproute.labels | object | `{}` | Additional HTTPRoute labels |
| httproute.annotations | object | `{}` | Additional HTTPRoute annotations |
| httproute.parentRefs | list | `[]` | Gateway API parentRefs (list of Gateway references) Must reference an existing Gateway resource |
| httproute.hostnames | list | `[]` | List of hostnames for HTTPRoute |
| httproute.rules | list | `[{"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | HTTPRoute rules configuration Allows advanced routing with matches and filters |
| logging.server | bool | `false` | Enables server access logging |
| logging.encoding | string | `"console"` | Log encoding possible encodings are console and json |
| logging.logLevel | int | `0` | Log level default info |
| rest.enabled | bool | `false` | Enables the REST API |
| metrics.enabled | bool | `false` | Enables Prometheus Metrics |
| metrics.mode | string | `"detailed"` | Metric Mode allows to customize labels Allowed values: detailed, simple, custom |
| metrics.customLabels | list | `[]` | List of used labels in custom mode Supported fields are: ["namespace", "rule", "policy", "report" // Report name, "kind" // resource kind, "name" // resource name, "status", "severity", "category", "source"] |
| metrics.filter | object | `{}` | Filter results to reduce cardinality |
| profiling.enabled | bool | `false` | Enable profiling with pprof |
| worker | int | `5` | Amount of queue workers for Report resource processing |
| reportFilter | object | `{}` | Filter Report resources to process |
| sourceConfig | list | `[]` | Customize source specific logic like result ID generation |
| sourceFilters[0].selector.sources | list | `["kyverno","KyvernoValidatingPolicy","KyvernoImageValidatingPolicy"]` | select Report by source |
| sourceFilters[0].uncontrolledOnly | bool | `true` | Filter out Reports of controlled Pods and Jobs, only works for Reports with scope resource |
| sourceFilters[0].disableClusterReports | bool | `false` | Filter out cluster scoped Reports |
| sourceFilters[0].kinds | object | `{"exclude":["ReplicaSet"]}` | Filter out Reports based on the scope resource kind |
| global.labels | object | `{}` | additional labels added on each resource |
| basicAuth.username | string | `""` | HTTP BasicAuth username |
| basicAuth.password | string | `""` | HTTP BasicAuth password |
| basicAuth.secretRef | optional | `""` | Secret reference to get username and/or password from |
| emailReports.clusterName | optional | `""` | - Displayed in the email report if configured |
| emailReports.titlePrefix | string | `"Report"` | Title prefix in the email subject |
| emailReports.resources | object | `{}` | Resource constraints for the created CronJobs |
| emailReports.smtp.secret | optional | `""` | Secret reference to provide the complete or partial SMTP configuration |
| emailReports.smtp.host | string | `""` | SMTP Server Host |
| emailReports.smtp.port | int | `465` | SMTP Server Port |
| emailReports.smtp.username | string | `""` | SMTP Username |
| emailReports.smtp.password | string | `""` | SMTP Password |
| emailReports.smtp.from | string | `""` | Displayed from email address |
| emailReports.smtp.encryption | string | `""` | SMTP Encryption Default is none, supports ssl/tls and starttls |
| emailReports.smtp.skipTLS | bool | `false` | Skip SMTP TLS verification |
| emailReports.smtp.certificate | string | `""` | SMTP Server Certificate file path |
| emailReports.summary.enabled | bool | `false` | Enable Summary E-Mail reports |
| emailReports.summary.schedule | string | `"0 8 * * *"` | CronJob schedule |
| emailReports.summary.activeDeadlineSeconds | int | `300` | CronJob activeDeadlineSeconds |
| emailReports.summary.backoffLimit | int | `3` | CronJob backoffLimit |
| emailReports.summary.ttlSecondsAfterFinished | int | `0` | CronJob ttlSecondsAfterFinished |
| emailReports.summary.restartPolicy | string | `"Never"` | CronJob restartPolicy |
| emailReports.summary.to | list | `[]` | List of receiver email addresses |
| emailReports.summary.filter | optional | `{}` | Report filter |
| emailReports.summary.channels | optional | `[]` | Channels can be used to to send only a subset of namespaces / sources to dedicated email addresses |
| emailReports.violations.enabled | bool | `false` | Enable Violation Summary E-Mail reports |
| emailReports.violations.schedule | string | `"0 8 * * *"` | CronJob schedule |
| emailReports.violations.activeDeadlineSeconds | int | `300` | CronJob activeDeadlineSeconds |
| emailReports.violations.backoffLimit | int | `3` | CronJob backoffLimit |
| emailReports.violations.ttlSecondsAfterFinished | int | `0` | CronJob ttlSecondsAfterFinished |
| emailReports.violations.restartPolicy | string | `"Never"` | CronJob restartPolicy |
| emailReports.violations.to | list | `[]` | List of receiver email addresses |
| emailReports.violations.filter | optional | `{}` | Report filter |
| emailReports.violations.channels | optional | `[]` | Channels can be used to to send only a subset of namespaces / sources to dedicated email addresses |
| existingTargetConfig.enabled | bool | `false` | Use an already existing configuration |
| existingTargetConfig.name | string | `""` | Name of the secret with the config |
| existingTargetConfig.subPath | string | `""` | SubPath within the secret (defaults to config.yaml) |
| target.crd | bool | `false` | enable and install TargetConfig CRD |
| target.loki.host | string | `""` | Host Address |
| target.loki.path | string | `""` | Loki API, defaults to "/loki/api/v1/push" |
| target.loki.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.loki.skipTLS | bool | `false` | Skip TLS verification |
| target.loki.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.loki.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.loki.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.loki.sources | list | `[]` | List of sources which should send |
| target.loki.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.loki.customFields | object | `{}` | Added as additional labels |
| target.loki.headers | object | `{}` | Additional HTTP Headers |
| target.loki.username | string | `""` | HTTP BasicAuth username |
| target.loki.password | string | `""` | HTTP BasicAuth password |
| target.loki.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.loki.channels | list | `[]` | List of channels to route results to different configurations |
| target.elasticsearch.host | string | `""` | Host address |
| target.elasticsearch.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.elasticsearch.skipTLS | bool | `false` | Skip TLS verification |
| target.elasticsearch.headers | object | `{}` | Additional HTTP Headers |
| target.elasticsearch.index | string | `"policy-reporter"` | Elasticsearch index (default: policy-reporter) |
| target.elasticsearch.rotation | string | `"daily"` | Elasticsearch index rotation and index suffix Possible values: daily, monthly, annually, none (default: daily) |
| target.elasticsearch.typelessApi | bool | `false` | Enables Elasticsearch typless API https://www.elastic.co/blog/moving-from-types-to-typeless-apis-in-elasticsearch-7-0 keeping as false for retrocompatibility. |
| target.elasticsearch.username | string | `""` | HTTP BasicAuth username |
| target.elasticsearch.password | string | `""` | HTTP BasicAuth password |
| target.elasticsearch.apiKey | string | `""` | Elasticsearch API Key for api key authentication |
| target.elasticsearch.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.elasticsearch.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.elasticsearch.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.elasticsearch.sources | list | `[]` | List of sources which should send |
| target.elasticsearch.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.elasticsearch.customFields | object | `{}` | Added as additional labels |
| target.elasticsearch.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.elasticsearch.channels | list | `[]` | List of channels to route results to different configurations |
| target.slack.webhook | string | `""` | Webhook Address |
| target.slack.channel | string | `""` | Slack Channel |
| target.slack.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.slack.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.slack.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.slack.sources | list | `[]` | List of sources which should send |
| target.slack.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.slack.customFields | object | `{}` | Added as additional labels |
| target.slack.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.slack.channels | list | `[]` | List of channels to route results to different configurations |
| target.discord.webhook | string | `""` | Webhook Address |
| target.discord.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.discord.skipTLS | bool | `false` | Skip TLS verification |
| target.discord.headers | object | `{}` | Additional HTTP Headers |
| target.discord.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.discord.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.discord.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.discord.sources | list | `[]` | List of sources which should send |
| target.discord.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.discord.customFields | object | `{}` | Added as additional labels |
| target.discord.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.discord.channels | list | `[]` | List of channels to route results to different configurations |
| target.teams.webhook | string | `""` | Webhook Address |
| target.teams.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.teams.skipTLS | bool | `false` | Skip TLS verification |
| target.teams.headers | object | `{}` | Additional HTTP Headers |
| target.teams.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.teams.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.teams.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.teams.sources | list | `[]` | List of sources which should send |
| target.teams.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.teams.customFields | object | `{}` | Added as additional labels |
| target.teams.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.teams.channels | list | `[]` | List of channels to route results to different configurations |
| target.webhook.webhook | string | `""` | Webhook Address |
| target.webhook.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.webhook.skipTLS | bool | `false` | Skip TLS verification |
| target.webhook.headers | object | `{}` | Additional HTTP Headers |
| target.webhook.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.webhook.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.webhook.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.webhook.sources | list | `[]` | List of sources which should send |
| target.webhook.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.webhook.customFields | object | `{}` | Added as additional labels |
| target.webhook.keepalive | object | `{"interval":"0","params":{}}` | Keepalive configuration |
| target.webhook.keepalive.interval | string | `"0"` | Duration string like "30s" for heartbeat interval, '0' - disabled |
| target.webhook.keepalive.params | object | `{}` | Additional parameters to include in heartbeat payload |
| target.webhook.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.webhook.channels | list | `[]` | List of channels to route results to different configurations |
| target.telegram.token | string | `""` | Telegram bot token |
| target.telegram.chatId | string | `""` | Telegram chat id |
| target.telegram.host | optional | `""` | Telegram proxy host |
| target.telegram.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.telegram.skipTLS | bool | `false` | Skip TLS verification |
| target.telegram.headers | object | `{}` | Additional HTTP Headers |
| target.telegram.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.telegram.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.telegram.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.telegram.sources | list | `[]` | List of sources which should send |
| target.telegram.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.telegram.customFields | object | `{}` | Added as additional labels |
| target.telegram.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.telegram.channels | list | `[]` | List of channels to route results to different configurations |
| target.googleChat.webhook | string | `""` | Webhook Address |
| target.googleChat.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.googleChat.skipTLS | bool | `false` | Skip TLS verification |
| target.googleChat.headers | object | `{}` | Additional HTTP Headers |
| target.googleChat.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.googleChat.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.googleChat.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.googleChat.sources | list | `[]` | List of sources which should send |
| target.googleChat.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.googleChat.customFields | object | `{}` | Added as additional labels |
| target.googleChat.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.googleChat.channels | list | `[]` | List of channels to route results to different configurations |
| target.jira.host | string | `""` | JIRA server URL |
| target.jira.username | string | `""` | JIRA username |
| target.jira.password | string | `""` | JIRA password (use password or apiToken, not both) |
| target.jira.apiToken | string | `""` | JIRA API token (use password or apiToken, not both) |
| target.jira.apiVersion | string | `"v3"` | JIRA static labels |
| target.jira.projectKey | string | `""` | JIRA project key |
| target.jira.issueType | string | `""` | JIRA issue type (default: "Bug") |
| target.jira.components | list | `[]` | JIRA component names list |
| target.jira.labels | list | `[]` | JIRA static labels |
| target.jira.summaryTemplate | string | `""` | JIRA summary go template, available values: result, customfield default: "{{ if result.ResourceString }}{{ result.ResourceString }}: {{ end }}Policy Violation: {{ result.Policy }}" |
| target.jira.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.jira.skipTLS | bool | `false` | Skip TLS verification |
| target.jira.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.jira.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.jira.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.jira.sources | list | `[]` | List of sources which should send |
| target.jira.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.jira.customFields | object | `{}` | Added as additional labels |
| target.jira.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.jira.channels | list | `[]` | List of channels to route results to different configurations |
| target.alertManager.host | string | `""` | host address |
| target.alertManager.certificate | string | `""` | Server Certificate file path Can be added under extraVolumes |
| target.alertManager.skipTLS | bool | `false` | Skip TLS verification |
| target.alertManager.headers | object | `{}` | Additional HTTP Headers |
| target.alertManager.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.alertManager.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.alertManager.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.alertManager.sources | list | `[]` | List of sources which should send |
| target.alertManager.skipExistingOnStartup | bool | `true` | Skip already existing PolicyReportResults on startup |
| target.alertManager.customFields | object | `{}` | Added as additional labels |
| target.alertManager.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.alertManager.channels | list | `[]` | List of channels to route results to different configurations |
| target.s3.accessKeyId | optional | `""` | S3 Access key |
| target.s3.secretAccessKey | optional | `""` | S3 SecretAccess key |
| target.s3.region | optional | `""` | S3 Storage region |
| target.s3.endpoint | optional | `""` | S3 Storage endpoint |
| target.s3.bucket | required | `""` | S3 Storage bucket name |
| target.s3.bucketKeyEnabled | bool | `false` | S3 Storage to use an S3 Bucket Key for object encryption with SSE-KMS |
| target.s3.kmsKeyId | string | `""` | S3 Storage KMS Key ID for object encryption with SSE-KMS |
| target.s3.serverSideEncryption | string | `""` | S3 Storage server-side encryption algorithm used when storing this object in Amazon S3, AES256, aws:kms |
| target.s3.pathStyle | bool | `false` | S3 Storage, force path style configuration |
| target.s3.prefix | string | `""` | Used prefix, keys will have format: s3://<bucket>/<prefix>/YYYY-MM-DD/YYYY-MM-DDTHH:mm:ss.s+01:00.json |
| target.s3.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.s3.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.s3.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.s3.sources | list | `[]` | List of sources which should send |
| target.s3.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.s3.customFields | object | `{}` | Added as additional labels |
| target.s3.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.s3.channels | list | `[]` | List of channels to route results to different configurations |
| target.kinesis.accessKeyId | optional | `""` | Access key |
| target.kinesis.secretAccessKey | optional | `""` | SecretAccess key |
| target.kinesis.region | optional | `""` | Region |
| target.kinesis.endpoint | optional | `""` | Endpoint |
| target.kinesis.streamName | required | `""` | StreamName |
| target.kinesis.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.kinesis.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.kinesis.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.kinesis.sources | list | `[]` | List of sources which should send |
| target.kinesis.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.kinesis.customFields | object | `{}` | Added as additional labels |
| target.kinesis.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.kinesis.channels | list | `[]` | List of channels to route results to different configurations |
| target.securityHub.accessKeyId | optional | `""` | Access key |
| target.securityHub.secretAccessKey | optional | `""` | SecretAccess key |
| target.securityHub.region | optional | `""` | Region |
| target.securityHub.endpoint | optional | `""` | Endpoint |
| target.securityHub.accountId | required | `""` | AccountId |
| target.securityHub.productName | optional | `""` | Used product name, defaults to "Polilcy Reporter" |
| target.securityHub.companyName | optional | `""` | Used company name, defaults to "Kyverno" |
| target.securityHub.synchronize | bool | `true` | Enable cleanup listener for SecurityHub |
| target.securityHub.delayInSeconds | int | `2` | Delay between AWS GetFindings API calls, to avoid hitting the API RequestLimit |
| target.securityHub.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.securityHub.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.securityHub.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.securityHub.sources | list | `[]` | List of sources which should send |
| target.securityHub.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.securityHub.customFields | object | `{}` | Added as additional labels |
| target.securityHub.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.securityHub.channels | list | `[]` | List of channels to route results to different configurations |
| target.gcs.credentials | optional | `""` | GCS (Google Cloud Storage) Service Account Credentials |
| target.gcs.bucket | required | `""` | GCS Bucket |
| target.gcs.secretRef | string | `""` | Read configuration from an already existing Secret |
| target.gcs.mountedSecret | string | `""` | Mounted secret path by Secrets Controller, secret should be in json format |
| target.gcs.minimumSeverity | string | `""` | Minimum severity: "" < info < low < medium < high < critical |
| target.gcs.sources | list | `[]` | List of sources which should send |
| target.gcs.skipExistingOnStartup | bool | `true` | Skip already existing report results on startup |
| target.gcs.customFields | object | `{}` | Added as additional labels |
| target.gcs.filter | object | `{}` | Filter Results which should send to this target Wildcars for namespaces and policies are supported, you can either define exclude or include values Filters are available for all targets except the UI |
| target.gcs.channels | list | `[]` | List of channels to route results to different configurations |
| leaderElection.releaseOnCancel | bool | `true` |  |
| leaderElection.leaseDuration | int | `15` |  |
| leaderElection.renewDeadline | int | `10` |  |
| leaderElection.retryPeriod | int | `2` |  |
| redis.enabled | bool | `false` | Enables Redis as external result cache, uses in memory cache by default |
| redis.address | string | `""` | Redis host |
| redis.database | int | `0` | Redis database |
| redis.prefix | string | `"policy-reporter"` | Redis key prefix |
| redis.username | optional | `""` | Username |
| redis.password | optional | `""` | Password |
| redis.certificate | optional | `""` | Path to a server CA certificate |
| redis.secretRef | optional | `""` | Secret name to pull username and password from |
| redis.skipTLS | bool | `false` | Skip TLS verification |
| database.type | string | `""` | Use an external Database, supported: mysql, postgres, mariadb |
| database.database | string | `""` | Database |
| database.username | string | `""` | Username |
| database.password | string | `""` | Password |
| database.host | string | `""` | Host Address |
| database.enableSSL | bool | `false` | Enables SSL |
| database.dsn | string | `""` | Instead of configure the individual values you can also provide an DSN string example postgres: postgres://postgres:password@localhost:5432/postgres?sslmode=disable example mysql: root:password@tcp(localhost:3306)/test?tls=false |
| database.maxOpenConnections | int | `25` | Maximum number of open connections, supported for mysql and postgres |
| database.maxIdleConnections | int | `25` | Maximum number of idle connections, supported for mysql and postgres |
| database.connectionMaxLifetime | int | `0` | Maximum amount of time in minutes a connection may be reused, supported for mysql and postgres |
| database.connectionMaxIdleTime | int | `0` | Maximum amount of time in minutes a connection may be idle, supported for mysql and postgres |
| database.timeout | int | `10` | Timeout for database operations in seconds, supported for mysql and postgres |
| database.metrics | bool | `false` | Enables database related metrics, connection status and query histogram |
| database.secretRef | string | `""` | Read configuration from an existing Secret supported fields: username, password, host, dsn, database |
| database.mountedSecret | string | `""` |  |
| periodicSync.enabled | bool | `false` |  |
| periodicSync.interval | int | `30` |  |
| podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for policy-reporter disruptions. Cannot be used if `maxUnavailable` is set. |
| podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for policy-reporter disruptions. Cannot be used if `minAvailable` is set. |
| nodeSelector | object | `{}` | Node labels for pod assignment ref: https://kubernetes.io/docs/user-guide/node-selection/ |
| tolerations | list | `[]` | Tolerations for pod assignment ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/ |
| affinity | object | `{}` | Anti-affinity to disallow deploying client and master nodes on the same worker node |
| topologySpreadConstraints | list | `[]` | Topology Spread Constraints to better spread pods |
| livenessProbe | object | `{"httpGet":{"path":"/ready","port":"http"}}` | Deployment livenessProbe for policy-reporter |
| readinessProbe | object | `{"httpGet":{"path":"/healthz","port":"http"}}` | Deployment readinessProbe for policy-reporter |
| extraVolumes.volumeMounts | list | `[]` | Deployment volumeMounts |
| extraVolumes.volumes | list | `[]` | Deployment values |
| sqliteVolume | object | `{}` | If set the volume for sqlite is freely configurable below "- name: sqlite". If no value is set an emptyDir is used. |
| envVars | list | `[]` | Allow additional env variables to be added |
| tmpVolume | object | `{}` | Allow custom configuration of the /tmp volume |
| ui.enabled | bool | `false` | Enable Policy Reporter UI |
| ui.image.registry | string | `"ghcr.io"` | Image registry |
| ui.image.repository | string | `"kyverno/policy-reporter-ui"` | Image repository |
| ui.image.pullPolicy | string | `"IfNotPresent"` | Image PullPolicy |
| ui.image.tag | string | `"2.5.1"` | Image tag |
| ui.crds.customBoard | bool | `false` | Install UI CustomBoard CRDs |
| ui.replicaCount | int | `1` | Deployment replica count |
| ui.priorityClassName | string | `""` | Deployment priorityClassName |
| ui.logging.api | bool | `false` | Enables external api request logging |
| ui.logging.server | bool | `false` | Enables server access logging |
| ui.logging.encoding | string | `"console"` | Log encoding possible encodings are console and json |
| ui.logging.logLevel | int | `0` | Log level default info |
| ui.server.port | int | `8080` | Application port |
| ui.server.cors | bool | `true` | Enabled CORS header |
| ui.server.overwriteHost | bool | `true` | Overwrites Request Host with Proxy Host and adds `X-Forwarded-Host` and `X-Origin-Host` headers |
| ui.server.sessions | object | `{"storage":"filesystem","tempDir":"/tmp"}` | session configuration |
| ui.openIDConnect.enabled | bool | `false` | Enable openID Connect authentication |
| ui.openIDConnect.discoveryUrl | string | `""` | OpenID Connect Discovery URL |
| ui.openIDConnect.callbackUrl | string | `""` | OpenID Connect Callback URL |
| ui.openIDConnect.clientId | string | `""` | OpenID Connect ClientID |
| ui.openIDConnect.clientSecret | string | `""` | OpenID Connect ClientSecret |
| ui.openIDConnect.groupClaim | string | `""` | Optional Group Claim to map user groups to the profile groups can be used to define access control for clusters, boards and custom boards. |
| ui.openIDConnect.scopes | list | `[]` | OpenID Connect allowed Scopes |
| ui.openIDConnect.skipTLS | bool | `false` | Skip TLS Verification |
| ui.openIDConnect.certificate | string | `""` | TLS Certificate file path |
| ui.openIDConnect.secretRef | string | `""` | Provide OpenID Connect configuration via Secret supported keys: `discoveryUrl`, `clientId`, `clientSecret`, `certificate`, `skipTLS` |
| ui.oauth.enabled | bool | `false` | Enable openID Connect authentication |
| ui.oauth.provider | string | `""` | OAuth2 Provider supported: amazon, gitlab, github, apple, google, yandex, azuread |
| ui.oauth.callbackUrl | string | `""` | OpenID Connect Callback URL |
| ui.oauth.clientId | string | `""` | OpenID Connect ClientID |
| ui.oauth.clientSecret | string | `""` | OpenID Connect ClientSecret |
| ui.oauth.scopes | list | `[]` | OpenID Connect allowed Scopes |
| ui.oauth.secretRef | string | `""` | Provide OpenID Connect configuration via Secret supported keys: `provider`, `clientId`, `clientSecret` |
| ui.banner | string | `""` | optional banner text |
| ui.logo.path | string | `""` | custom logo path |
| ui.logo.disabled | bool | `false` | disable logo entirely |
| ui.displayMode | string | `""` | DisplayMode dark/light/colorblind/colorblinddark uses the OS configured preferred color scheme as default |
| ui.boards | object | `{}` | Configure access control for all default boards. |
| ui.customBoards | list | `[]` | Additional customizable dashboards |
| ui.sources | list | `[]` | source specific configurations |
| ui.name | string | `"Default"` |  |
| ui.clusters | list | `[]` | Connected Policy Reporter APIs |
| ui.imagePullSecrets | list | `[]` | Image pull secrets for image verification policies, this will define the `--imagePullSecrets` argument |
| ui.serviceAccount.create | bool | `true` | Create ServiceAccount |
| ui.serviceAccount.automount | bool | `true` | Enable ServiceAccount automount |
| ui.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| ui.serviceAccount.name | string | `""` | The ServiceAccount name |
| ui.sidecarContainers | object | `{}` | Add sidecar containers to the UI deployment  sidecarContainers:    oauth-proxy:      image: quay.io/oauth2-proxy/oauth2-proxy:v7.6.0      args:      - --upstream=http://127.0.0.1:8080      - --http-address=0.0.0.0:8081      - ...      ports:      - containerPort: 8081        name: oauth-proxy        protocol: TCP      resources: {} |
| ui.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| ui.podLabels | object | `{}` | Additional labels to add to each pod |
| ui.selectorLabels | object | `{}` | Custom selector labels, overwrites the default set |
| ui.updateStrategy | object | `{}` | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| ui.revisionHistoryLimit | int | `10` | The number of revisions to keep |
| ui.podSecurityContext | object | `{"runAsGroup":1234,"runAsUser":1234}` | Security context for the pod |
| ui.envVars | list | `[]` | Allow additional env variables to be added |
| ui.rbac.enabled | bool | `true` | Create RBAC resources |
| ui.securityContext.runAsUser | int | `1234` |  |
| ui.securityContext.runAsNonRoot | bool | `true` |  |
| ui.securityContext.privileged | bool | `false` |  |
| ui.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| ui.securityContext.readOnlyRootFilesystem | bool | `true` |  |
| ui.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| ui.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| ui.livenessProbe | object | `{"httpGet":{"path":"/healthz","port":"http"}}` | Deployment livenessProbe for policy-reporter-ui |
| ui.readinessProbe | object | `{"httpGet":{"path":"/healthz","port":"http"}}` | Deployment readinessProbe for policy-reporter-ui |
| ui.service.type | string | `"ClusterIP"` | Service type. |
| ui.service.port | int | `8080` | Service port. |
| ui.service.annotations | object | `{}` | Service annotations. |
| ui.service.labels | object | `{}` | Service labels. |
| ui.service.additionalPorts | list | `[]` | Additional service ports for e.g. Sidecars  # - name: authenticated additionalPorts: - name: authenticated   port: 8081   targetPort: 8081 |
| ui.ingress.enabled | bool | `false` | Create ingress resource. |
| ui.ingress.port | string | `nil` | Redirect ingress to an additional defined port on the service |
| ui.ingress.className | string | `""` | Ingress class name. |
| ui.ingress.labels | object | `{}` | Ingress labels. |
| ui.ingress.annotations | object | `{}` | Ingress annotations. |
| ui.ingress.hosts | list | `[]` | List of ingress host configurations. |
| ui.ingress.tls | list | `[]` | List of ingress TLS configurations. |
| ui.httproute.enabled | bool | `false` | Enable HTTPRoute resource (Gateway API alternative to Ingress) Requires Gateway API CRDs (v1) installed in cluster https://gateway-api.sigs.k8s.io/ |
| ui.httproute.labels | object | `{}` | Additional HTTPRoute labels |
| ui.httproute.annotations | object | `{}` | Additional HTTPRoute annotations |
| ui.httproute.parentRefs | list | `[]` | Gateway API parentRefs (list of Gateway references) Must reference an existing Gateway resource |
| ui.httproute.hostnames | list | `[]` | List of hostnames for HTTPRoute |
| ui.httproute.rules | list | `[{"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | HTTPRoute rules configuration Allows advanced routing with matches and filters |
| ui.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| ui.networkPolicy.egress | list | `[{"ports":[{"port":6443,"protocol":"TCP"}]}]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. Enables Kubernetes API Server by default |
| ui.networkPolicy.ingress | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| ui.resources | object | `{}` | Resource constraints |
| ui.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for kyvernoPlugin disruptions. Cannot be used if `maxUnavailable` is set. |
| ui.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for kyvernoPlugin disruptions. Cannot be used if `minAvailable` is set. |
| ui.nodeSelector | object | `{}` | Node labels for pod assignment |
| ui.tolerations | list | `[]` | List of node taints to tolerate |
| ui.affinity | object | `{}` | Affinity constraints. |
| ui.topologySpreadConstraints | object | `{}` | Pod Topology Spread Constraints for the policy-reporter-ui. |
| ui.extraVolumes.volumeMounts | list | `[]` | Deployment volumeMounts |
| ui.extraVolumes.volumes | list | `[]` | Deployment values |
| ui.extraConfig | object | `{}` | Extra configuration options appended to UI settings |
| plugin.kyverno.enabled | bool | `false` | Enable Kyverno Plugin |
| plugin.kyverno.image.registry | string | `"ghcr.io"` | Image registry |
| plugin.kyverno.image.repository | string | `"kyverno/policy-reporter/kyverno-plugin"` | Image repository |
| plugin.kyverno.image.pullPolicy | string | `"IfNotPresent"` | Image PullPolicy |
| plugin.kyverno.image.tag | string | `"0.5.3"` | Image tag |
| plugin.kyverno.replicaCount | int | `1` | Deployment replica count |
| plugin.kyverno.priorityClassName | string | `""` | Deployment priorityClassName |
| plugin.kyverno.logging.api | bool | `false` | Enables external API request logging |
| plugin.kyverno.logging.server | bool | `false` | Enables Server access logging |
| plugin.kyverno.logging.encoding | string | `"console"` | log encoding possible encodings are console and json |
| plugin.kyverno.logging.logLevel | int | `0` | log level default info |
| plugin.kyverno.server.port | int | `8080` | Application port |
| plugin.kyverno.blockReports.enabled | bool | `false` | Enables he BlockReport feature |
| plugin.kyverno.blockReports.eventNamespace | string | `"default"` | Watches for Kyverno Events in the configured namespace leave blank to watch in all namespaces |
| plugin.kyverno.blockReports.source | string | `"Kyverno Event"` | Used value for the source field in the created (Cluster)PolicyReports |
| plugin.kyverno.blockReports.results.maxPerReport | int | `200` | Max items per PolicyReport resource |
| plugin.kyverno.blockReports.results.keepOnlyLatest | bool | `false` | Keep only the latest of duplicated events |
| plugin.kyverno.blockReports.policyReport.labels | list | `[]` | Labels for all created (Cluster)PolicyReports |
| plugin.kyverno.blockReports.policyReport.annotations | list | `[]` | Annotations for all created (Cluster)PolicyReports |
| plugin.kyverno.imagePullSecrets | list | `[]` | Image pull secrets for image verification policies, this will define the `--imagePullSecrets` argument |
| plugin.kyverno.serviceAccount.create | bool | `true` | Create ServiceAccount |
| plugin.kyverno.serviceAccount.automount | bool | `true` | Enable ServiceAccount automount |
| plugin.kyverno.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| plugin.kyverno.serviceAccount.name | string | `""` | The ServiceAccount name |
| plugin.kyverno.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| plugin.kyverno.podLabels | object | `{}` | Additional labels to add to each pod |
| plugin.kyverno.selectorLabels | object | `{}` | Custom selector labels, overwrites the default set |
| plugin.kyverno.updateStrategy | object | `{}` | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| plugin.kyverno.revisionHistoryLimit | int | `10` | The number of revisions to keep |
| plugin.kyverno.podSecurityContext | object | `{"runAsGroup":1234,"runAsUser":1234}` | Security context for the pod |
| plugin.kyverno.envVars | list | `[]` | Allow additional env variables to be added |
| plugin.kyverno.rbac.enabled | bool | `true` | Create RBAC resources |
| plugin.kyverno.securityContext.runAsUser | int | `1234` |  |
| plugin.kyverno.securityContext.runAsNonRoot | bool | `true` |  |
| plugin.kyverno.securityContext.privileged | bool | `false` |  |
| plugin.kyverno.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| plugin.kyverno.securityContext.readOnlyRootFilesystem | bool | `true` |  |
| plugin.kyverno.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| plugin.kyverno.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| plugin.kyverno.service.type | string | `"ClusterIP"` | Service type. |
| plugin.kyverno.service.port | int | `8080` | Service port. |
| plugin.kyverno.service.annotations | object | `{}` | Service annotations. |
| plugin.kyverno.service.labels | object | `{}` | Service labels. |
| plugin.kyverno.ingress.enabled | bool | `false` | Create ingress resource. |
| plugin.kyverno.ingress.className | string | `""` | Ingress class name. |
| plugin.kyverno.ingress.labels | object | `{}` | Ingress labels. |
| plugin.kyverno.ingress.annotations | object | `{}` | Ingress annotations. |
| plugin.kyverno.ingress.hosts | list | `[]` | List of ingress host configurations. |
| plugin.kyverno.ingress.tls | list | `[]` | List of ingress TLS configurations. |
| plugin.kyverno.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| plugin.kyverno.networkPolicy.egress | list | `[{"ports":[{"port":6443,"protocol":"TCP"}]}]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. Enables Kubernetes API Server by default |
| plugin.kyverno.networkPolicy.ingress | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| plugin.kyverno.httproute.enabled | bool | `false` | Enable HTTPRoute resource (Gateway API alternative to Ingress) Requires Gateway API CRDs (v1) installed in cluster https://gateway-api.sigs.k8s.io/ |
| plugin.kyverno.httproute.labels | object | `{}` | Additional HTTPRoute labels |
| plugin.kyverno.httproute.annotations | object | `{}` | Additional HTTPRoute annotations |
| plugin.kyverno.httproute.parentRefs | list | `[]` | Gateway API parentRefs (list of Gateway references) Must reference an existing Gateway resource |
| plugin.kyverno.httproute.hostnames | list | `[]` | List of hostnames for HTTPRoute |
| plugin.kyverno.httproute.rules | list | `[{"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | HTTPRoute rules configuration Allows advanced routing with matches and filters |
| plugin.kyverno.resources | object | `{}` | Resource constraints |
| plugin.kyverno.leaderElection.lockName | string | `"kyverno-plugin"` | Lock Name |
| plugin.kyverno.leaderElection.releaseOnCancel | bool | `true` | Released lock when the run context is cancelled. |
| plugin.kyverno.leaderElection.leaseDuration | int | `15` | LeaseDuration is the duration that non-leader candidates will wait to force acquire leadership. |
| plugin.kyverno.leaderElection.renewDeadline | int | `10` | RenewDeadline is the duration that the acting master will retry refreshing leadership before giving up. |
| plugin.kyverno.leaderElection.retryPeriod | int | `2` | RetryPeriod is the duration the LeaderElector clients should wait between tries of actions. |
| plugin.kyverno.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for kyvernoPlugin disruptions. Cannot be used if `maxUnavailable` is set. |
| plugin.kyverno.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for kyvernoPlugin disruptions. Cannot be used if `minAvailable` is set. |
| plugin.kyverno.nodeSelector | object | `{}` | Node labels for pod assignment |
| plugin.kyverno.tolerations | list | `[]` | List of node taints to tolerate |
| plugin.kyverno.affinity | object | `{}` | Affinity constraints. |
| plugin.kyverno.topologySpreadConstraints | object | `{}` | Pod Topology Spread Constraints for the kyverno plugin. |
| plugin.kyverno.extraVolumes.volumeMounts | list | `[]` | Deployment volumeMounts |
| plugin.kyverno.extraVolumes.volumes | list | `[]` | Deployment values |
| plugin.kyverno.extraConfig | object | `{}` | Extra configuration options appended to kyverno plugin settings |
| plugin.trivy.enabled | bool | `false` | Enable Trivy Operator Plugin |
| plugin.trivy.image.registry | string | `"ghcr.io"` | Image registry |
| plugin.trivy.image.repository | string | `"kyverno/policy-reporter/trivy-plugin"` | Image repository |
| plugin.trivy.image.pullPolicy | string | `"IfNotPresent"` | Image PullPolicy |
| plugin.trivy.image.tag | string | `"0.4.12"` | Image tag Defaults to `Chart.AppVersion` if omitted |
| plugin.trivy.cli.image.registry | string | `"ghcr.io"` | Image registry |
| plugin.trivy.cli.image.repository | string | `"aquasecurity/trivy"` | Image repository |
| plugin.trivy.cli.image.pullPolicy | string | `"IfNotPresent"` | Image PullPolicy |
| plugin.trivy.cli.image.tag | string | `"0.63.0"` | Image tag Defaults to `Chart.AppVersion` if omitted |
| plugin.trivy.extraArgs | object | `{}` | Additional container args. |
| plugin.trivy.cveawg.disable | bool | `false` | disable external CVEAWG API calls. |
| plugin.trivy.github.disable | bool | `false` | disable GitHub API calls. |
| plugin.trivy.github.token | string | `""` | optional github token for authenticated GitHub API calls. |
| plugin.trivy.dbVolume | object | `{}` | If set the volume for dbVolume is freely configurable below "- name: dbVolume". If no value is set an emptyDir is used. |
| plugin.trivy.tmpVolume | object | `{}` | If set the volume for tmpVolume is freely configurable below "- name: tmpVolume". If no value is set an emptyDir is used. |
| plugin.trivy.replicaCount | int | `1` | Deployment replica count |
| plugin.trivy.priorityClassName | string | `""` | Deployment priorityClassName |
| plugin.trivy.logging.api | bool | `false` | Enables external API request logging |
| plugin.trivy.logging.server | bool | `false` | Enables Server access logging |
| plugin.trivy.logging.encoding | string | `"console"` | log encoding possible encodings are console and json |
| plugin.trivy.logging.logLevel | int | `0` | log level default info |
| plugin.trivy.server.port | int | `8080` | Application port |
| plugin.trivy.policyReporter.skipTLS | bool | `false` | Skip TLS Verification |
| plugin.trivy.policyReporter.certificate | string | `""` | TLS Certificate file path |
| plugin.trivy.policyReporter.secretRef | string | `""` | Secret to read the API configuration from supports `host`, `certificate`, `skipTLS`, `username`, `password` key |
| plugin.trivy.imagePullSecrets | list | `[]` | Image pull secrets for image verification policies, this will define the `--imagePullSecrets` argument |
| plugin.trivy.serviceAccount.create | bool | `true` | Create ServiceAccount |
| plugin.trivy.serviceAccount.automount | bool | `true` | Enable ServiceAccount automount |
| plugin.trivy.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| plugin.trivy.serviceAccount.name | string | `""` | The ServiceAccount name |
| plugin.trivy.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| plugin.trivy.podLabels | object | `{}` | Additional labels to add to each pod |
| plugin.trivy.selectorLabels | object | `{}` | Custom selector labels, overwrites the default set |
| plugin.trivy.updateStrategy | object | `{}` | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| plugin.trivy.revisionHistoryLimit | int | `10` | The number of revisions to keep |
| plugin.trivy.podSecurityContext | object | `{"runAsGroup":1234,"runAsUser":1234}` | Security context for the pod |
| plugin.trivy.livenessProbe | object | `{"httpGet":{"path":"/vulnr/v1/policies","port":"http"},"timeoutSeconds":3}` | Deployment livenessProbe for policy-reporter-trivy-plugin |
| plugin.trivy.readinessProbe | object | `{"httpGet":{"path":"/vulnr/v1/policies","port":"http"},"timeoutSeconds":3}` | Deployment readinessProbe for policy-reporter-trivy-plugin |
| plugin.trivy.envVars | list | `[]` | Allow additional env variables to be added |
| plugin.trivy.rbac.enabled | bool | `true` | Create RBAC resources |
| plugin.trivy.securityContext.runAsUser | int | `1234` |  |
| plugin.trivy.securityContext.runAsNonRoot | bool | `true` |  |
| plugin.trivy.securityContext.privileged | bool | `false` |  |
| plugin.trivy.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| plugin.trivy.securityContext.readOnlyRootFilesystem | bool | `true` |  |
| plugin.trivy.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| plugin.trivy.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |
| plugin.trivy.service.type | string | `"ClusterIP"` | Service type. |
| plugin.trivy.service.port | int | `8080` | Service port. |
| plugin.trivy.service.annotations | object | `{}` | Service annotations. |
| plugin.trivy.service.labels | object | `{}` | Service labels. |
| plugin.trivy.ingress.enabled | bool | `false` | Create ingress resource. |
| plugin.trivy.ingress.className | string | `""` | Ingress class name. |
| plugin.trivy.ingress.labels | object | `{}` | Ingress labels. |
| plugin.trivy.ingress.annotations | object | `{}` | Ingress annotations. |
| plugin.trivy.ingress.hosts | list | `[]` | List of ingress host configurations. |
| plugin.trivy.ingress.tls | list | `[]` | List of ingress TLS configurations. |
| plugin.trivy.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| plugin.trivy.networkPolicy.egress | list | `[{"ports":[{"port":6443,"protocol":"TCP"}]}]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. Enables Kubernetes API Server by default |
| plugin.trivy.networkPolicy.ingress | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| plugin.trivy.resources | object | `{}` | Resource constraints |
| plugin.trivy.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for kyvernoPlugin disruptions. Cannot be used if `maxUnavailable` is set. |
| plugin.trivy.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for kyvernoPlugin disruptions. Cannot be used if `minAvailable` is set. |
| plugin.trivy.nodeSelector | object | `{}` | Node labels for pod assignment |
| plugin.trivy.tolerations | list | `[]` | List of node taints to tolerate |
| plugin.trivy.affinity | object | `{}` | Affinity constraints. |
| plugin.trivy.topologySpreadConstraints | object | `{}` | Pod Topology Spread Constraints for the trivy plugin. |
| plugin.trivy.extraVolumes.volumeMounts | list | `[]` | Deployment volumeMounts |
| plugin.trivy.extraVolumes.volumes | list | `[]` | Deployment values |
| plugin.trivy.extraConfig | object | `{}` | Extra configuration options appended to trivy plugin settings |
| monitoring.enabled | bool | `false` | Enables the Prometheus Operator integration |
| monitoring.annotations | object | `{}` | Key/value pairs that are attached to all resources. |
| monitoring.serviceMonitor.honorLabels | bool | `false` | HonorLabels chooses the metrics labels on collisions with target labels |
| monitoring.serviceMonitor.namespace | string | `nil` | Allow to override the namespace for serviceMonitor |
| monitoring.serviceMonitor.labels | object | `{}` | Labels to match the serviceMonitorSelector of the Prometheus Resource |
| monitoring.serviceMonitor.relabelings | list | `[]` | ServiceMonitor Relabelings https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api.md#relabelconfig |
| monitoring.serviceMonitor.metricRelabelings | list | `[]` | See serviceMonitor.relabelings |
| monitoring.serviceMonitor.namespaceSelector | optional | `{}` | NamespaceSelector |
| monitoring.serviceMonitor.scrapeTimeout | optional | `nil` | ScrapeTimeout |
| monitoring.serviceMonitor.interval | optional | `nil` | Scrape interval |
| monitoring.grafana.namespace | string | `nil` | Naamespace for configMap of grafana dashboards |
| monitoring.grafana.dashboards.enabled | bool | `true` | Enable the deployment of grafana dashboards |
| monitoring.grafana.dashboards.label | string | `"grafana_dashboard"` | Label to find dashboards using the k8s sidecar |
| monitoring.grafana.dashboards.value | string | `"1"` | Label value to find dashboards using the k8s sidecar |
| monitoring.grafana.dashboards.labelFilter | list | `[]` | List of custom label filter Used to add filter for report label based metric labels defined in custom mode |
| monitoring.grafana.dashboards.multicluster.enabled | bool | `false` | Enable cluster filter in all dashboards |
| monitoring.grafana.dashboards.multicluster.label | string | `"cluster"` | Metric Label which is used to filter clusters |
| monitoring.grafana.dashboards.enable.overview | bool | `true` | Enable the Overview Dashboard |
| monitoring.grafana.dashboards.enable.policyReportDetails | bool | `true` | Enable the PolicyReport Dashboard |
| monitoring.grafana.dashboards.enable.clusterPolicyReportDetails | bool | `true` | Enable the ClusterPolicyReport Dashboard |
| monitoring.grafana.folder.annotation | string | `"grafana_folder"` | Annotation to enable folder storage using the k8s sidecar |
| monitoring.grafana.folder.name | string | `"Policy Reporter"` | Grafana folder in which to store the dashboards |
| monitoring.grafana.datasource.label | string | `"Prometheus"` | Grafana Datasource Label |
| monitoring.grafana.datasource.pluginId | string | `"prometheus"` | Grafana Datasource PluginId |
| monitoring.grafana.datasource.pluginName | string | `"Prometheus"` | Grafana Datasource PluginName |
| monitoring.grafana.grafanaDashboard.enabled | bool | `false` | Create GrafanaDashboard custom resource referencing to the configMap. according to https://grafana-operator.github.io/grafana-operator/docs/examples/dashboard_from_configmap/readme/ |
| monitoring.grafana.grafanaDashboard.folder | string | `"kyverno"` | Dashboard folder |
| monitoring.grafana.grafanaDashboard.allowCrossNamespaceImport | bool | `true` | Allow cross Namespace import |
| monitoring.grafana.grafanaDashboard.matchLabels | object | `{"dashboards":"grafana"}` | Label match selector |
| monitoring.policyReportDetails.firstStatusRow.height | int | `8` |  |
| monitoring.policyReportDetails.secondStatusRow.enabled | bool | `true` |  |
| monitoring.policyReportDetails.secondStatusRow.height | int | `2` |  |
| monitoring.policyReportDetails.statusTimeline.enabled | bool | `true` |  |
| monitoring.policyReportDetails.statusTimeline.height | int | `8` |  |
| monitoring.policyReportDetails.passTable.enabled | bool | `true` |  |
| monitoring.policyReportDetails.passTable.height | int | `8` |  |
| monitoring.policyReportDetails.failTable.enabled | bool | `true` |  |
| monitoring.policyReportDetails.failTable.height | int | `8` |  |
| monitoring.policyReportDetails.warningTable.enabled | bool | `true` |  |
| monitoring.policyReportDetails.warningTable.height | int | `4` |  |
| monitoring.policyReportDetails.errorTable.enabled | bool | `true` |  |
| monitoring.policyReportDetails.errorTable.height | int | `4` |  |
| monitoring.clusterPolicyReportDetails.statusRow.height | int | `6` |  |
| monitoring.clusterPolicyReportDetails.statusTimeline.enabled | bool | `true` |  |
| monitoring.clusterPolicyReportDetails.statusTimeline.height | int | `8` |  |
| monitoring.clusterPolicyReportDetails.passTable.enabled | bool | `true` |  |
| monitoring.clusterPolicyReportDetails.passTable.height | int | `8` |  |
| monitoring.clusterPolicyReportDetails.failTable.enabled | bool | `true` |  |
| monitoring.clusterPolicyReportDetails.failTable.height | int | `8` |  |
| monitoring.clusterPolicyReportDetails.warningTable.enabled | bool | `true` |  |
| monitoring.clusterPolicyReportDetails.warningTable.height | int | `4` |  |
| monitoring.clusterPolicyReportDetails.errorTable.enabled | bool | `true` |  |
| monitoring.clusterPolicyReportDetails.errorTable.height | int | `4` |  |
| monitoring.policyReportOverview.failingSummaryRow.height | int | `8` |  |
| monitoring.policyReportOverview.failingTimeline.height | int | `10` |  |
| monitoring.policyReportOverview.failingPolicyRuleTable.height | int | `10` |  |
| monitoring.policyReportOverview.failingClusterPolicyRuleTable.height | int | `10` |  |
| extraManifests | list | `[]` | list of extra manifests |
| extraConfig | object | `{}` | Extra configuration options appended to core policy reporter |

## Source Code

* <https://github.com/kyverno/policy-reporter>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| Frank Jogeleit |  |  |
| Ammar Yasser |  |  |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
