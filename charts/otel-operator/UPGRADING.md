# Upgrade guidelines

## 0.27 to 0.28
[Allow using own self-signed certificate](https://github.com/open-telemetry/opentelemetry-helm-charts/pull/760)

A new flag `admissionWebhooks.autoGenerateCert` has been added. If you want to keep benefiting from the helm generated certificate as in previous versions, you must set `admissionWebhooks.certManager.enabled` to `false` and `admissionWebhooks.autoGenerateCert` to `true`.

## 0.21 to 0.22.0
Kubernetes resource names will now use `{{opentelemetry-operator.fullname}}` as the default value which will change the name of many resources.
Some CI/CD tools might create duplicate resources when upgrading from an older version because of this change.
`fullnameOverride` can be used to keep `deployment` resource consistent with the same name during an upgrade.

## 0.16.0 to 0.17.0
 
The v0.17.0 helm chart version changes OpenTelemetry Collector image to the contrib version. If you want to use the core version, set `manager.collectorImage.repository` to `otel/opentelemetry-collector`.

## 0.15.0 to 0.16.0

Jaeger receiver no longer supports remote sampling. To be able to perform an update, it must be deactivated or replaced by a configuration of the [jaegerremotesampling](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.61.0/extension/jaegerremotesampling) extension.<br/>
It is important that the `jaegerremotesampling` extension and the `jaegerreceiver` do not use the same port.<br/>To increase the collector version afterwards, the update must be triggered again by restarting the operator. Alternatively, the `OpenTelemetryCollector` CRD can be re-created. [otel-contrib#14707](https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/14707)

## 0.13.0 to 0.14.0

[Allow byo webhooks and cert](https://github.com/open-telemetry/opentelemetry-helm-charts/pull/411)

The ability to use admission webhooks has been moved from `admissionWebhooks.enabled` to `admissionWebhooks.create` as it now supports more use cases.

In order to completely disable admission webhooks you need to explicitly set the environment variable `ENABLE_WEBHOOKS: "false"` in `.Values.manager.env` .
