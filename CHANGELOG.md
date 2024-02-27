# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.8.0](https://github.com/redkubes/otomi-core/compare/v2.7.0...v2.8.0) (2024-02-27)


### Features

* update velero to v1.13 ([#1537](https://github.com/redkubes/otomi-core/issues/1537)) ([03933d3](https://github.com/redkubes/otomi-core/commit/03933d3f1a90fd106147d5642c40367edf01ece2))
* velero upgrade script ([#1530](https://github.com/redkubes/otomi-core/issues/1530)) ([41ba4e7](https://github.com/redkubes/otomi-core/commit/41ba4e730c509c5e66e2e8010b617519244da8ee))


### Bug Fixes

* updated resource names in upgrade script ([#1531](https://github.com/redkubes/otomi-core/issues/1531)) ([45adeb3](https://github.com/redkubes/otomi-core/commit/45adeb399f698fdf642474b49b4a7315685733f9))


### CI

* enrich full test case ([#1525](https://github.com/redkubes/otomi-core/issues/1525)) ([fa72758](https://github.com/redkubes/otomi-core/commit/fa72758f9c5401f493fde95488f8a3eb452caea4))

## [2.7.0](https://github.com/redkubes/otomi-core/compare/v2.6.0...v2.7.0) (2024-02-22)


### Features

* add sealed secrets app ([#1463](https://github.com/redkubes/otomi-core/issues/1463)) ([3c74c31](https://github.com/redkubes/otomi-core/commit/3c74c31e7ce9f9f937ddd6fe256492c79b47de4b))
* block public metrics endpoint for Gitea and Keycloak ([#1519](https://github.com/redkubes/otomi-core/issues/1519)) ([46526c2](https://github.com/redkubes/otomi-core/commit/46526c2d268484423fda053fa3d84cc48ca54553))
* disabled trivy infra assesment scanner (node-collector job) ([#1523](https://github.com/redkubes/otomi-core/issues/1523)) ([1e56a3d](https://github.com/redkubes/otomi-core/commit/1e56a3dd1bf715f5345bd51cb8fb013d9f7c9d28))
* improve team permissions ([#1518](https://github.com/redkubes/otomi-core/issues/1518)) ([c045325](https://github.com/redkubes/otomi-core/commit/c045325f7d92e6a6a2d52d39d832927f0119566e))
* add rabbitmq operator ([#1498](https://github.com/redkubes/otomi-core/issues/1498)) ([940bd3a](https://github.com/redkubes/otomi-core/commit/940bd3acc156bab8e4dce7306f377dc6444079dc))
* upgrade velero to v1.12 ([#1508](https://github.com/redkubes/otomi-core/issues/1508)) ([79cc420](https://github.com/redkubes/otomi-core/commit/79cc4209391b24fb21cad581d88f74c9c9399fd1))
* configure cluster backup only if it is enabled ([#1514](https://github.com/redkubes/otomi-core/issues/1514)) ([c5bc84a](https://github.com/redkubes/otomi-core/commit/c5bc84ad002fbe27521009229fd19d9615e8e2ad))
* upgrade velero-plugin-for-microsoft-azure memory limit ([#1524](https://github.com/redkubes/otomi-core/issues/1524)) ([9b403ff](https://github.com/redkubes/otomi-core/commit/9b403ff35de29a911bede5c5069ff4dfc8856527))
* upgrade metrics-server to 0.6.4 ([#1485](https://github.com/redkubes/otomi-core/issues/1485)) ([0425503](https://github.com/redkubes/otomi-core/commit/04255039147f48779730ba357618f51eeb3f8c89))


### Bug Fixes

* add missing beta label to SealedSecrets app ([#1521](https://github.com/redkubes/otomi-core/issues/1521)) ([60632a6](https://github.com/redkubes/otomi-core/commit/60632a63d86e2f2c778db085002c4c0e9b0ea786))
* change extra args metrics-server ([#1520](https://github.com/redkubes/otomi-core/issues/1520)) ([d3bc047](https://github.com/redkubes/otomi-core/commit/d3bc04713e29df933ba7191eddf2ff0edf4778f8))
* memory utilization grafana dashboard ([#1526](https://github.com/redkubes/otomi-core/issues/1526)) ([9323a97](https://github.com/redkubes/otomi-core/commit/9323a9714a83dc78d88802a30f5e986ccfd606a6))
* memory utilization grafana dashboard ([#1526](https://github.com/redkubes/otomi-core/issues/1526)) ([#1527](https://github.com/redkubes/otomi-core/issues/1527)) ([1471b2e](https://github.com/redkubes/otomi-core/commit/1471b2e38e4b387cb6e637d01434d92122f2f02e))
* upgrade script ([#1529](https://github.com/redkubes/otomi-core/issues/1529)) ([30da1f9](https://github.com/redkubes/otomi-core/commit/30da1f9781661bf470b9e7edc4806d29d18aee05))
* upgrade script name typo ([#1512](https://github.com/redkubes/otomi-core/issues/1512)) ([0d311c0](https://github.com/redkubes/otomi-core/commit/0d311c08bcd30e357cd5b42f4c04eb7a92f72ae1))


### Others

* versions ([4723d76](https://github.com/redkubes/otomi-core/commit/4723d76d8fb4d0901d39f1bca9f5ed3874b85543))
