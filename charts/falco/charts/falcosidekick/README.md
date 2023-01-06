# Falcosidekick

![falcosidekick](https://github.com/falcosecurity/falcosidekick/raw/master/imgs/falcosidekick_color.png)

![release](https://flat.badgen.net/github/release/falcosecurity/falcosidekick/latest?color=green) ![last commit](https://flat.badgen.net/github/last-commit/falcosecurity/falcosidekick) ![licence](https://flat.badgen.net/badge/license/MIT/blue) ![docker pulls](https://flat.badgen.net/docker/pulls/falcosecurity/falcosidekick?icon=docker)

## Description

A simple daemon for connecting [`Falco`](https://github.com/falcosecurity/falco) to your ecossytem. It takes a `Falco`'s events and
forward them to different outputs in a fan-out way.

It works as a single endpoint for as many as you want `Falco` instances :

![falco_with_falcosidekick](https://github.com/falcosecurity/falcosidekick/raw/master/imgs/falco_with_falcosidekick.png)

## Outputs

`Falcosidekick` manages a large variety of outputs with different purposes.

### Chat

- [**Slack**](https://slack.com)
- [**Rocketchat**](https://rocket.chat/)
- [**Mattermost**](https://mattermost.com/)
- [**Teams**](https://products.office.com/en-us/microsoft-teams/group-chat-software)
- [**Discord**](https://www.discord.com/)
- [**Google Chat**](https://workspace.google.com/products/chat/)
- [**Zoho Cliq**](https://www.zoho.com/cliq/)

### Metrics / Observability

- [**Datadog**](https://www.datadoghq.com/)
- [**Influxdb**](https://www.influxdata.com/products/influxdb-overview/)
- [**StatsD**](https://github.com/statsd/statsd) (for monitoring of `falcosidekick`)
- [**DogStatsD**](https://docs.datadoghq.com/developers/dogstatsd/?tab=go) (for monitoring of `falcosidekick`)
- [**Prometheus**](https://prometheus.io/) (for both events and monitoring of `falcosidekick`)
- [**Wavefront**](https://www.wavefront.com)

### Alerting

- [**AlertManager**](https://prometheus.io/docs/alerting/alertmanager/)
- [**Opsgenie**](https://www.opsgenie.com/)
- [**PagerDuty**](https://pagerduty.com/)

### Logs

- [**Elasticsearch**](https://www.elastic.co/)
- [**Loki**](https://grafana.com/oss/loki)
- [**AWS CloudWatchLogs**](https://aws.amazon.com/cloudwatch/features/)
- [**Grafana**](https://grafana.com/) (annotations)
- **Syslog**

### Object Storage

- [**AWS S3**](https://aws.amazon.com/s3/features/)
- [**GCP Storage**](https://cloud.google.com/storage)
- [**Yandex S3 Storage**](https://cloud.yandex.com/en-ru/services/storage)

### FaaS / Serverless

- [**AWS Lambda**](https://aws.amazon.com/lambda/features/)
- [**Kubeless**](https://kubeless.io/)
- [**OpenFaaS**](https://www.openfaas.com)
- [**GCP Cloud Run**](https://cloud.google.com/run)
- [**GCP Cloud Functions**](https://cloud.google.com/functions)
- [**Fission**](https://fission.io)

### Message queue / Streaming

- [**NATS**](https://nats.io/)
- [**STAN (NATS Streaming)**](https://docs.nats.io/nats-streaming-concepts/intro)
- [**AWS SQS**](https://aws.amazon.com/sqs/features/)
- [**AWS SNS**](https://aws.amazon.com/sns/features/)
- [**AWS Kinesis**](https://aws.amazon.com/kinesis/)
- [**GCP PubSub**](https://cloud.google.com/pubsub)
- [**Apache Kafka**](https://kafka.apache.org/)
- [**Kafka Rest Proxy**](https://docs.confluent.io/platform/current/kafka-rest/index.html)
- [**RabbitMQ**](https://www.rabbitmq.com/)
- [**Azure Event Hubs**](https://azure.microsoft.com/en-in/services/event-hubs/)

### Email

- **SMTP**

### Web

- **Webhook**
- [**WebUI**](https://github.com/falcosecurity/falcosidekick-ui) (a Web UI for displaying latest events in real time)

### Other
- [**Policy Report**](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report/falco-adapter)

## Adding `falcosecurity` repository

Prior to install the chart, add the `falcosecurity` charts repository:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
```

## Installing the Chart

### Install Falco + Falcosidekick + Falcosidekick-ui

To install the chart with the release name `falcosidekick` run:

```bash
helm install falcosidekick falcosecurity/falcosidekick --set webui.enabled=true
```

### With Helm chart of Falco

`Falco`, `Falcosidekick` and `Falcosidekick-ui` can be installed together in one command. All values to configure `Falcosidekick` will have to be
prefixed with `falcosidekick.`.

```bash
helm install falco falcosecurity/falco --set falcosidekick.enabled=true --set falcosidekick.webui.enabled=true
```

After a few seconds, Falcosidekick should be running.

> **Tip**: List all releases using `helm list`, a release is a name used to track a specific deployment

## Minumiun Kubernetes version

The minimum Kubernetes version required is 1.17.x

## Uninstalling the Chart

To uninstall the `falcosidekick` deployment:

```bash
helm uninstall falcosidekick
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the main configurable parameters of the Falcosidekick chart and their default values. See `values.yaml` for full list.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity for the Sidekick pods |
| config.alertmanager.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.alertmanager.endpoint | string | `"/api/v1/alerts"` | alertmanager endpoint on which falcosidekick posts alerts, choice is: `"/api/v1/alerts" or "/api/v2/alerts" , default is "/api/v1/alerts"` |
| config.alertmanager.expireafter | string | `""` | if set to a non-zero value, alert expires after that time in seconds (default: 0) |
| config.alertmanager.hostport | string | `""` | AlertManager <http://host:port>, if not `empty`, AlertManager is *enabled* |
| config.alertmanager.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.alertmanager.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.aws.accesskeyid | string | `""` | AWS Access Key Id (optionnal if you use EC2 Instance Profile) |
| config.aws.cloudwatchlogs.loggroup | string | `""` | AWS CloudWatch Logs Group name, if not empty, CloudWatch Logs output is *enabled* |
| config.aws.cloudwatchlogs.logstream | string | `""` | AWS CloudWatch Logs Stream name, if empty, Falcosidekick will try to create a log stream |
| config.aws.cloudwatchlogs.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.kinesis.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.kinesis.streamname | string | `""` | AWS Kinesis Stream Name, if not empty, Kinesis output is *enabled* |
| config.aws.lambda.functionname | string | `""` | AWS Lambda Function Name, if not empty, AWS Lambda output is *enabled* |
| config.aws.lambda.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.region | string | `""` | AWS Region (optionnal if you use EC2 Instance Profile) |
| config.aws.rolearn | string | `""` | AWS IAM role ARN for falcosidekick service account to associate with (optionnal if you use EC2 Instance Profile) |
| config.aws.s3.bucket | string | `""` | AWS S3, bucket name |
| config.aws.s3.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.s3.prefix | string | `""` | AWS S3, name of prefix, keys will have format: s3://<bucket>/<prefix>/YYYY-MM-DD/YYYY-MM-DDTHH:mm:ss.s+01:00.json |
| config.aws.secretaccesskey | string | `""` | AWS Secret Access Key (optionnal if you use EC2 Instance Profile) |
| config.aws.sns.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.sns.rawjson | bool | `false` | Send RawJSON from `falco` or parse it to AWS SNS |
| config.aws.sns.topicarn | string | `""` | AWS SNS TopicARN, if not empty, AWS SNS output is *enabled* |
| config.aws.sqs.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.aws.sqs.url | string | `""` | AWS SQS Queue URL, if not empty, AWS SQS output is *enabled* |
| config.azure.eventHub.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.azure.eventHub.name | string | `""` | Name of the Hub, if not empty, EventHub is *enabled* |
| config.azure.eventHub.namespace | string | `""` | Name of the space the Hub is in |
| config.azure.podIdentityClientID | string | `""` | Azure Identity Client ID |
| config.azure.podIdentityName | string | `""` | Azure Identity name |
| config.azure.resourceGroupName | string | `""` | Azure Resource Group name |
| config.azure.subscriptionID | string | `""` | Azure Subscription ID |
| config.cliq.icon | string | `""` | Cliq icon (avatar) |
| config.cliq.messageformat | string | `""` | a Go template to format Google Chat Text above Attachment, displayed in addition to the output from `cliq.outputformat`. If empty, no Text is displayed before sections. |
| config.cliq.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.cliq.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Cliq), `fields` (only fields are displayed in Cliq) |
| config.cliq.useemoji | bool | `true` | Prefix message text with an emoji |
| config.cliq.webhookurl | string | `""` | Zoho Cliq Channel URL (ex: <https://cliq.zoho.eu/api/v2/channelsbyname/XXXX/message?zapikey=YYYY>), if not empty, Cliq Chat output is *enabled* |
| config.cloudevents.address | string | `""` | CloudEvents consumer http address, if not empty, CloudEvents output is *enabled* |
| config.cloudevents.extension | string | `""` | Extensions to add in the outbound Event, useful for routing |
| config.cloudevents.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.customfields | string | `""` | a list of escaped comma separated custom fields to add to falco events, syntax is "key:value\,key:value" |
| config.datadog.apikey | string | `""` | Datadog API Key, if not `empty`, Datadog output is *enabled* |
| config.datadog.host | string | `""` | Datadog host. Override if you are on the Datadog EU site. Defaults to american site with "<https://api.datadoghq.com>" |
| config.datadog.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.debug | bool | `false` | DEBUG environment variable |
| config.discord.icon | string | `""` | Discord icon (avatar) |
| config.discord.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.discord.webhookurl | string | `""` | Discord WebhookURL (ex: <https://discord.com/api/webhooks/xxxxxxxxxx>...), if not empty, Discord output is *enabled* |
| config.dogstatsd.forwarder | string | `""` | The address for the DogStatsD forwarder, in the form <http://host:port>, if not empty DogStatsD is *enabled* |
| config.dogstatsd.namespace | string | `"falcosidekick."` | A prefix for all metrics |
| config.dogstatsd.tags | string | `""` | A comma-separated list of tags to add to all metrics |
| config.elasticsearch.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.elasticsearch.hostport | string | `""` | Elasticsearch <http://host:port>, if not `empty`, Elasticsearch is *enabled* |
| config.elasticsearch.index | string | `"falco"` | Elasticsearch index |
| config.elasticsearch.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.elasticsearch.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.elasticsearch.password | string | `""` | use this password to authenticate to Elasticsearch if the password is not empty |
| config.elasticsearch.type | string | `"event"` | Elasticsearch document type |
| config.elasticsearch.username | string | `""` | use this username to authenticate to Elasticsearch if the username is not empty |
| config.existingSecret | string | `""` | Existing secret with configuration |
| config.extraEnv | list | `[]` | Extra environment variables |
| config.fission.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.fission.function | string | `""` | Name of Fission function, if not empty, Fission is enabled |
| config.fission.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.fission.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.fission.routernamespace | string | `"fission"` | Namespace of Fission Router, "fission" (default) |
| config.fission.routerport | int | `80` | Port of service of Fission Router |
| config.fission.routerservice | string | `"router"` | Service of Fission Router, "router" (default) |
| config.gcp.cloudfunctions.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.gcp.cloudfunctions.name | string | `""` | The name of the Cloud Function which is in form `projects/<project_id>/locations/<region>/functions/<function_name>` |
| config.gcp.cloudrun.endpoint | string | `""` | the URL of the Cloud Run function |
| config.gcp.cloudrun.jwt | string | `""` | JWT for the private access to Cloud Run function |
| config.gcp.cloudrun.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.gcp.credentials | string | `""` | Base64 encoded JSON key file for the GCP service account |
| config.gcp.pubsub.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.gcp.pubsub.projectid | string | `""` | The GCP Project ID containing the Pub/Sub Topic |
| config.gcp.pubsub.topic | string | `""` | Name of the Pub/Sub topic |
| config.gcp.storage.bucket | string | `""` | The name of the bucket |
| config.gcp.storage.minimumpriority | string | `"debug"` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.gcp.storage.prefix | string | `""` | Name of prefix, keys will have format: gs://<bucket>/<prefix>/YYYY-MM-DD/YYYY-MM-DDTHH:mm:ss.s+01:00.json |
| config.googlechat.messageformat | string | `""` | a Go template to format Google Chat Text above Attachment, displayed in addition to the output from `config.googlechat.outputformat`. If empty, no Text is displayed before Attachment |
| config.googlechat.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.googlechat.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Google chat) |
| config.googlechat.webhookurl | string | `""` | Google Chat Webhook URL (ex: <https://chat.googleapis.com/v1/spaces/XXXXXX/YYYYYY>), if not `empty`, Google Chat output is *enabled* |
| config.grafana.allfieldsastags | bool | `false` | if true, all custom fields are added as tags (default: false) |
| config.grafana.apikey | string | `""` | API Key to authenticate to Grafana, if not empty, Grafana output is *enabled* |
| config.grafana.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.grafana.dashboardid | string | `""` | annotations are scoped to a specific dashboard. Optionnal. |
| config.grafana.hostport | string | `""` | <http://{domain> or ip}:{port}, if not empty, Grafana output is *enabled* |
| config.grafana.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.grafana.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.grafana.panelid | string | `""` | annotations are scoped to a specific panel. Optionnal. |
| config.influxdb.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.influxdb.database | string | `"falco"` | Influxdb database |
| config.influxdb.hostport | string | `""` | Influxdb <http://host:port>, if not `empty`, Influxdb is *enabled* |
| config.influxdb.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.influxdb.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.influxdb.password | string | `""` | Password to use if auth is *enabled* in Influxdb |
| config.influxdb.user | string | `""` | User to use if auth is *enabled* in Influxdb |
| config.kafka.hostport | string | `""` | The Host:Port of the Kafka (ex: kafka:9092). if not empty, Kafka output is *enabled* |
| config.kafka.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.kafka.topic | string | `""` | Name of the topic, if not empty, Kafka output is enabled |
| config.kafkarest.address | string | `""` | The full URL to the topic (example "http://kafkarest:8082/topics/test") |
| config.kafkarest.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.kafkarest.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.kafkarest.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.kafkarest.version | int | `2` | Kafka Rest Proxy API version 2|1 (default: 2) |
| config.kubeless.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.kubeless.function | string | `""` | Name of Kubeless function, if not empty, EventHub is *enabled* |
| config.kubeless.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.kubeless.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.kubeless.namespace | string | `""` | Namespace of Kubeless function (mandatory) |
| config.kubeless.port | int | `8080` | Port of service of Kubeless function. Default is `8080` |
| config.loki.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.loki.endpoint | string | `"/api/prom/push"` | Loki endpoint URL path, default is "/api/prom/push" more info: <https://grafana.com/docs/loki/latest/api/#post-apiprompush> |
| config.loki.extralabels | string | `""` | comma separated list of fields to use as labels additionally to rule, source, priority, tags and custom_fields |
| config.loki.hostport | string | `""` | Loki <http://host:port>, if not `empty`, Loki is *enabled* |
| config.loki.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.loki.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.loki.tenant | string | `""` | Loki tenant, if not `empty`, Loki tenant is *enabled* |
| config.mattermost.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.mattermost.footer | string | `""` | Mattermost Footer |
| config.mattermost.icon | string | `""` | Mattermost icon (avatar) |
| config.mattermost.messageformat | string | `""` | a Go template to format Mattermost Text above Attachment, displayed in addition to the output from `slack.outputformat`. If empty, no Text is displayed before Attachment |
| config.mattermost.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.mattermost.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.mattermost.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Slack), `fields` (only fields are displayed in Mattermost) |
| config.mattermost.username | string | `""` | Mattermost username |
| config.mattermost.webhookurl | string | `""` | Mattermost Webhook URL (ex: <https://XXXX/hooks/YYYY>), if not `empty`, Mattermost output is *enabled* |
| config.mutualtlsfilespath | string | `"/etc/certs"` | folder which will used to store client.crt, client.key and ca.crt files for mutual tls (default: "/etc/certs") |
| config.nats.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.nats.hostport | string | `""` | NATS "nats://host:port", if not `empty`, NATS is *enabled* |
| config.nats.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.nats.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.openfaas.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.openfaas.functionname | string | `""` | Name of OpenFaaS function, if not empty, OpenFaaS is *enabled* |
| config.openfaas.functionnamespace | string | `"openfaas-fn"` | Namespace of OpenFaaS function, "openfaas-fn" (default) |
| config.openfaas.gatewaynamespace | string | `"openfaas"` | Namespace of OpenFaaS Gateway, "openfaas" (default) |
| config.openfaas.gatewayport | int | `8080` | Port of service of OpenFaaS Gateway Default is `8080` |
| config.openfaas.gatewayservice | string | `"gateway"` | Service of OpenFaaS Gateway, "gateway" (default) |
| config.openfaas.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.openfaas.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.opsgenie.apikey | string | `""` | Opsgenie API Key, if not empty, Opsgenie output is *enabled* |
| config.opsgenie.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.opsgenie.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.opsgenie.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.opsgenie.region | `us` or `eu` | `""` | region of your domain |
| config.pagerduty.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.pagerduty.routingkey | string | `""` | Pagerduty Routing Key, if not empty, Pagerduty output is *enabled* |
| config.policyreport.enabled | bool | `false` | if true; policyreport output is *enabled* |
| config.policyreport.kubeconfig | string | `"~/.kube/config"` | Kubeconfig file to use (only if falcosidekick is running outside the cluster) |
| config.policyreport.maxevents | int | `1000` | the max number of events that can be in a policyreport |
| config.policyreport.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.policyreport.prunebypriority | bool | `false` | if true; the events with lowest severity are pruned first, in FIFO order |
| config.prometheus.extralabels | string | `""` | comma separated list of fields to use as labels additionally to rule, source, priority, tags and custom_fields |
| config.rabbitmq.minimumpriority | string | `"debug"` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.rabbitmq.queue | string | `""` | Rabbitmq Queue name |
| config.rabbitmq.url | string | `""` | Rabbitmq URL, if not empty, Rabbitmq output is *enabled* |
| config.rocketchat.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.rocketchat.icon | string | `""` | Rocketchat icon (avatar) |
| config.rocketchat.messageformat | string | `""` | a Go template to format Rocketchat Text above Attachment, displayed in addition to the output from `slack.outputformat`. If empty, no Text is displayed before Attachment |
| config.rocketchat.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.rocketchat.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.rocketchat.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Rocketcaht), `fields` (only fields are displayed in Rocketchat) |
| config.rocketchat.username | string | `""` | Rocketchat username |
| config.rocketchat.webhookurl | string | `""` | Rocketchat Webhook URL (ex: <https://XXXX/hooks/YYYY>), if not `empty`, Rocketchat output is *enabled* |
| config.slack.footer | string | `""` | Slack Footer |
| config.slack.icon | string | `""` | Slack icon (avatar) |
| config.slack.messageformat | string | `""` | a Go template to format Slack Text above Attachment, displayed in addition to the output from `slack.outputformat`. If empty, no Text is displayed before Attachment |
| config.slack.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.slack.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Slack), `fields` (only fields are displayed in Slack) |
| config.slack.username | string | `""` | Slack username |
| config.slack.webhookurl | string | `""` | Slack Webhook URL (ex: <https://hooks.slack.com/services/XXXX/YYYY/ZZZZ>), if not `empty`, Slack output is *enabled* |
| config.smtp.from | string | `""` | Sender address (mandatory if SMTP output is *enabled*) |
| config.smtp.hostport | string | `""` | "host:port" address of SMTP server, if not empty, SMTP output is *enabled* |
| config.smtp.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.smtp.outputformat | string | `"html"` | html, text |
| config.smtp.password | string | `""` | password to access SMTP server |
| config.smtp.to | string | `""` | comma-separated list of Recipident addresses, can't be empty (mandatory if SMTP output is *enabled*) |
| config.smtp.user | string | `""` | user to access SMTP server |
| config.stan.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.stan.clientid | string | `""` | Client ID, if not empty, STAN output is *enabled* |
| config.stan.clusterid | string | `""` | Cluster name, if not empty, STAN output is *enabled* |
| config.stan.hostport | string | `""` | Stan nats://{domain or ip}:{port}, if not empty, STAN output is *enabled* |
| config.stan.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.stan.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.statsd.forwarder | string | `""` | The address for the StatsD forwarder, in the form <http://host:port>, if not empty StatsD is *enabled* |
| config.statsd.namespace | string | `"falcosidekick."` | A prefix for all metrics |
| config.syslog.host | string | `""` | Syslog Host, if not empty, Syslog output is *enabled* |
| config.syslog.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.syslog.port | string | `""` | Syslog endpoint port number |
| config.syslog.protocol | string | `"tcp"` | Syslog transport protocol. It can be either "tcp" or "udp" |
| config.teams.activityimage | string | `""` | Teams section image |
| config.teams.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.teams.outputformat | string | `"all"` | `all` (default), `text` (only text is displayed in Teams), `facts` (only facts are displayed in Teams) |
| config.teams.webhookurl | string | `""` | Teams Webhook URL (ex: <https://outlook.office.com/webhook/XXXXXX/IncomingWebhook/YYYYYY>"), if not `empty`, Teams output is *enabled* |
| config.wavefront.batchsize | int | `10000` | Wavefront batch size. If empty uses the default 10000. Only used when endpointtype is 'direct' |
| config.wavefront.endpointhost | string | `""` | Wavefront endpoint address (only the host). If not empty, with endpointhost, Wavefront output is *enabled* |
| config.wavefront.endpointmetricport | int | `2878` | Port to send metrics. Only used when endpointtype is 'proxy' |
| config.wavefront.endpointtoken | string | `""` | Wavefront token. Must be used only when endpointtype is 'direct' |
| config.wavefront.endpointtype | string | `""` | Wavefront endpoint type, must be 'direct' or 'proxy'. If not empty, with endpointhost, Wavefront output is *enabled* |
| config.wavefront.flushintervalseconds | int | `1` | Wavefront flush interval in seconds. Defaults to 1 |
| config.wavefront.metricname | string | `"falco.alert"` | Metric to be created in Wavefront. Defaults to falco.alert |
| config.wavefront.minimumpriority | string | `"debug"` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.webhook.address | string | `""` | Webhook address, if not empty, Webhook output is *enabled* |
| config.webhook.checkcert | bool | `true` | check if ssl certificate of the output is valid |
| config.webhook.customHeaders | string | `""` | a list of comma separated custom headers to add, syntax is "key:value\,key:value" |
| config.webhook.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.webhook.mutualtls | bool | `false` | if true, checkcert flag will be ignored (server cert will always be checked) |
| config.yandex.accesskeyid | string | `""` | yandex access key |
| config.yandex.region | string | `""` | yandex storage region (default: ru-central-1) |
| config.yandex.s3.bucket | string | `""` | Yandex storage, bucket name |
| config.yandex.s3.endpoint | string | `""` | yandex storage endpoint (default: https://storage.yandexcloud.net) |
| config.yandex.s3.minimumpriority | string | `""` | minimum priority of event to use this output, order is `emergency\|alert\|critical\|error\|warning\|notice\|informational\|debug or ""` |
| config.yandex.s3.prefix | string | `""` | name of prefix, keys will have format: s3://<bucket>/<prefix>/YYYY-MM-DD/YYYY-MM-DDTHH:mm:ss.s+01:00.json |
| config.yandex.secretaccesskey | string | `""` | yandex secret access key |
| extraVolumeMounts | list | `[]` | Extra volume mounts for sidekick deployment |
| extraVolumes | list | `[]` | Extra volumes for sidekick deployment |
| fullnameOverride | string | `""` | Override the name |
| image.pullPolicy | string | `"IfNotPresent"` | The image pull policy |
| image.registry | string | `"docker.io"` | The image registry to pull from |
| image.repository | string | `"falcosecurity/falcosidekick"` | The image repository to pull from |
| image.tag | string | `"2.26.0"` | The image tag to pull |
| imagePullSecrets | list | `[]` | Secrets for the registry |
| ingress.annotations | object | `{}` | Ingress annotations |
| ingress.enabled | bool | `false` | Whether to create the ingress |
| ingress.hosts | list | `[{"host":"falcosidekick.local","paths":[{"path":"/"}]}]` | Ingress hosts |
| ingress.tls | list | `[]` | Ingress TLS configuration |
| nameOverride | string | `""` | Override name |
| nodeSelector | object | `{}` | Sidekick nodeSelector field |
| podAnnotations | object | `{}` | additions annotations on the pods |
| podLabels | object | `{}` | additions labels on the pods |
| podSecurityContext | object | `{"fsGroup":1234,"runAsUser":1234}` | Sidekick pod securityContext |
| podSecurityPolicy | object | `{"create":false}` | podSecurityPolicy |
| podSecurityPolicy.create | bool | `false` | Whether to create a podSecurityPolicy |
| priorityClassName | string | `""` | Name of the priority class to be used by the Sidekickpods, priority class needs to be created beforehand |
| replicaCount | int | `2` | number of running pods |
| resources | object | `{}` | The resources for falcosdekick pods |
| securityContext | object | `{}` | Sidekick container securityContext |
| service.annotations | object | `{}` | Service annotations |
| service.port | int | `2801` | Service port |
| service.type | string | `"ClusterIP"` | Service type |
| tolerations | list | `[]` | Tolerations for pod assignment |
| webui.affinity | object | `{}` | Affinity for the Web UI pods |
| webui.enabled | bool | `false` | enable Falcosidekick-UI |
| webui.externalRedis.enabled | bool | `false` | Enable or disable the usage of an external Redis. Is mutually exclusive with webui.redis.enabled. |
| webui.externalRedis.port | int | `6379` | The port of the external Redis database with RediSearch > v2 |
| webui.externalRedis.url | string | `""` | The URL of the external Redis database with RediSearch > v2 |
| webui.image.pullPolicy | string | `"IfNotPresent"` | The web UI image pull policy |
| webui.image.registry | string | `"docker.io"` | The web UI image registry to pull from |
| webui.image.repository | string | `"falcosecurity/falcosidekick-ui"` | The web UI image repository to pull from |
| webui.image.tag | string | `"v2.0.2"` | The web UI image tag to pull |
| webui.ingress.annotations | object | `{}` | Web UI ingress annotations |
| webui.ingress.enabled | bool | `false` | Whether to create the Web UI ingress |
| webui.ingress.hosts | list | `[{"host":"falcosidekick-ui.local","paths":[{"path":"/"}]}]` | Web UI ingress hosts configuration |
| webui.ingress.tls | list | `[]` | Web UI ingress TLS configuration |
| webui.nodeSelector | object | `{}` | Web UI nodeSelector field |
| webui.podAnnotations | object | `{}` | additions annotations on the pods web UI |
| webui.podLabels | object | `{}` | additions labels on the pods web UI |
| webui.podSecurityContext | object | `{"fsGroup":1234,"runAsUser":1234}` | Web UI pod securityContext |
| webui.priorityClassName | string | `""` | Name of the priority class to be used by the Web UI pods, priority class needs to be created beforehand |
| webui.redis.affinity | object | `{}` | Affinity for the Web UI Redis pods |
| webui.redis.enabled | bool | `true` | Is mutually exclusive with webui.externalRedis.enabled |
| webui.redis.image.pullPolicy | string | `"IfNotPresent"` | The web UI image pull policy |
| webui.redis.image.registry | string | `"docker.io"` | The web UI Redis image registry to pull from |
| webui.redis.image.repository | string | `"redislabs/redisearch"` | The web UI Redis image repository to pull from |
| webui.redis.image.tag | string | `"2.2.4"` | The web UI Redis image tag to pull from |
| webui.redis.nodeSelector | object | `{}` | Web UI Redis nodeSelector field |
| webui.redis.podAnnotations | object | `{}` | additions annotations on the pods |
| webui.redis.podLabels | object | `{}` | additions labels on the pods |
| webui.redis.podSecurityContext | object | `{}` | Web UI Redis pod securityContext |
| webui.redis.priorityClassName | string | `""` | Name of the priority class to be used by the Web UI Redis pods, priority class needs to be created beforehand |
| webui.redis.resources | object | `{}` | The resources for the redis pod |
| webui.redis.securityContext | object | `{}` | Web UI Redis container securityContext |
| webui.redis.service.annotations | object | `{}` | The web UI Redis service annotations (use this to set a internal LB, for example.) |
| webui.redis.service.port | int | `6379` | The web UI Redis service port dor the falcosidekick-ui |
| webui.redis.service.targetPort | int | `6379` | The web UI Redis service targetPort |
| webui.redis.service.type | string | `"ClusterIP"` | The web UI Redis service type (i. e: LoadBalancer) |
| webui.redis.storageClass | string | `""` | Storage class of the PVC for the redis pod |
| webui.redis.storageEnabled | bool | `true` | Enable the PVC for the redis pod |
| webui.redis.storageSize | string | `"1Gi"` | Size of the PVC for the redis pod |
| webui.redis.tolerations | list | `[]` | Tolerations for pod assignment |
| webui.replicaCount | int | `2` | number of running pods |
| webui.resources | object | `{}` | The resources for the web UI pods |
| webui.securityContext | object | `{}` | Web UI container securityContext |
| webui.service.annotations | object | `{}` | The web UI service annotations (use this to set a internal LB, for example.) |
| webui.service.nodePort | int | `30282` | The web UI service nodePort |
| webui.service.port | int | `2802` | The web UI service port dor the falcosidekick-ui |
| webui.service.targetPort | int | `2802` | The web UI service targetPort |
| webui.service.type | string | `"ClusterIP"` | The web UI service type |
| webui.tolerations | list | `[]` | Tolerations for pod assignment |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`.
> **Tip**: You can use the default [values.yaml](values.yaml)

## Metrics

A `prometheus` endpoint can be scrapped at `/metrics`.

