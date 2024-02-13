# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.6.0](https://github.com/redkubes/otomi-core/compare/v2.5.0...v2.6.0) (2024-02-13)


### Features

* download otomi values ([#1510](https://github.com/redkubes/otomi-core/issues/1510)) ([3bd8ce3](https://github.com/redkubes/otomi-core/commit/3bd8ce3f363808fbfb677300a00d541b200b1c38))


### CI

* fix scheduled deletion of scaleway cluster and private networks ([#1507](https://github.com/redkubes/otomi-core/issues/1507)) ([52eae23](https://github.com/redkubes/otomi-core/commit/52eae23e76198b5aa9dc57a65b4e5456bdf37a30))

## [2.5.0](https://github.com/redkubes/otomi-core/compare/v2.4.0...v2.5.0) (2024-02-09)


### Bug Fixes

* ensure argo sync properly external-secrets ([#1501](https://github.com/redkubes/otomi-core/issues/1501)) ([09a7272](https://github.com/redkubes/otomi-core/commit/09a72727bff671b156c5861938f2d33c93b84f97))
* harbor auto-onboard ([#1509](https://github.com/redkubes/otomi-core/issues/1509)) ([2ad72de](https://github.com/redkubes/otomi-core/commit/2ad72ded34c8ee865c5b8fd5dcec7ce2d266c5ee))


### CI

* deploy scaleway cluster ([#1483](https://github.com/redkubes/otomi-core/issues/1483)) ([5d8022c](https://github.com/redkubes/otomi-core/commit/5d8022cff23ab689f2f0ca192d60f5faed181d63))
* reworked cluster and private network deletion ([#1505](https://github.com/redkubes/otomi-core/issues/1505)) ([036cecc](https://github.com/redkubes/otomi-core/commit/036cecc33064977bd20bafd48d12a662c1eb79a6))

## [2.4.0](https://github.com/redkubes/otomi-core/compare/v2.3.0...v2.4.0) (2024-02-05)


### Features
* add k8s attributes processor to otel collector ([#1464](https://github.com/redkubes/otomi-core/issues/1464)) ([b84a460](https://github.com/redkubes/otomi-core/commit/b84a460b9317a10614589f2e0735d016bab47583))
* add support for linode DNS ([#1365](https://github.com/redkubes/otomi-core/issues/1365)) ([75bada4](https://github.com/redkubes/otomi-core/commit/75bada4b7c9564541bec5fd9c241c804fb17067b))
* increase wait time for keycloak ([#1476](https://github.com/redkubes/otomi-core/issues/1476)) ([cbbb9d3](https://github.com/redkubes/otomi-core/commit/cbbb9d35dbe51b8e2407a8b38e77713195ff2ba2))
* scan source code before build ([#1465](https://github.com/redkubes/otomi-core/issues/1465)) ([9c3b77a](https://github.com/redkubes/otomi-core/commit/9c3b77a3723f44c19e696e780cc2a6913ccc5ab0))
* set pod dns for jobs ([#1482](https://github.com/redkubes/otomi-core/issues/1482)) ([7ceaae1](https://github.com/redkubes/otomi-core/commit/7ceaae192940052c07ee146d4d346aa96433f343))
* upgrade keycloak to 22.0.4 ([#1469](https://github.com/redkubes/otomi-core/issues/1469)) ([2861eb4](https://github.com/redkubes/otomi-core/commit/2861eb463eb6ecf603e39d3a02c62a8b09fe850a))


### Bug Fixes
* linode provider ([#1477](https://github.com/redkubes/otomi-core/issues/1477)) ([55364eb](https://github.com/redkubes/otomi-core/commit/55364eb2f512c7bd17ff188e556f04fe3153b5d3))
* linode webhook ([#1478](https://github.com/redkubes/otomi-core/issues/1478)) ([ec44ad5](https://github.com/redkubes/otomi-core/commit/ec44ad5e08937d1e48326c5c1b0a8976d3804b93))
* node selector with argocd ([#1475](https://github.com/redkubes/otomi-core/issues/1475)) ([b83eec4](https://github.com/redkubes/otomi-core/commit/b83eec453a0ff97f11bb04bfbc45e3de7887ee15))
* set tls for metrics-server ([#1499](https://github.com/redkubes/otomi-core/issues/1499)) ([83d6e12](https://github.com/redkubes/otomi-core/commit/83d6e12c7dd0eb2f7053de511ae8077042c5b2d5))
* tempo manifests that depends on loki ([#1500](https://github.com/redkubes/otomi-core/issues/1500)) ([9544378](https://github.com/redkubes/otomi-core/commit/954437861b6f0d58f870f71a18d5edc4dad99460))
* update readme ([36ed862](https://github.com/redkubes/otomi-core/commit/36ed86285703b5de4f8042276c49c8fda546b0b1))

### CI
* azure marketplace ([#1473](https://github.com/redkubes/otomi-core/issues/1473)) ([a9396a8](https://github.com/redkubes/otomi-core/commit/a9396a80cf5f408f1f4ff8a098d072d89e4cbf7b))
* digitalocean release ([#1472](https://github.com/redkubes/otomi-core/issues/1472)) ([b5bf1ec](https://github.com/redkubes/otomi-core/commit/b5bf1ece26aaa558b2d11192cfe123c73930fc32))

## [2.3.0](https://github.com/redkubes/otomi-core/compare/v2.2.0...v2.3.0) (2024-01-12)


### Features

* always install prometheus and alertmanger operator ([#1461](https://github.com/redkubes/otomi-core/issues/1461)) ([26121a9](https://github.com/redkubes/otomi-core/commit/26121a97fb6605532498e7e7a8f69d67015c5498))
* increase default harbor and keycloak db disk size ([#1460](https://github.com/redkubes/otomi-core/issues/1460)) ([7cf64d3](https://github.com/redkubes/otomi-core/commit/7cf64d34cc19b8585ae63a127d40a842b1abff82))


### Bug Fixes

* buildpacks source subpath ([#1454](https://github.com/redkubes/otomi-core/issues/1454)) ([6886845](https://github.com/redkubes/otomi-core/commit/68868454ab4402636d677122cd3a4fd2bdfd010c))
* ksvc url ([#1458](https://github.com/redkubes/otomi-core/issues/1458)) ([f03c9a1](https://github.com/redkubes/otomi-core/commit/f03c9a1554e833065ada3cce35015634225eca94))
* tekton platform path ([#1453](https://github.com/redkubes/otomi-core/issues/1453)) ([f046a6e](https://github.com/redkubes/otomi-core/commit/f046a6e3204183c965f0fec25ee16405e353f882))


### CI

* added Otomi Helm chart installation test job ([#1436](https://github.com/redkubes/otomi-core/issues/1436)) ([25909fc](https://github.com/redkubes/otomi-core/commit/25909fc4522ec5504ac1633ebf836af6140cf4d9))
* change created to published ([#1457](https://github.com/redkubes/otomi-core/issues/1457)) ([c5b59fe](https://github.com/redkubes/otomi-core/commit/c5b59fea102340e9a2b105b71c3286ed686bd17c))


### Others

* update readme  ([#1451](https://github.com/redkubes/otomi-core/issues/1451)) [ci skip] ([b814602](https://github.com/redkubes/otomi-core/commit/b814602e68168e085e5433bec26197e8acd6ab08))
* versions ([214de43](https://github.com/redkubes/otomi-core/commit/214de434e47dbf71c5b52c055787cfdc7e4212eb))
* versions ([4c09d08](https://github.com/redkubes/otomi-core/commit/4c09d080d9be092eb7c5f93e31ced0a6e9914a9a))
