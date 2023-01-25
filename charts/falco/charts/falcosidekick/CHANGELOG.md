# Change Log

This file documents all notable changes to Falcosidekick Helm Chart. The release
numbering uses [semantic versioning](http://semver.org).

Before release 0.1.20, the helm chart can be found in `falcosidekick` [repository](https://github.com/falcosecurity/falcosidekick/tree/master/deploy/helm/falcosidekick).

## 0.5.9

* Fix: remove `namespace` from `clusterrole` and `clusterrolebinding` metadata

## 0.5.8

* Support `storageEnabled` for `redis` to allow ephemeral installs

## 0.5.7

* Removing unused Kafka config values

## 0.5.6

* Fixing Syslog's port import in `secrets.yaml`

## 0.5.5

* Add `webui.externalRedis` with `enabled`, `url` and `port` to values to set an external Redis database with RediSearch > v2 for the WebUI
* Add `webui.redis.enabled` option to disable the deployment of the database.
* `webui.redis.enabled ` and `webui.externalRedis.enabled` are mutually exclusive

## 0.5.4

* Upgrade image to fix Panic of `Prometheus` output when `customfields` is set
* Add `extralabels` for `Loki` and `Prometheus` outputs to set fields to use as labels
* Add `expiresafter` for `AlertManager` output

## 0.5.3

* Support full configuration of `securityContext` blocks in falcosidekick and falcosidekick-ui deployments, and redis statefulset.

## 0.5.2

* Update Falcosidekick-UI image (fix wrong redirect to localhost when an ingress is used)

## 0.5.1

* Support `ingressClassName` field in falcosidekick ingresses.

## 0.5.0

### Major Changes

* Add `Policy Report` output
* Add `Syslog` output
* Add `AWS Kinesis` output
* Add `Zoho Cliq` output
* Support IRSA for AWS authentication
* Upgrade Falcosidekick-UI to v2.0.1

### Minor changes

* Allow to set custom Labels for pods

## 0.4.5

* Allow additional service-ui annotations

## 0.4.4

* Fix output after chart installation when ingress is enable

## 0.4.3

* Support `annotation` block in service

## 0.4.2

* Fix: Added the rule to use the podsecuritypolicy
* Fix: Added `ServiceAccountName` to the UI deployment

## 0.4.1

* Removes duplicate `Fission` keys from secret

## 0.4.0

### Major Changes

* Support Ingress API version `networking.k8s.io/v1`, see `ingress.hosts` and `webui.ingress.hosts` in [values.yaml](values.yaml) for a breaking change in the `path` parameter

## 0.3.17

* Fix: Remove the value for bucket of `Yandex S3`, it enabled the output by default

## 0.3.16

### Major Changes

* Fix: set correct new image 2.24.0

## 0.3.15

### Major Changes

* Add `Fission` output

## 0.3.14

### Major Changes

* Add `Grafana` output
* Add `Yandex Cloud S3` output
* Add `Kafka REST` output

### Minor changes

* Docker image is now available on AWS ECR Public Gallery (`--set image.registry=public.ecr.aws`)

## 0.3.13

### Minor changes

* Enable extra volumes and volumemounts for `falcosidekick` via values

## 0.3.12

* Add AWS configuration field `config.aws.rolearn`

## 0.3.11

### Minor changes

* Make image registries for `falcosidekick` and `falcosidekick-ui` configurable

## 0.3.10

### Minor changes

* Fix table formatting in `README.md`

## 0.3.9

### Fixes

* Add missing `imagePullSecrets` in `falcosidekick/templates/deployment-ui.yaml`

## 0.3.8

### Major Changes

* Add `GCP Cloud Run` output
* Add `GCP Cloud Functions` output
* Add `Wavefront` output
* Allow MutualTLS for some outputs
* Add basic auth for Elasticsearch output

## 0.3.7

### Minor changes

* Fix table formatting in `README.md`
* Fix `config.azure.eventHub` parameter name in `README.md`

## 0.3.6

### Fixes

* Point to the correct name of aadpodidentnity

## 0.3.5

### Minor Changes

* Fix link to Falco in the `README.md`

## 0.3.4

### Major Changes

* Bump up version (`v1.0.1`) of image for `falcosidekick-ui`

## 0.3.3

### Minor Changes

* Set default values for `OpenFaaS` output type parameters
* Fixes of documentation

## 0.3.2

### Fixes

* Add config checksum annotation to deployment pods to restart pods on config change
* Fix statsd config options in the secret to make them match the docs

## 0.3.1

### Fixes

* Fix for `s3.bucket`, it should be empty

## 0.3.0

### Major Changes

* Add `AWS S3` output
* Add `GCP Storage` output
* Add `RabbitMQ` output
* Add `OpenFaas` output

## 0.2.9

### Major Changes

* Updated falcosidekuck-ui default image version to `v0.2.0`

## 0.2.8

### Fixes

* Fixed to specify `kafka.hostPort` instead of `kafka.url`

## 0.2.7

### Fixes

* Fixed missing hyphen in podidentity

## 0.2.6

### Fixes

* Fix repo and tag for `ui` image

## 0.2.5

### Major Changes

* Add `CLOUDEVENTS` output
* Add `WEBUI` output

### Minor Changes

* Add details about syntax for adding `custom_fields`

## 0.2.4

### Minor Changes

* Add `DATADOG_HOST` to secret

## 0.2.3

### Minor Changes

* Allow additional pod annotations
* Remove namespace condition in aad-pod-identity

## 0.2.2

### Major Changes

* Add `Kubeless` output

## 0.2.1

### Major Changes

* Add `PagerDuty` output

## 0.2.0

### Major Changes

* Add option to use an existing secret
* Add option to add extra environment variables
* Add `Stan` output

### Minor Changes

* Use the Existing secret resource and add all possible variables to there, and make it simpler to read and less error-prone in the deployment resource

## 0.1.37

### Minor Changes

* Fix aws keys not being added to the deployment

## 0.1.36

### Minor Changes

* Fix helm test

## 0.1.35

### Major Changes

* Update image to use release 2.19.1

## 0.1.34

* New outputs can be set : `Kafka`, `AWS CloudWatchLogs`

## 0.1.33

### Minor Changes

* Fixed GCP Pub/Sub values references in `deployment.yaml`

## 0.1.32

### Major Changes

* Support release namespace configuration

## 0.1.31

### Major Changes

* New outputs can be set : `Googlechat`

## 0.1.30

### Major changes

* New output can be set : `GCP PubSub`
* Custom Headers can be set for `Webhook` output
* Fix typo `aipKey` for OpsGenie output

## 0.1.29

* Fix falcosidekick configuration table to use full path of configuration properties in the `README.md`

## 0.1.28

### Major changes

* New output can be set : `AWS SNS`
* Metrics in `prometheus` format can be scrapped from `/metrics` URI

## 0.1.27

### Minor Changes

* Replace extensions apiGroup/apiVersion because of deprecation

## 0.1.26

### Minor Changes

* Allow the creation of a PodSecurityPolicy, disabled by default

## 0.1.25

### Minor Changes

* Allow the configuration of the Pod securityContext, set default runAsUser and fsGroup values

## 0.1.24

### Minor Changes

* Remove duplicated `webhook` block in `values.yaml`

## 0.1.23

* fake release for triggering CI for auto-publishing

## 0.1.22

### Major Changes

* Add `imagePullSecrets`

## 0.1.21

### Minor Changes

* Fix `Azure Indentity` case sensitive value

## 0.1.20

### Major Changes

* New outputs can be set : `Azure Event Hubs`, `Discord`

### Minor Changes

* Fix wrong port name in output

## 0.1.17

### Major Changes

* New outputs can be set : `Mattermost`, `Rocketchat`

## 0.1.11

### Major Changes

* Add Pod Security Policy

## 0.1.11

### Minor Changes

* Fix wrong value reference for Elasticsearch output in deployment.yaml

## 0.1.10

### Major Changes

* New output can be set : `DogStatsD`

## 0.1.9

### Major Changes

* New output can be set : `StatsD`

## 0.1.7

### Major Changes

* New output can be set : `Opsgenie`

## 0.1.6

### Major Changes

* New output can be set : `NATS`

## 0.1.5

### Major Changes

* `Falcosidekick` and its chart are now part of `falcosecurity` organization

## 0.1.4

### Minor Changes

* Use more recent image with `Golang` 1.14

## 0.1.3

### Major Changes

* New output can be set : `Loki`

## 0.1.2

### Major Changes

* New output can be set : `SMTP`

## 0.1.1

### Major Changes

* New outputs can be set : `AWS Lambda`, `AWS SQS`, `Teams`

## 0.1.0

### Major Changes

* Initial release of Falcosidekick Helm Chart
