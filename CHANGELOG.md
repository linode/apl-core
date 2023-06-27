# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.21.6](https://github.com/redkubes/otomi-core/compare/v0.21.5...v0.21.6) (2023-06-27)


### Features

* add custom request headers ([#1160](https://github.com/redkubes/otomi-core/issues/1160)) ([89c77fa](https://github.com/redkubes/otomi-core/commit/89c77fad1e7c0d73823cd885239684e2e0c6b3db))
* allow to configure istio mesh config ([#1163](https://github.com/redkubes/otomi-core/issues/1163)) ([3ce405d](https://github.com/redkubes/otomi-core/commit/3ce405d281ad569ad09f69bcdda60888fd2b04b1))

### [0.21.5](https://github.com/redkubes/otomi-core/compare/v0.21.4...v0.21.5) (2023-06-19)


### Bug Fixes

* service account for generating kubeconfig ([#1147](https://github.com/redkubes/otomi-core/issues/1147)) ([0459aa4](https://github.com/redkubes/otomi-core/commit/0459aa4556d021622d5c7e93c169fa662e90f55c))

### [0.21.4](https://github.com/redkubes/otomi-core/compare/v0.21.3...v0.21.4) (2023-06-02)


### Features

* define kubectl SA for each team ([#1140](https://github.com/redkubes/otomi-core/issues/1140)) ([af009b2](https://github.com/redkubes/otomi-core/commit/af009b2aa8d26aba84f710c99321238e7f0c55c2))

### [0.21.3](https://github.com/redkubes/otomi-core/compare/v0.21.2...v0.21.3) (2023-06-01)


### Others

* upgrade api version ([6a13717](https://github.com/redkubes/otomi-core/commit/6a1371716564f133fef7fb0e3471aadf718dc594))

### [0.21.2](https://github.com/redkubes/otomi-core/compare/v0.21.1...v0.21.2) (2023-05-29)


### Bug Fixes

* schema with supported k8s versions ([0013ac4](https://github.com/redkubes/otomi-core/commit/0013ac4513b3fde90b44f9dc273807bd43807872))


### Others

* versions ([2feebb8](https://github.com/redkubes/otomi-core/commit/2feebb8c1f72bec564ba60714ebd56695e5df6aa))
* versions ([7c98e87](https://github.com/redkubes/otomi-core/commit/7c98e871fab2a5b8491f0c1bf136e255e3ecd62a))

### [0.21.1](https://github.com/redkubes/otomi-core/compare/v0.21.0...v0.21.1) (2023-05-17)


### Features

* license as secret in schema ([6ca35f3](https://github.com/redkubes/otomi-core/commit/6ca35f315d753badf6da3c9d21917ed50ee9c5ad))


### Bug Fixes

* changed version names ([9ddf47d](https://github.com/redkubes/otomi-core/commit/9ddf47dd9f79c030368da8d8edacee10ee821a24))
* reverted versions ([95f8827](https://github.com/redkubes/otomi-core/commit/95f8827e1cf88d13d50c13eab40f8d516681f31e))


### Tests

* add license fixtures ([6bec98c](https://github.com/redkubes/otomi-core/commit/6bec98ce2be1e63a6ac16c21f11c6f47ead2d026))


### Others

* set versions ([d9c5c59](https://github.com/redkubes/otomi-core/commit/d9c5c593a78ec0194261e0ffad4c7d11ea2211aa))

## [0.21.0](https://github.com/redkubes/otomi-core/compare/v0.20.0-pre...v0.21.0) (2023-05-12)


### ⚠ BREAKING CHANGES

* Knative service will no longer be deployed in the team-ns chart. Users can migrate
their knative services to the team workloads.

### Features
* add new Otomi UI
* add db migration tool ([#1080](https://github.com/redkubes/otomi-core/issues/1080)) ([644145e](https://github.com/redkubes/otomi-core/commit/644145ea43799ec66f0e7decc2257400d68ec6f1))
* bootstrap values repo with custom files ([#1079](https://github.com/redkubes/otomi-core/issues/1079)) ([e922932](https://github.com/redkubes/otomi-core/commit/e92293274f6730f57fbe4d204d8587cfd23c80c1)), closes [unassigned-issues/#563](https://github.com/unassigned-issues/otomi-core/issues/563)
* allow to disable individual prometheus rules ([#1098](https://github.com/redkubes/otomi-core/issues/1098)) ([1461540](https://github.com/redkubes/otomi-core/commit/146154025c5418493307c4b73b7e1bd26e8d670f))
* build container images from source code with Tekton ([#1113](https://github.com/redkubes/otomi-core/issues/1113)) ([b5b0ba7](https://github.com/redkubes/otomi-core/commit/b5b0ba763bd11f6ca1776728102377f35354c9c3))
* expose metrics about vulnerabilies found by Trivy ([#1063](https://github.com/redkubes/otomi-core/issues/1063)) ([17027a7](https://github.com/redkubes/otomi-core/commit/17027a78c7410b026e4ffaf7872aaadfc955ac7c))
* generate certificate for the harbor service token ([#1114](https://github.com/redkubes/otomi-core/issues/1114)) ([08918e1](https://github.com/redkubes/otomi-core/commit/08918e18be87004315716c4c10c1c1bf2beaf9fd))
* define OLM channel for for Argo operator ([#1102](https://github.com/redkubes/otomi-core/issues/1102)) ([e916c19](https://github.com/redkubes/otomi-core/commit/e916c19083ba9451a7094666ef0e4632f82804ee))
* expost metrics about team resource usage with opencost ([#1105](https://github.com/redkubes/otomi-core/issues/1105)) ([a08da6d](https://github.com/redkubes/otomi-core/commit/a08da6d3782353362fe7ac3da3ecfc981bcb0f9b))
* support scaleway provider ([#1108](https://github.com/redkubes/otomi-core/issues/1108)) ([c718fe3](https://github.com/redkubes/otomi-core/commit/c718fe32e239a4790688108772c0a0f620a2b059))
* always deploy Otomi the multi-tenant enabled flag ([#1073](https://github.com/redkubes/otomi-core/issues/1073)) ([8c8881f](https://github.com/redkubes/otomi-core/commit/8c8881fc23ebe9927c4ec217971fd01418d4bc14))
* support knative predeployed flag ([#1112](https://github.com/redkubes/otomi-core/issues/1112)) ([637204e](https://github.com/redkubes/otomi-core/commit/637204e1a29c009fd97945c9d1c7bafdc9c3698d))
* all teams to backup their PVs with Velero ([#1089](https://github.com/redkubes/otomi-core/issues/1089)) ([6783c78](https://github.com/redkubes/otomi-core/commit/6783c7895b856081efe4c35b13a0c9e4822cee6f))
* upgrade Cert manager ([#1076](https://github.com/redkubes/otomi-core/issues/1076)) ([1a0e6ad](https://github.com/redkubes/otomi-core/commit/1a0e6adc0b5d5ac0c011a7147ab2fdf000730e4c))
* upgrade Harbor to version 2.6.4 ([#1083](https://github.com/redkubes/otomi-core/issues/1083)) ([bb4c7e4](https://github.com/redkubes/otomi-core/commit/bb4c7e45ce88e4d56542775b930a2217c010a588))
* upgrade Istio operator to version 1.16.4 ([#1087](https://github.com/redkubes/otomi-core/issues/1087)) ([886492b](https://github.com/redkubes/otomi-core/commit/886492bc35a9c95aa113c47f3dadb1936691f559))
* upgrade Gitea to version 1.19.1 ([#1096](https://github.com/redkubes/otomi-core/issues/1096)) ([f1ce10b](https://github.com/redkubes/otomi-core/commit/f1ce10b3c02598906a38c2d85f835acd678531d8))
* set harbor priorirty class and update strategy ([#1095](https://github.com/redkubes/otomi-core/issues/1095)) ([cf1b489](https://github.com/redkubes/otomi-core/commit/cf1b489c5ffb3dfecdd4cbd0c84a6469a7adaa20))


### Bug Fixes

* increase default resource request and limits for Trivy ([#1100](https://github.com/redkubes/otomi-core/issues/1100)) ([0f83d9a](https://github.com/redkubes/otomi-core/commit/0f83d9a22417c07b0ded54287df229288b6001f2))
* parsing aws region (Velero) ([#1084](https://github.com/redkubes/otomi-core/issues/1084)) ([122b403](https://github.com/redkubes/otomi-core/commit/122b40303d9bc1aba26efc7109dbfd2572bc001c))
* ensure response headers to be quoted ([#1103](https://github.com/redkubes/otomi-core/issues/1103)) ([ff4ce25](https://github.com/redkubes/otomi-core/commit/ff4ce25ebf53e77ea9ecfd8bf7c99e3232d5247f))
* bootstrap Gitea password (fixes [#926](https://github.com/redkubes/otomi-core/issues/926)) ([#1055](https://github.com/redkubes/otomi-core/issues/1055)) ([b8f443a](https://github.com/redkubes/otomi-core/commit/b8f443a69d1c401fec660e275024a9dd7d0bcd6c))
* parsing Harbor S3 storage ([#1068](https://github.com/redkubes/otomi-core/issues/1068)) ([5a73681](https://github.com/redkubes/otomi-core/commit/5a7368171bb2e1c7d890aac28169c007df519528))
* parsing Harbor S3 storage ([#1085](https://github.com/redkubes/otomi-core/issues/1085)) ([93141b9](https://github.com/redkubes/otomi-core/commit/93141b9f67cdbeaeec24363b22c78e548ee2ae83))
* integration test vector ([#1091](https://github.com/redkubes/otomi-core/issues/1091)) ([e7d3f5b](https://github.com/redkubes/otomi-core/commit/e7d3f5b26fd24b32256a410b7af2cc20c1614941))
* kured raw values ([#1070](https://github.com/redkubes/otomi-core/issues/1070)) ([90162a3](https://github.com/redkubes/otomi-core/commit/90162a3cdf616fcde4273edec862fa5823a65db0))
* team billing quota defaults ([#1109](https://github.com/redkubes/otomi-core/issues/1109)) ([1626e96](https://github.com/redkubes/otomi-core/commit/1626e96071cbd86892a942bca1e40dcf3a06a949))


### Tests

* k8s 1.25 and values with team settings ([#1086](https://github.com/redkubes/otomi-core/issues/1086)) ([1336de8](https://github.com/redkubes/otomi-core/commit/1336de88d9e1b30dea99d0d9ab9e633b671c9cb8))
* k8s option for 1.23 ([#1099](https://github.com/redkubes/otomi-core/issues/1099)) ([e9d471b](https://github.com/redkubes/otomi-core/commit/e9d471b1cfd219c143d9f86b2f4db147b31a0f28))


### Docs

* helm command ([#1074](https://github.com/redkubes/otomi-core/issues/1074)) ([2d800c5](https://github.com/redkubes/otomi-core/commit/2d800c5e3c22310eaff96348d1eee0b3bb6e77db))
* update readme ([#1117](https://github.com/redkubes/otomi-core/issues/1117)) ([cc192ad](https://github.com/redkubes/otomi-core/commit/cc192adc4f129b79bac7830da735b6c407e4a1c6))


### Others

* update deprecated Gihub actions pipeline ([#1107](https://github.com/redkubes/otomi-core/issues/1107)) ([e1c6932](https://github.com/redkubes/otomi-core/commit/e1c693266b605e7ea0182f2dcb21344b84dbd34d))
* update deprecated functions used Gihub actions pipeline ([#1090](https://github.com/redkubes/otomi-core/issues/1090)) ([35a63eb](https://github.com/redkubes/otomi-core/commit/35a63eb3c8510e3ba3d75a7f9038c2cf4f61704a))
