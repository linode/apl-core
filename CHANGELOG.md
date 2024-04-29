# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.11.0](https://github.com/redkubes/otomi-core/compare/v2.10.0...v2.11.0) (2024-04-19)


### Features

* disable policy check for velero so restic can access hostpath ([#1581](https://github.com/redkubes/otomi-core/issues/1581)) ([796c5ed](https://github.com/redkubes/otomi-core/commit/796c5edabffad149cc368e1f474aa74f60297b97))
* schema for harbor databases ([#1587](https://github.com/redkubes/otomi-core/issues/1587)) ([6054f4c](https://github.com/redkubes/otomi-core/commit/6054f4c81ced0c279e9362cb5a3c9c45ac51b02c))
* improve upgrade scripts ([#1571](https://github.com/redkubes/otomi-core/issues/1571)) ([bbfd883](https://github.com/redkubes/otomi-core/commit/bbfd88303bee5cf31530b104f3e82c029fdc9bd2))
* upgrade istio to 1.20 ([#1590](https://github.com/redkubes/otomi-core/issues/1590)) ([337a405](https://github.com/redkubes/otomi-core/commit/337a4051b75546b09cbfe48708be196119b3b0cf))


### Bug Fixes

* argocd resource configuration ([#1580](https://github.com/redkubes/otomi-core/issues/1580)) ([cd9c84f](https://github.com/redkubes/otomi-core/commit/cd9c84fb9d992c6ee76d81d4ff1130d1d6219d49))
* remove OLM and argocd-operator related resources ([#1586](https://github.com/redkubes/otomi-core/issues/1586)) ([b17113b](https://github.com/redkubes/otomi-core/commit/b17113b59464c3766c7002329901638e8e7c8a3f))
* removed unused gitlab app ([#1583](https://github.com/redkubes/otomi-core/issues/1583)) ([bd167a9](https://github.com/redkubes/otomi-core/commit/bd167a9177783c47a21c0919c4686db559f1dc65))


## [2.10.0](https://github.com/redkubes/otomi-core/compare/v2.9.0...v2.10.0) (2024-04-05)


### Features

* adjustments to Grafana team permissions ([#1563](https://github.com/redkubes/otomi-core/issues/1563)) ([3d16c1d](https://github.com/redkubes/otomi-core/commit/3d16c1d4cc09a6ff13501e7569b3c7444934774d))
* argocd deployed as chart ([#1568](https://github.com/redkubes/otomi-core/issues/1568)) ([c98f7fe](https://github.com/redkubes/otomi-core/commit/c98f7fe5a315d3baa1278669f013ef5b1626662b))
* make netpols independent of Services ([#1503](https://github.com/redkubes/otomi-core/issues/1503)) ([69b7bbe](https://github.com/redkubes/otomi-core/commit/69b7bbe3783cee3ded1390e0159d331bbe323611))
* remove deprecated storage option for loki and GCS ([#1556](https://github.com/redkubes/otomi-core/issues/1556)) ([d0738e6](https://github.com/redkubes/otomi-core/commit/d0738e6b4a28d7e903556ce39a0c2fbf071c2dc7))


### Bug Fixes

* added runAsUser parameter for velero's node-agent ([#1566](https://github.com/redkubes/otomi-core/issues/1566)) ([0e6d021](https://github.com/redkubes/otomi-core/commit/0e6d021ccfa71a71976c1d19ed9d31aed448c6c3))
* metrics server extra args ([#1570](https://github.com/redkubes/otomi-core/issues/1570)) ([758daae](https://github.com/redkubes/otomi-core/commit/758daae3b282a1a26c1a2bfa82ca840a83e52445))
* opencost gcp schema property is a secret ([#1542](https://github.com/redkubes/otomi-core/issues/1542)) ([c8b5c36](https://github.com/redkubes/otomi-core/commit/c8b5c363b5a824dbeadb822f5943e4adb4cf7d17))
* removed networkpolicy ([#1567](https://github.com/redkubes/otomi-core/issues/1567)) ([a50ad47](https://github.com/redkubes/otomi-core/commit/a50ad475327fe066ee11e531df10b479282e829f))
* removed service account from values changes ([#1565](https://github.com/redkubes/otomi-core/issues/1565)) ([efcc095](https://github.com/redkubes/otomi-core/commit/efcc09588f85c62f3f361666c0f1379e2fc0072a))


### Others

* install dependencies ([#1560](https://github.com/redkubes/otomi-core/issues/1560)) ([c6da7ac](https://github.com/redkubes/otomi-core/commit/c6da7ac50e6179568ea14eb15756b10998b7061d))
* semver compatible chart version for devs ([#1559](https://github.com/redkubes/otomi-core/issues/1559)) ([e9bf224](https://github.com/redkubes/otomi-core/commit/e9bf2240b56b3c91c101e276b4d1165b9ea2f698))
* versions ([1ba02ce](https://github.com/redkubes/otomi-core/commit/1ba02ce305cc71cbe088e8e46c4b678b14a34b6f))

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
