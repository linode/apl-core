# Kured (KUbernetes REboot Daemon)

## Introduction
This chart installs the "Kubernetes Reboot Daemon" using the Helm Package Manager.

## Prerequisites
- Kubernetes 1.9+

## Installing the Chart
To install the chart with the release name `my-release`:
```bash
$ helm repo add kubereboot https://kubereboot.github.io/charts
$ helm install my-release kubereboot/kured
```

## Uninstalling the Chart
To uninstall/delete the `my-release` deployment:
```bash
$ helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrade Notes

### From 3.x to 4.x

We have migrated the code and its release artifacts (helm charts, docker images, manifests) to an
independent organisation named kubereboot. To migrate to 4.x, please adapt your helm repositories.

### From 2.x to 3.x

The Helm chart labels have been realigned to conform with the [standard labels](https://helm.sh/docs/chart_best_practices/labels/#standard-labels) in the current Helm Chart Best Practices guide, so this upgrade will fail unless the DaemonSet is deleted and recreated. The only way that Helm supports delete and recreate is by uninstalling, so please uninstall the Kured Helm chart before installing again with `v3.x`.

If you use any GitOps tool, please check and understand how to do a reinstall beforehand.

Supposing users want to enable metrics and use a `ServiceMonitor` with the `kube-prometheus-stack` chart's default `prometheus` instance. Starting with a chart that has values:

```
metrics:
  create: true
  labels:
    release: kube-prometheus-stack
```

A "ServiceMonitor" needs a "release" label to be discovered by the Prometheus-Operator with the default configuration of `kube-prometheus-stack` and this chart (in the prior `v2.x` chart) already sets a `release` label hardcoded. This is changed by applying the best-practise labels in the chart `v3.x`. Now the user can decide which `release` label-value should be used.

With this update, it's more readily possible to make use of the Kured chart with `kube-prometheus-stack`'s default `ServiceMonitor` selector configuration.

## Migrate from stable Helm-Chart

### From 1.x to 2.x

The following changes have been made compared to the stable chart:
- **[BREAKING CHANGE]** The `autolock` feature was removed. Use `configuration.startTime` and `configuration.endTime` instead.
- Role inconsistencies have been fixed (allowed verbs for modifying the `DaemonSet`, apiGroup of `PodSecurityPolicy`)
- Added support for affinities.
- Configuration of cli-flags can be made through a `configuration` object.
- Added optional `Service` and `ServiceMonitor` support for metrics endpoint.
- Previously static Slack channel, hook URL and username values are now made dynamic using `tpl` function.

## Configuration

| Config                                  | Description                                                                 | Default                   |
| ------                                  | -----------                                                                 | -------                   |
| `image.repository`                      | Image repository                                                            | `ghcr.io/kubereboot/kured`|
| `image.tag`                             | Image tag                                                                   | `1.13.1`                  |
| `image.pullPolicy`                      | Image pull policy                                                           | `IfNotPresent`            |
| `image.pullSecrets`                     | Image pull secrets                                                          | `[]`                      |
| `updateStrategy`                        | Daemonset update strategy                                                   | `RollingUpdate`           |
| `maxUnavailable`                        | The max pods unavailable during a rolling update                            | `1`                       |
| `podAnnotations`                        | Annotations to apply to pods (eg to add Prometheus annotations)             | `{}`                      |
| `dsAnnotations`                         | Annotations to apply to the kured DaemonSet                                 | `{}`                      |
| `extraArgs`                             | Extra arguments to pass to `/usr/bin/kured`. See below.                     | `{}`                      |
| `extraEnvVars`                          | Array of environment variables to pass to the daemonset.                    | `{}`                      |
| `configuration.lockTtl`                 | cli-parameter `--lock-ttl`                                                  | `0`                       |
| `configuration.lockReleaseDelay`        | cli-parameter `--lock-release-delay`                                        | `0`                       |
| `configuration.alertFilterRegexp`       | cli-parameter `--alert-filter-regexp`                                       | `""`                      |
| `configuration.alertFiringOnly`         | cli-parameter `--alert-firing-only`                                         | `false`                   |
| `configuration.blockingPodSelector`     | Array of selectors for multiple cli-parameters `--blocking-pod-selector`    | `[]`                      |
| `configuration.endTime`                 | cli-parameter `--end-time`                                                  | `""`                      |
| `configuration.lockAnnotation`          | cli-parameter `--lock-annotation`                                           | `""`                      |
| `configuration.period`                  | cli-parameter `--period`                                                    | `""`                      |
| `configuration.forceReboot`             | cli-parameter `--force-reboot`                                              | `false`                   |
| `configuration.drainGracePeriod`        | cli-parameter `--drain-grace-period`                                        | `""`                      |
| `configuration.drainTimeout`            | cli-parameter `--drain-timeout`                                             | `""`                      |
| `configuration.skipWaitForDeleteTimeout` | cli-parameter `--skip-wait-for-delete-timeout`                             | `""`                      |
| `configuration.prometheusUrl`           | cli-parameter `--prometheus-url`                                            | `""`                      |
| `configuration.rebootDays`              | Array of days for multiple cli-parameters `--reboot-days`                   | `[]`                      |
| `configuration.rebootSentinel`          | cli-parameter `--reboot-sentinel`                                           | `""`                      |
| `configuration.rebootSentinelCommand`   | cli-parameter `--reboot-sentinel-command`                                   | `""`                      |
| `configuration.rebootCommand`           | cli-parameter `--reboot-command`                                            | `""`                      |
| `configuration.rebootDelay`             | cli-parameter `--reboot-delay`                                              | `""`                      |
| `configuration.slackChannel`            | cli-parameter `--slack-channel`. Passed through `tpl`                       | `""`                      |
| `configuration.slackHookUrl`            | cli-parameter `--slack-hook-url`. Passed through `tpl`                      | `""`                      |
| `configuration.slackUsername`           | cli-parameter `--slack-username`. Passed through `tpl`                      | `""`                      |
| `configuration.notifyUrl`               | cli-parameter `--notify-url`                                                | `""`                      |
| `configuration.messageTemplateDrain`    | cli-parameter `--message-template-drain`                                    | `""`                      |
| `configuration.messageTemplateReboot`   | cli-parameter `--message-template-reboot`                                   | `""`                      |
| `configuration.messageTemplateUncordon` | cli-parameter `--message-template-uncordon`                                 | `""`                      |
| `configuration.startTime`               | cli-parameter `--start-time`                                                | `""`                      |
| `configuration.timeZone`                | cli-parameter `--time-zone`                                                 | `""`                      |
| `configuration.annotateNodes`           | cli-parameter `--annotate-nodes`                                            | `false`                   |
| `configuration.logFormat`               | cli-parameter `--log-format`                                                | `"text"`                  |
| `configuration.preferNoScheduleTaint`   | Taint name applied during pending node reboot                               | `""`                      |
| `configuration.preRebootNodeLabels`     | Array of key-value-pairs to add to nodes before cordoning for multiple cli-parameters `--pre-reboot-node-labels`   | `[]` |
| `configuration.postRebootNodeLabels`    | Array of key-value-pairs to add to nodes after uncordoning for multiple cli-parameters `--post-reboot-node-labels` | `[]` |
| `rbac.create`                           | Create RBAC roles                                                           | `true`                    |
| `serviceAccount.create`                 | Create a service account                                                    | `true`                    |
| `serviceAccount.name`                   | Service account name to create (or use if `serviceAccount.create` is false) | (chart fullname)          |
| `podSecurityPolicy.create`              | Create podSecurityPolicy                                                    | `false`                   |
| `containerSecurityContext.privileged `  | Enables `privileged` in container-specific security context                 | `true`                    |
| `containerSecurityContext.allowPrivilegeEscalation`| Enables `allowPrivilegeEscalation` in container-specific security context. If not set it won't be configured. |  |
| `resources`             | Resources requests and limits.                                                              | `{}`                      |
| `metrics.create`        | Create a ServiceMonitor for prometheus-operator                                             | `false`                   |
| `metrics.namespace`     | The namespace to create the ServiceMonitor in                                               | `""`                      |
| `metrics.labels`        | Additional labels for the ServiceMonitor                                                    | `{}`                      |
| `metrics.interval`      | Interval prometheus should scrape the endpoint                                              | `60s`                     |
| `metrics.scrapeTimeout` | A custom scrapeTimeout for prometheus                                                       | `""`                      |
| `service.create`        | Create a Service for the metrics endpoint                                                   | `false`                   |
| `service.name  `        | Service name for the metrics endpoint                                                       | `""`                      |
| `service.port`          | Port of the service to expose                                                               | `8080`                    |
| `service.annotations`   | Annotations to apply to the service (eg to add Prometheus annotations)                      | `{}`                      |
| `livenessProbe`         | Liveness probe for pods                                                                     | `{"httpGet":{"path":"/metrics","port":"metrics","scheme":"HTTP"},"initialDelaySeconds":10,"periodSeconds":30,"timeoutSeconds":5,"successThreshold":1,"failureThreshold":5}`                      |
| `readinessProbe`        | Readiness probe for pods                                                                    | `{"httpGet":{"path":"/metrics","port":"metrics","scheme":"HTTP"},"initialDelaySeconds":10,"periodSeconds":30,"timeoutSeconds":5,"successThreshold":1,"failureThreshold":5}`                      |
| `podLabels`             | Additional labels for pods (e.g. CostCenter=IT)                                             | `{}`                      |
| `priorityClassName`     | Priority Class to be used by the pods                                                       | `""`                      |
| `tolerations`           | Tolerations to apply to the daemonset (eg to allow running on master)                       | `[{"key": "node-role.kubernetes.io/control-plane", "effect": "NoSchedule"}]` for Kubernetes 1.24.0 and greater, otherwise `[{"key": "node-role.kubernetes.io/master", "effect": "NoSchedule"}]`|
| `affinity`              | Affinity for the daemonset (ie, restrict which nodes kured runs on)                         | `{}`                      |
| `hostNetwork`           | Pod uses the host network instead of the cluster network                                    | `true`                    |
| `nodeSelector`          | Node Selector for the daemonset (ie, restrict which nodes kured runs on)                    | `{ "kubernetes.io/os": "linux" }` |
| `volumeMounts`          | Maps of volumes mount to mount                                                              | `{}`                      |
| `volumes`               | Maps of volumes to mount                                                                    | `{}`                      |
| `initContainers`        | Define initContainers for DaemonSet                                                         | `{}`                      |
See https://github.com/kubereboot/kured#configuration for values (not contained in the `configuration` object) for `extraArgs`. Note that
```yaml
extraArgs:
  foo: 1
  bar-baz: 2
```
becomes `/usr/bin/kured ... --foo=1 --bar-baz=2`.

## Prometheus Metrics

Kured exposes a single prometheus metric indicating whether a reboot is required or not (see [kured docs](https://github.com/kubereboot/kured#prometheus-metrics)) for details.

#### Prometheus-Operator

```yaml
metrics:
  create: true
```

#### Prometheus Annotations

```yaml
service:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "8080"
```
