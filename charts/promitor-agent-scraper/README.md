# Promitor

[Promitor](https://promitor.io/) is an Azure Monitor scraper for Prometheus providing a scraping endpoint for Prometheus that provides a configured subset of Azure Monitor metrics.

## TL;DR

```console
$ helm repo add promitor https://promitor.azurecr.io/helm/v1/repo
$ helm install promitor/promitor-agent-scraper
```

## Introduction

This chart bootstraps a **Promitor Scraper Agent** deployment on a Kubernetes cluster using the Helm package manager. It will provide the scraper agent with a Kubernetes Service so that other Pods can consume it.

## Prerequisites

- Kubernetes v1.9 or above
- Azure Subscription
- Azure AD Application to authenticate with ([docs](https://promitor.io/configuration/#authentication-with-azure-monitor))

## Installing the Chart

To install the chart with the release name `promitor-agent-scraper`:

```console
$ helm install --name promitor-agent-scraper promitor/promitor-agent-scraper \
               --set azureAuthentication.appId='<azure-ad-app-id>' \
               --set azureAuthentication.appKey='<azure-ad-app-key>' \
               --values /path/to/metric-declaration.yaml
```

The command deploys Prometheus on the Kubernetes cluster with the specified metrics declaration, for more information see [our documentation](https://promitor.io/deployment/#using-our-helm-chart).

## Uninstalling the Chart

To uninstall/delete the `promitor-agent-scraper` deployment:

```console
$ helm delete promitor-agent-scraper
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the Promitor chart and their default values.

| Parameter                  | Description              | Default              |
|:---------------------------|:-------------------------|:---------------------|
| `image.repository`  | Repository which provides the image | `tomkerkhove/promitor-agent-scraper` |
| `image.tag`  | Tag of image to use | `1.0.0`            |
| `image.pullPolicy`  | Policy to pull image | `Always`            |
| `azureAuthentication.appId`  | Id of the Azure AD entity to authenticate with |             |
| `azureAuthentication.appKey`  | Secret of the Azure AD entity to authenticate with |             |
| `prometheus.scrapeEndpointPath`  | Path where the scraping endpoint for Prometheus is being exposed | `/metrics`            |
| `prometheus.enableMetricTimestamps`  | Indication wheter or not to include timestamp | `true`            |
| `prometheus.metricUnavailableValue`  | Value to report in Prometheus when no metric was found wheter or not to include timestamp | `NaN`            |
| `telemetry.applicationInsights.enabled`  | Indication wheter or not to send telemetry to Azure Application Insights | `false`            |
| `telemetry.applicationInsights.logLevel`  | Minimum level of logging for Azure Application Insights |             |
| `telemetry.applicationInsights.key`  | Application Insights instrumentation key |             |
| `telemetry.containerLogs.enabled`  | Indication wheter or not to send telemetry to container logs | `true`            |
| `telemetry.containerLogs.logLevel`  | Minimum level of logging for container logs |  | 
| `telemetry.defaultLogLevel`  | Minimum level of logging for all telemetry sinks, unless specified otherwise | `Error`            |
| `azureMetadata.tenantId`  | Id of Azure tenant |             |
| `azureMetadata.subscriptionId`  | Id of Azure subscription |             |
| `azureMetadata.resourceGroupName`  | Name of resource group | `promitor`            |
| `metricDefaults.aggregation.interval`  | Default interval which defines over what period measurements of a metric should be aggregated | `00:05:00`            |
| `metricDefaults.scraping.schedule`  | Cron expression that controls the fequency in which all the configured metrics will be scraped from Azure Monitor | `*/5 * * * *`            |
| `metrics`  | List of metrics to scrape configured following the [metric declaration docs](https://promitor.io/configuration/metrics/) |        |
| `resources`  | Pod resource requests & limits |    `{}`    |
| `secrets.createSecret`  | Indication if you want to bring your own secret level of logging | `true`            |
| `secrets.appIdSecret`  | Name of the secret for Azure AD identity id | `azure-app-id`            |
| `secrets.appKeySecret`  | Name of the secret for Azure AD identity secret | `azure-app-key`            |
| `service.exposeExternally`  | Indication wheter or not to expose service externally | `false`            |
| `service.port`  | Port on service for other pods to talk to | `8888`            |
| `service.targetPort`  | Port on container to serve traffic | `88`            |
| `service.labelType`  | Label to assign to your service | `infrastructure`            |
| `service.selectorType`  | Selector type to use for the service | `runtime`            |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
$ helm install promitor/promitor-agent-scraper --name promitor-agent-scraper \
               --set azureAuthentication.appId='<azure-ad-app-id>' \
               --set azureAuthentication.appKey='<azure-ad-app-key>' \
               --set azureMetadata.tenantId='<azure-tenant-id>' \
               --set azureMetadata.subscriptionId='<azure-subscription-id>' \
               --values C:\Promitor\metric-declaration.yaml
```

Alternatively, a YAML file that specifies the values for the above parameters can be provided while installing the chart. For example,

```console
$ helm install promitor/promitor-agent-scraper --name promitor-agent-scraper -f values.yaml
```