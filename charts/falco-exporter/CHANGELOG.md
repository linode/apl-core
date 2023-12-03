# Change Log

This file documents all notable changes to `falco-exporter` Helm Chart. The release
numbering uses [semantic versioning](http://semver.org).

## v0.9.7

* noop change just to test the ci

## v0.9.6

### Minor Changes

* Bump falco-exporter to v0.8.3

## v0.9.5

### Minor Changes

* Removed unnecessary capabilities from security context
* Setted filesystem on read-only

## v0.9.4

### Minor Changes

* Add options to configure readiness/liveness probe values

## v0.9.3

### Minor Changes

* Bump falco-exporter to v0.8.2

## v0.9.2

### Minor Changes

* Add option to place Grafana dashboard in a folder

## v0.9.1

### Minor Changes

* Fix PSP allowed host path prefix to match grpc socket path change.

## v0.8.3

### Major Changes

* Changing the grpc socket path from `unix:///var/run/falco/falco.soc` to `unix:///run/falco/falco.sock`.

### Minor Changes

* Bump falco-exporter to v0.8.0

## v0.8.2

### Minor Changes

* Support configuration of updateStrategy of the Daemonset

## v0.8.0

* Upgrade falco-exporter version to v0.7.0 (see the [falco-exporter changelog](https://github.com/falcosecurity/falco-exporter/releases/tag/v0.7.0)) 

### Major Changes

* Add option to add labels to the Daemonset pods

## v0.7.2

### Minor Changes

* Add option to add labels to the Daemonset pods

## v0.7.1

### Minor Changes

* Fix `FalcoExporterAbsent` expression

## v0.7.0

### Major Changes

* Adds ability to create custom PrometheusRules for alerting

## v0.6.2

## Minor Changes

* Add Check availability of 'monitoring.coreos.com/v1' api version

## v0.6.1

### Minor Changes

* Add option the add annotations to the Daemonset

## v0.6.0

### Minor Changes

* Upgrade falco-exporter version to v0.6.0 (see the [falco-exporter changelog](https://github.com/falcosecurity/falco-exporter/releases/tag/v0.6.0))

## v0.5.2

### Minor changes

* Make image registry configurable

## v0.5.1

* Display only non-zero rates in Grafana dashboard template

## v0.5.0

### Minor Changes

* Upgrade falco-exporter version to v0.5.0
* Add metrics about Falco drops
* Make `unix://` prefix optional

## v0.4.2

### Minor Changes

* Fix Prometheus datasource name reference in grafana dashboard template

## v0.4.1

### Minor Changes

* Support release namespace configuration

## v0.4.0

### Mayor Changes

* Add Mutual TLS for falco-exporter enable/disabled feature

## v0.3.8

### Minor Changes

* Replace extensions apiGroup/apiVersion because of deprecation

## v0.3.7

### Minor Changes

* Fixed falco-exporter PSP by allowing secret volumes

## v0.3.6

### Minor Changes

* Add SecurityContextConstraint to allow deploying in Openshift

## v0.3.5

### Minor Changes

* Added the possibility to automatically add a PSP (in combination with a Role and a RoleBindung) via the podSecurityPolicy values
* Namespaced the falco-exporter ServiceAccount and Service

## v0.3.4

### Minor Changes

* Add priorityClassName to values

## v0.3.3

### Minor Changes

* Add grafana dashboard to helm chart

## v0.3.2

### Minor Changes

* Fix for additional labels for falco-exporter servicemonitor

## v0.3.1

### Minor Changes

* Added the support to deploy a Prometheus Service Monitor. Is disables by default.

## v0.3.0

### Major Changes

* Chart moved to [falcosecurity/charts](https://github.com/falcosecurity/charts) repository
* gRPC over unix socket support (by default)
* Updated falco-exporter version to `0.3.0`

### Minor Changes

* README.md and CHANGELOG.md added
