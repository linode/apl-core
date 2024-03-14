# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.9.0](https://github.com/redkubes/otomi-core/compare/v2.8.0...v2.9.0) (2024-03-14)


### Features

* add support for k8s 1.28 ([#1546](https://github.com/redkubes/otomi-core/issues/1546)) ([a84665b](https://github.com/redkubes/otomi-core/commit/a84665bfd27cd057b35b486df994f2a81bdea2e1))
* always enable argocd app ([#1555](https://github.com/redkubes/otomi-core/issues/1555)) ([71a3e67](https://github.com/redkubes/otomi-core/commit/71a3e67bcc0c762fc3b943f3f597494a4f727473))
* continue installation if the cluster validation cannnot be perf… ([#1538](https://github.com/redkubes/otomi-core/issues/1538)) ([41513c3](https://github.com/redkubes/otomi-core/commit/41513c3e3cf8b35cdcb1c62715689b122b89cea1))
* update velero cli ([#1544](https://github.com/redkubes/otomi-core/issues/1544)) ([7c9c3ce](https://github.com/redkubes/otomi-core/commit/7c9c3cee74571643b3206c22b00bdcaca57fae82))
* whitelist all ingress traffic if team network policies are disa… ([#1540](https://github.com/redkubes/otomi-core/issues/1540)) ([6b4d70d](https://github.com/redkubes/otomi-core/commit/6b4d70de10e9b0ff821c825964f81f7dc12ed17c))


### Bug Fixes

* exclude argocd namespace from podAffinity mutation  ([#1547](https://github.com/redkubes/otomi-core/issues/1547)) ([8a15029](https://github.com/redkubes/otomi-core/commit/8a150293d332dae4ccf58414c4d5c0b329c56aef))
* update paketo builder image ([#1548](https://github.com/redkubes/otomi-core/issues/1548)) ([bb9b50d](https://github.com/redkubes/otomi-core/commit/bb9b50dcbbd1a01e2d3f19ec57f6ead0f6ac0bdd))


### Others

* versions ([30706ff](https://github.com/redkubes/otomi-core/commit/30706ff4e6cf8fce19d78daa781a1abe45c550b3))
* versions ([66ef5eb](https://github.com/redkubes/otomi-core/commit/66ef5eb95133e4cecba15170d3e8cd466b820163))
* versions ([9fea8ac](https://github.com/redkubes/otomi-core/commit/9fea8acc00560572e99459e6790bcb54b0884330))

## [2.8.0](https://github.com/redkubes/otomi-core/compare/v2.7.0...v2.8.0) (2024-02-27)


### Features

* update velero to v1.13 ([#1537](https://github.com/redkubes/otomi-core/issues/1537)) ([03933d3](https://github.com/redkubes/otomi-core/commit/03933d3f1a90fd106147d5642c40367edf01ece2))
* velero upgrade script ([#1530](https://github.com/redkubes/otomi-core/issues/1530)) ([41ba4e7](https://github.com/redkubes/otomi-core/commit/41ba4e730c509c5e66e2e8010b617519244da8ee))


### Bug Fixes

* updated resource names in upgrade script ([#1531](https://github.com/redkubes/otomi-core/issues/1531)) ([45adeb3](https://github.com/redkubes/otomi-core/commit/45adeb399f698fdf642474b49b4a7315685733f9))


### CI

* enrich full test case ([#1525](https://github.com/redkubes/otomi-core/issues/1525)) ([fa72758](https://github.com/redkubes/otomi-core/commit/fa72758f9c5401f493fde95488f8a3eb452caea4))
