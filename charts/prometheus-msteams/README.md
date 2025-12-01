## Installing the Chart

<!-- vim-markdown-toc GFM -->

- [Download the chart](#download-the-chart)
- [Prepare the Deployment configuration](#prepare-the-deployment-configuration)
- [Deploy to Kubernetes cluster](#deploy-to-kubernetes-cluster)
- [When using with Prometheus Operator](#when-using-with-prometheus-operator)
- [Customise messages to MS Teams](#customise-messages-to-ms-teams)
- [Customise messages per MS Teams Channel](#customise-messages-per-ms-teams-channel)
- [Helm Configuration](#helm-configuration)

<!-- vim-markdown-toc -->


### Download the chart

Clone this repository.

```bash
helm repo add prometheus-msteams https://prometheus-msteams.github.io/prometheus-msteams/
```

### Prepare the Deployment configuration

Create a helm values file to configure your Microsoft Teams channel connectors and customise the Kubernetes deployment.

```yaml
# config.yaml
---
replicaCount: 1
image:
  repository: quay.io/prometheusmsteams/prometheus-msteams
  tag: v1.5.1

connectors:
# in alertmanager, this will be used as http://prometheus-msteams:2000/bar
- bar: https://outlook.office.com/webhook/xxxx/xxxx
# in alertmanager, this will be used as http://prometheus-msteams:2000/foo
- foo: https://outlook.office.com/webhook/xxxx/xxxx

# extraEnvs is useful for adding extra environment variables such as proxy settings
extraEnvs:
  HTTP_PROXY: http://corporateproxy:8080
  HTTPS_PROXY: http://corporateproxy:8080
container:
  additionalArgs:
    - -debug

# Enable metrics for prometheus operator
metrics:
  serviceMonitor:
    enabled: true
    additionalLabels:
      release: prometheus # change this accordingly
    scrapeInterval: 30s
```

See [Helm Configuration](#helm-configuration) and [App Configuration](https://github.com/prometheus-msteams/prometheus-msteams#configuration) for reference.


### Deploy to Kubernetes cluster

```bash
helm upgrade --install prometheus-msteams \
  --namespace default -f config.yaml \
  prometheus-msteams/prometheus-msteams
```

### When using with Prometheus Operator

Please see [Prometheus Operator alerting docs](https://github.com/coreos/prometheus-operator/blob/master/Documentation/user-guides/alerting.md).

### Customise messages to MS Teams

This application uses a [Default Teams Message Card Template](./prometheus-msteams/card.tmpl) to convert incoming Prometheus alerts to teams message cards.
This template can be customised by specifying the value of `customCardTemplate` parameter.
Simply create a new file that you want to use as your custom template (for example, `custom-card.tmpl`).
You can use the `--set-file` flag to set the value from this file:

```bash
helm upgrade --install prometheus-msteams \
  --namespace default -f config.yaml \
  --set-file customCardTemplate=custom-card.tmpl \
  prometheus-msteams/prometheus-msteams
```

Otherwise you can also set the value by specifying the template data directly via values file.

### Customise Messages per MS Teams Channel

This application uses a [Default Teams Message Card Template](./card.tmpl) to convert incoming Prometheus alerts to teams message cards.
To define a custom message template per MS Teams channel you can use the following configuration:

```yaml
connectorsWithCustomTemplates:
  - request_path: /alert2
    webhook_url: https://outlook.office.com/webhook/xxxx/xxxx
    escape_underscores: true
```

Simply create a new file that you want to use as your custom template (for example, `custom-card.tmpl`).
You can use the `--set-file` flag to set the value from this file:

```bash
helm upgrade --install prometheus-msteams \
  --namespace default -f config.yaml \
  --set-file "connectorsWithCustomTemplates[0].template_file=custom-card.tmpl" \
  prometheus-msteams/prometheus-msteams
```

Otherwise you can also set the value by specifying the template data directly via values file:

```yaml
connectorsWithCustomTemplates:
  - request_path: /alert2
    webhook_url: https://outlook.office.com/webhook/xxxx/xxxx
    escape_underscores: true
    template_file: |
      {{ define "teams.card" }}
      {...}
      {{ end }}
```

### Helm Configuration

| Parameter                                  | Description                                                                                                                                                   | Default                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `image.repository`                         | Image repository                                                                                                                                              | `quay.io/prometheusmsteams/prometheus-msteams`  |
| `image.tag`                                | Image tag                                                                                                                                                     | `v1.5.1`                                        |
| `image.pullPolicy`                         | Image pull policy                                                                                                                                             | `Always`                                        |
| `imagePullSecrets`                         | Configuration for [imagePullSecrets](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#create-a-pod-that-uses-your-secret) so that you can use a private registry for your image | `[]` |
| `extraEnvs`                                | Extra environment variables                                                                                                                                   | `{}`                                            |
| `connectors`                               | Add your own Microsoft Teams connectors.                                                                                                                      | `[]`                                            |
| `connectorsWithCustomTemplates`            | Add your own Microsoft Teams connectors with custom template file.                                                                                            | `[]`                                            |
| `service.port`                             | Service port                                                                                                                                                  | `2000`                                          |
| `service.type`                             | Service type                                                                                                                                                  | `ClusterIP`                                     |
| `container.port`                           | Container port                                                                                                                                                | `2000`                                          |
| `container.additionalArgs`                 | additional prometheus-msteams flags to use                                                                                                                    | `{}`                                            |
| `resources`                                | Pod resources                                                                                                                                                 | See [default](./values.yaml)                    |
| `nodeSelector`                             | Pod nodeSelector                                                                                                                                              | `{}`                                            |
| `affinity`                                 | Pod affinity                                                                                                                                                  | `{}`                                            |
| `tolerations`                              | Pod tolerations                                                                                                                                               | `{}`                                            |
| `priorityClassName`                        | Pod priority class                                                                                                                                            | `""`                                            |
| `podAnnotations`                           | Pod annotations                                                                                                                                               | `{}`                                            |
| `podLabels`                                | Labels to add to each pod                                                                                                                                     | `{}`                                            |
| `containerSecurityContext`                 | Pod containerSecurityContext                                                                                                                                  | `{}`                                            |
| `podSecurityContext`                       | Pod securityContext                                                                                                                                           | See [default](./values.yaml)                    |
| `customCardTemplate`                       | Custom message card template for MS teams                                                                                                                     | `""`                                            |
| `metrics.serviceMonitor.enabled`           | Set this to `true` to create ServiceMonitor for Prometheus operator                                                                                           | `false`                                         |
| `metrics.serviceMonitor.additionalLabels`  | Additional labels that can be used so ServiceMonitor will be discovered by Prometheus                                                                         | `{}`                                            |
| `metrics.serviceMonitor.honorLabels`       | honorLabels chooses the metric's labels on collisions with target labels.                                                                                     | `false`                                         |
| `metrics.serviceMonitor.namespace`         | namespace where servicemonitor resource should be created                                                                                                     | `release namespace`                             |
| `metrics.serviceMonitor.namespaceSelector` | [namespaceSelector](https://github.com/coreos/prometheus-operator/blob/v0.34.0/Documentation/api.md#namespaceselector) to configure what namespaces to scrape | `release namespace`                             |
| `metrics.serviceMonitor.scrapeInterval`    | interval between Prometheus scraping                                                                                                                          | `30s`                                           |
| `envFrom`                                  | Externally managed secrets or configmaps to bind environment variables from. Useful in a GitOps setup. Please find examples commented in the 'values.yaml'.   | `{}`                                            |
