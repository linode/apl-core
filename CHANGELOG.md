# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.10.0](https://github.com/linode/apl-core/compare/v4.5.0...v4.10.0) (2025-08-27)


### Features

* add argocd prometheus rules ([#2262](https://github.com/linode/apl-core/issues/2262)) ([822cc2b](https://github.com/linode/apl-core/commit/822cc2be7d000934d05076bf87d9372bb960152d))
* add ensure git ops directories to apply-as-apps ([#2211](https://github.com/linode/apl-core/issues/2211)) ([a033abb](https://github.com/linode/apl-core/commit/a033abb7df45881e172c14bdde1f1a3e0b531a7a))
* add kubeflow pipelines to core ([#2198](https://github.com/linode/apl-core/issues/2198)) ([807208b](https://github.com/linode/apl-core/commit/807208bbce769f00e0600f5e06935d80083b0479))
* add ORCS monitoring ([#2308](https://github.com/linode/apl-core/issues/2308)) ([f3a53e1](https://github.com/linode/apl-core/commit/f3a53e103399e21695a031cfb616bfc7b3431715))
* add post-install cleanup job ([#2207](https://github.com/linode/apl-core/issues/2207)) ([84fd5ab](https://github.com/linode/apl-core/commit/84fd5abce973aa81a14565e3242d9a1b36a6dcee))
* add Prometheus monitoring configuration for database resources ([#2317](https://github.com/linode/apl-core/issues/2317)) ([1ede9d0](https://github.com/linode/apl-core/commit/1ede9d02c86da79dabde83c87712bf51cab4ab73))
* add support for deleting Tekton-managed pods and enhance Istio … ([#2287](https://github.com/linode/apl-core/issues/2287)) ([41560c1](https://github.com/linode/apl-core/commit/41560c113fc720ec4e21e1980ef40a4c3fa71ef6))
* adding harbor ORCS support ([#2385](https://github.com/linode/apl-core/issues/2385)) ([5759d52](https://github.com/linode/apl-core/commit/5759d52fa298542e145413dc2064fcd046bfe455))
* adding knative ORCS support  ([#2357](https://github.com/linode/apl-core/issues/2357)) ([60b3d65](https://github.com/linode/apl-core/commit/60b3d65d9a4ae60e4f67eab9cf5fb984aeeaed09))
* adding KnativeServing CR ORCS support ([#2260](https://github.com/linode/apl-core/issues/2260)) ([9871159](https://github.com/linode/apl-core/commit/987115912e242a60f750c64de6abc4c7a7a14b61))
* adding ORCS support for kubeflow ([#2420](https://github.com/linode/apl-core/issues/2420)) ([88b32d6](https://github.com/linode/apl-core/commit/88b32d6e92b8face3c9ee342cf1aa1a02cc18e2d))
* adding ORCS support for tekton tasks ([#2387](https://github.com/linode/apl-core/issues/2387)) ([23c7a53](https://github.com/linode/apl-core/commit/23c7a5380b7b7f25df5c1d8d8f833831745f32ac))
* APL-672 adding ORCS support ([#2203](https://github.com/linode/apl-core/issues/2203)) ([57b802d](https://github.com/linode/apl-core/commit/57b802d9d65b0af31a51dd50fb6b18aebfa81a6b))
* apl-operator clean error messages ([#2290](https://github.com/linode/apl-core/issues/2290)) ([3b53e6b](https://github.com/linode/apl-core/commit/3b53e6b0a403e29661be28feafe5bbf4f37a0084))
* compatibility k8s version v1.33 ([#2107](https://github.com/linode/apl-core/issues/2107)) ([29c92ce](https://github.com/linode/apl-core/commit/29c92ce2b934511c17165295cfe0419c46b93698))
* default platform storage class ([#2376](https://github.com/linode/apl-core/issues/2376)) ([fdc0dbb](https://github.com/linode/apl-core/commit/fdc0dbb25177eaf15302dd04945c5864da5a7169))
* deploy manifest using apl-operator instead of using Tekton ([#2151](https://github.com/linode/apl-core/issues/2151)) ([bb1623d](https://github.com/linode/apl-core/commit/bb1623d1f39fbc757ea1e046ed4a4892c0438006))
* detect and restart pods with old istio-proxy version ([#2232](https://github.com/linode/apl-core/issues/2232)) ([373408f](https://github.com/linode/apl-core/commit/373408f7138756f4806b276a48ec020988555b33))
* enabling ORCS by default ([#2337](https://github.com/linode/apl-core/issues/2337)) ([5459f93](https://github.com/linode/apl-core/commit/5459f938fe9687c664a35c042d7fd5509bf43024))
* ignoring metadata.generation for ValidatingWebhookConfiguration… ([#2395](https://github.com/linode/apl-core/issues/2395)) ([4c74c76](https://github.com/linode/apl-core/commit/4c74c769e173fbd4425de36888c6759e2f7a991a))
* implement restart functionality for otomi-api deployment ([#2272](https://github.com/linode/apl-core/issues/2272)) ([ed2b8a7](https://github.com/linode/apl-core/commit/ed2b8a78fae5d4c9b4c144290782be4d5627184f))
* knativeserving cr upgrade script ([#2368](https://github.com/linode/apl-core/issues/2368)) ([6e4bb4d](https://github.com/linode/apl-core/commit/6e4bb4d809b991f02c29b2dbb8315f8a39a8952e))
* load prometheus rules for cnpg ([#2353](https://github.com/linode/apl-core/issues/2353)) ([d4e1672](https://github.com/linode/apl-core/commit/d4e1672ce6db9fe9dfc4b580cedd3c34809622ce))
* making linode provider an ORCS dependency ([#2380](https://github.com/linode/apl-core/issues/2380)) ([3c3ac0f](https://github.com/linode/apl-core/commit/3c3ac0f5dc0f54d6d2b88f1d76fcb5b247ffd2b4))
* nickname as username for gitea ([#2303](https://github.com/linode/apl-core/issues/2303)) ([d39d9ac](https://github.com/linode/apl-core/commit/d39d9ac9f0577c159a7c446ec37c6f88e0e38289))
* optimize the order of deploying manifests during the initial installation ([#2250](https://github.com/linode/apl-core/issues/2250)) ([109943a](https://github.com/linode/apl-core/commit/109943a68e259ed413dd62206061622bc831cf8f))
* optionally use cnpg backup plugin ([#2451](https://github.com/linode/apl-core/issues/2451)) ([ffec8ea](https://github.com/linode/apl-core/commit/ffec8eae6c955b2ecc2653b7709db226194caa3d))
* remove invalid logic regarding namespace creation ([#2362](https://github.com/linode/apl-core/issues/2362)) ([75e95e4](https://github.com/linode/apl-core/commit/75e95e48b9638c4e24849ca876ab072d92699599))
* removed unused policy-reports dashboards and whitelisted registries ([#2409](https://github.com/linode/apl-core/issues/2409)) ([376f476](https://github.com/linode/apl-core/commit/376f4768599a4ca94e86efdc58829b616fcf7e94))
* replace clusterrole for secrets with namespaced role and removed ingress update clusterrole ([#2163](https://github.com/linode/apl-core/issues/2163)) ([bc22632](https://github.com/linode/apl-core/commit/bc2263220cbcc0ade743bb483f9aa288ad36cb83))
* reverting ORCS migration for upgraded clusters ([#2381](https://github.com/linode/apl-core/issues/2381)) ([c551c3a](https://github.com/linode/apl-core/commit/c551c3ac4ce0e0c73912b92d816d93e03b253fa9))
* set custom repository and use selectors on argocd applications ([#2286](https://github.com/linode/apl-core/issues/2286)) ([8f0cc6b](https://github.com/linode/apl-core/commit/8f0cc6baf46dd44b6dec20456d010085b659f833))
* skip apl-operator application in development mode ([#2340](https://github.com/linode/apl-core/issues/2340)) ([10225bb](https://github.com/linode/apl-core/commit/10225bbdeb739fb0b8d09445f5400e34f27dc267))
* updating tekton registry ([#2339](https://github.com/linode/apl-core/issues/2339)) ([a2b1488](https://github.com/linode/apl-core/commit/a2b1488b0b9a55f6f542b0c18ab8cded844bbf47))
* upgrade Gitea to recent release ([#2085](https://github.com/linode/apl-core/issues/2085)) ([8267993](https://github.com/linode/apl-core/commit/8267993ca180d6efc5a3e6ce11c90c1b8bb0a004))
* upgrade k8s/client-node and node 22 ([#2204](https://github.com/linode/apl-core/issues/2204)) ([b09b0f3](https://github.com/linode/apl-core/commit/b09b0f3057ab5bb3fcc7f830179ec576ffeafb8c))
* upgrade Keycloak to recent release and deprovision operator ([#2078](https://github.com/linode/apl-core/issues/2078)) ([9e84b9f](https://github.com/linode/apl-core/commit/9e84b9f9a14be3fddf6c9ae5bfa35517d75dd4f7))


### Bug Fixes

* actually check for difference between files ([#2164](https://github.com/linode/apl-core/issues/2164)) ([eaf03aa](https://github.com/linode/apl-core/commit/eaf03aa2c2f90221994d41ea81bd380dac258e67))
* add default values to apl-operator ([#2251](https://github.com/linode/apl-core/issues/2251)) ([67c3dd2](https://github.com/linode/apl-core/commit/67c3dd211ceadde6660f153e69c445357e11cae3))
* added v1.33 to the supportedK8sVersions.json file ([#2159](https://github.com/linode/apl-core/issues/2159)) ([b6e761f](https://github.com/linode/apl-core/commit/b6e761fb745edc93f40481c2237b376a0a64852e))
* adjust Gitea backup service account ([#2187](https://github.com/linode/apl-core/issues/2187)) ([18dc630](https://github.com/linode/apl-core/commit/18dc63016b1616334ebbd524e949d92fac0a416f))
* always deploy tekton and apl related namespaces ([#2284](https://github.com/linode/apl-core/issues/2284)) ([2058097](https://github.com/linode/apl-core/commit/20580973632c552ada16c217cdb1c09ddf0c6d66))
* annotate Gitea volume ([#2158](https://github.com/linode/apl-core/issues/2158)) ([3c2dc50](https://github.com/linode/apl-core/commit/3c2dc50633bd1ca9ae1548c7cc1a2f18f2581bc1))
* APL-851 knative service url rendering ([#2214](https://github.com/linode/apl-core/issues/2214)) ([c0d37e6](https://github.com/linode/apl-core/commit/c0d37e69d37c689a5377b1071d886c4b880d8ff0))
* barman compatibility with non-aws object storage ([#2221](https://github.com/linode/apl-core/issues/2221)) ([98e5ed7](https://github.com/linode/apl-core/commit/98e5ed7a7f0c6357073b917fe4ca5844b04d99ea))
* create gitea-db-secret before database exists ([#2279](https://github.com/linode/apl-core/issues/2279)) ([b4ae09d](https://github.com/linode/apl-core/commit/b4ae09dfa714c2358ae83790f822f3fd44801355))
* create initial credential secret before the message shows up ([#2226](https://github.com/linode/apl-core/issues/2226)) ([5650905](https://github.com/linode/apl-core/commit/5650905d5918160ee63fb3fe8c65c5e1c3ad1ff3))
* deploying apl ([#2442](https://github.com/linode/apl-core/issues/2442)) ([f007cfd](https://github.com/linode/apl-core/commit/f007cfd71f81d62fb2994e1354937f3d1f75996c))
* enhance commit and push operations with quiet mode and error han… ([#2304](https://github.com/linode/apl-core/issues/2304)) ([8107c42](https://github.com/linode/apl-core/commit/8107c421cc2b594899f5d968a40760957a5445b4))
* handle error when retrieving git log for empty repository ([#2257](https://github.com/linode/apl-core/issues/2257)) ([b497184](https://github.com/linode/apl-core/commit/b497184981404450ae2f30e96eddd6aa31362eef))
* include ingress-nginx apps in values ([#2132](https://github.com/linode/apl-core/issues/2132)) ([6141f21](https://github.com/linode/apl-core/commit/6141f2151db2b3c46faea3eba8448896ce321375))
* incompatibility between helm and helm-secrets ([#2215](https://github.com/linode/apl-core/issues/2215)) ([d5df084](https://github.com/linode/apl-core/commit/d5df084fb9b09c4ab270cd137f49eacc8e10e1ae))
* knative-operator templating ([#2236](https://github.com/linode/apl-core/issues/2236)) ([826a394](https://github.com/linode/apl-core/commit/826a39421ef9d6b41601b6c10c411f7f71b7def2))
* migrate CloudnativePG backup to plugin for improved resource control ([#2299](https://github.com/linode/apl-core/issues/2299)) ([64865ec](https://github.com/linode/apl-core/commit/64865ec4c67a266cf0b8303bf58d6feadc2f974b))
* net-istio-webhook image override ([#2382](https://github.com/linode/apl-core/issues/2382)) ([e5e00a2](https://github.com/linode/apl-core/commit/e5e00a226c223bbd611ecda5fa99d6e5651e13f2))
* only run coverage report on changes in src ([#2202](https://github.com/linode/apl-core/issues/2202)) ([1e6cad4](https://github.com/linode/apl-core/commit/1e6cad4a76898d0a9803ebc61600c5892e092ef2))
* perform cleanup after installation within job ([#2235](https://github.com/linode/apl-core/issues/2235)) ([658254e](https://github.com/linode/apl-core/commit/658254eb646d9f77ca44faa3a36ce0e9616c05d6))
* pre-upgrade script, username, and installation order for Keycloak ([#2128](https://github.com/linode/apl-core/issues/2128)) ([219a594](https://github.com/linode/apl-core/commit/219a5949e360fe06198f67d07c50a8cfec9c6365))
* prerelease versions in upgrade check ([#2246](https://github.com/linode/apl-core/issues/2246)) ([54fe687](https://github.com/linode/apl-core/commit/54fe6875e53897f4e7f56204946a54e371e84330))
* prerelease versions in upgrade check ([#2248](https://github.com/linode/apl-core/issues/2248)) ([ccb22b7](https://github.com/linode/apl-core/commit/ccb22b75d23d3522ea21b68f0fa3ba9eeb14a07e))
* prometheus-operator storageclass ([#2410](https://github.com/linode/apl-core/issues/2410)) ([0436fc1](https://github.com/linode/apl-core/commit/0436fc1e3398714de8fc0e868d70166008a1e628))
* quote sensitive values in Helm templates ([#2150](https://github.com/linode/apl-core/issues/2150)) ([214bd5d](https://github.com/linode/apl-core/commit/214bd5d54f86c9dd42dd5de808c39459ca97b7e4))
* re-creation of team files ([#2466](https://github.com/linode/apl-core/issues/2466)) ([95357aa](https://github.com/linode/apl-core/commit/95357aa8d9e764efcecd7d5ca96b302d60757cf6))
* reattempt on first installation failure ([#2310](https://github.com/linode/apl-core/issues/2310)) ([59a513d](https://github.com/linode/apl-core/commit/59a513d50a2f0c5cac270ccc067963afd570171c))
* remove version tag of Keycloak ([#2319](https://github.com/linode/apl-core/issues/2319)) ([76d6e25](https://github.com/linode/apl-core/commit/76d6e2554fc059079d4f3e2353fa65781924b0de))
* removed apl docs links from apps ([#2245](https://github.com/linode/apl-core/issues/2245)) ([c09c727](https://github.com/linode/apl-core/commit/c09c7273ef5d920ac671579a205a07537fcc9771))
* rendering keycloak release ([#2390](https://github.com/linode/apl-core/issues/2390)) ([dec2a35](https://github.com/linode/apl-core/commit/dec2a35d188cd05f937bfd7a4fcee48f57c310e8))
* restart otomiApi deploy after 4.7.0 upgrade ([#2280](https://github.com/linode/apl-core/issues/2280)) ([044a662](https://github.com/linode/apl-core/commit/044a66207ad4eb5d0ef5036942863f02ae6982b4))
* restore istiod configuration  ([#2177](https://github.com/linode/apl-core/issues/2177)) ([82f7af7](https://github.com/linode/apl-core/commit/82f7af75a6722f6b073f2f0e209f191f1ea086cd))
* sealed secrets sample file ([#2201](https://github.com/linode/apl-core/issues/2201)) ([78583dd](https://github.com/linode/apl-core/commit/78583dd8397227f21d4ef34611eb314ec5c769b9))
* set database connections to 32 for Gitea, Harbor and KC ([#2311](https://github.com/linode/apl-core/issues/2311)) ([47173b2](https://github.com/linode/apl-core/commit/47173b2b9f952fef7ef15012815cc0bcb5dbaf65))
* set default k8s version 1.32 ([#2156](https://github.com/linode/apl-core/issues/2156)) ([d12707a](https://github.com/linode/apl-core/commit/d12707af500f6e573e075c1873a39c1ab106698e))
* set default k8s version to 1.33 for gh workflows ([#2220](https://github.com/linode/apl-core/issues/2220)) ([70a4a98](https://github.com/linode/apl-core/commit/70a4a989207d5845817c9ce4b7a97cad6ac111cd))
* siabling immediate cnpg backups ([f6d09be](https://github.com/linode/apl-core/commit/f6d09be09d0bd11a217eb17b7331218eac99642f))
* skip runtime upgrades during intial install and pre-release on same patch ([#2278](https://github.com/linode/apl-core/issues/2278)) ([c360dac](https://github.com/linode/apl-core/commit/c360dac36cb7e561fdb47dd546bdd52a146901ff))
* small fixes in go templates ([#2157](https://github.com/linode/apl-core/issues/2157)) ([9c818e8](https://github.com/linode/apl-core/commit/9c818e8ed52d735be3794352e980d3d1f0aec79c))
* specify branch in git pull to ensure correct updates from origin ([#2301](https://github.com/linode/apl-core/issues/2301)) ([a43a164](https://github.com/linode/apl-core/commit/a43a164fb1784f5d1d8b7a862106726f939be19b))
* status code evaluation from k8s client ([#2225](https://github.com/linode/apl-core/issues/2225)) ([340f7b6](https://github.com/linode/apl-core/commit/340f7b6d1c0aa0f9f18575be4ff51fcf2888d70f))
* suppress output during cleanup of ClusterRoleBinding ([#2252](https://github.com/linode/apl-core/issues/2252)) ([61bc164](https://github.com/linode/apl-core/commit/61bc1640cf010cfa00703c38d14ed16fd075ebd2))
* team grafana password ([#2168](https://github.com/linode/apl-core/issues/2168)) ([44e5238](https://github.com/linode/apl-core/commit/44e523841e68c92c67783b969c4459552e4682d9))
* tekton-triggers-webhook image ([#2258](https://github.com/linode/apl-core/issues/2258)) ([a8f51d3](https://github.com/linode/apl-core/commit/a8f51d3ff7d297b69304d1c3ca9f25f58fc8046d))
* typo for kyverno prometheus label ([#2309](https://github.com/linode/apl-core/issues/2309)) ([ebdfbff](https://github.com/linode/apl-core/commit/ebdfbffe5d01769e218919cd4a2fadf33b3c8ac8))
* update apply state ([#2231](https://github.com/linode/apl-core/issues/2231)) ([377ca60](https://github.com/linode/apl-core/commit/377ca608d0ca22db63a5dcc96496eca82afb213e))
* update helmfile template version in migration script for apl-operator ([#2261](https://github.com/linode/apl-core/issues/2261)) ([a465450](https://github.com/linode/apl-core/commit/a465450d2543d747c4876823bf03b2d263b42b64))
* update home url for the apl chart ([#2347](https://github.com/linode/apl-core/issues/2347)) ([2e3d389](https://github.com/linode/apl-core/commit/2e3d3895081be98c8f52de733bd37bf592b8502f))
* update istio proxy image tag for ORCS ([#2281](https://github.com/linode/apl-core/issues/2281)) ([375054b](https://github.com/linode/apl-core/commit/375054bd9a10c4673d16379423005f833f035765))
* use single-instance cache for Gitea ([#2208](https://github.com/linode/apl-core/issues/2208)) ([f6bdf74](https://github.com/linode/apl-core/commit/f6bdf74950fbf63f34b5faf17526ddc202d29296))
* velero linode plugin image ([#2345](https://github.com/linode/apl-core/issues/2345)) ([b0f56ca](https://github.com/linode/apl-core/commit/b0f56ca876ac04cf901fb1e9f3c52e4d0568dd15))


### Reverts

* adding KnativeServing CR ORCS support ([#2260](https://github.com/linode/apl-core/issues/2260))" ([#2352](https://github.com/linode/apl-core/issues/2352)) ([5d1cc36](https://github.com/linode/apl-core/commit/5d1cc36cf3b9bfa7bf6f8a2fea009facab0b5a42))


### Code Refactoring

* remove deprecated otomi-pipelines references  ([#2312](https://github.com/linode/apl-core/issues/2312)) ([b9e7de0](https://github.com/linode/apl-core/commit/b9e7de0d2d0a4eefd89263b0a29d4180c7bb9c18))


### CI

* add chart-deps label to newly created pull requests ([#2412](https://github.com/linode/apl-core/issues/2412)) ([c2d790e](https://github.com/linode/apl-core/commit/c2d790e5ea745bbd073b96522ff0cfc8d787f8c3))
* add CloudFirewall rule for prometheus-node-exporter ([#2324](https://github.com/linode/apl-core/issues/2324)) ([f1eed4e](https://github.com/linode/apl-core/commit/f1eed4e9ce91e73cf37ec5ae219cd88fa038ba76))
* adding ORCS support to the apl installer job and dev github action ([#2379](https://github.com/linode/apl-core/issues/2379)) ([cad531f](https://github.com/linode/apl-core/commit/cad531f5844e10561643ddaec30e7b08d246158f))
* enhance dependabot configuration for auto-approval and grouping… ([#2271](https://github.com/linode/apl-core/issues/2271)) ([6523159](https://github.com/linode/apl-core/commit/65231597529d2e6e064547011f66d0202d9060a7))
* install Cloud Firewall Controller for LKE cluster ([#2137](https://github.com/linode/apl-core/issues/2137)) ([9111015](https://github.com/linode/apl-core/commit/91110157b895f3740ba1ffccc7d7af1eb5b567b4))
* oauth2-proxy chart source ([#2285](https://github.com/linode/apl-core/issues/2285)) ([b9f555f](https://github.com/linode/apl-core/commit/b9f555f4d10283c90f986d627ca5c64b955a5895))
* pin commit hash in ArgoCD target revision ([#2307](https://github.com/linode/apl-core/issues/2307)) ([fde66ba](https://github.com/linode/apl-core/commit/fde66ba1f7db28816515b394928c22eedd99fe73))
* read gitea-credentials from cluster ([#2171](https://github.com/linode/apl-core/issues/2171)) ([588a480](https://github.com/linode/apl-core/commit/588a480d680f01d61aebf6361cc1df44337711b6))
* remove pre-commit hook ([#2186](https://github.com/linode/apl-core/issues/2186)) ([30fa367](https://github.com/linode/apl-core/commit/30fa3672aa404175745e207c507b0c9a3962f45c))
* restart dev apl-operator after main branch update ([#2178](https://github.com/linode/apl-core/issues/2178)) ([29fb155](https://github.com/linode/apl-core/commit/29fb15534fbc3ed0ac4308ef1add42c733c2e373))
* update apps.yaml with charts ([#2270](https://github.com/linode/apl-core/issues/2270)) ([e1bba4f](https://github.com/linode/apl-core/commit/e1bba4f12b4d057fd772d33c56c1b8085b7830a2))
* workflow_dispatch with useORCS set tu true ([#2300](https://github.com/linode/apl-core/issues/2300)) ([01c2955](https://github.com/linode/apl-core/commit/01c2955615f67ddf3e5c260ff8edae7b7a24e8a4))


### Tests

* improve reconciliation test by mocking scheduleNextAttempt ([cc0102d](https://github.com/linode/apl-core/commit/cc0102d0cbc0dfb0025bbc9b9429e2d6e00b6296))


### Others

* add code owners ([#2141](https://github.com/linode/apl-core/issues/2141)) ([2dd59af](https://github.com/linode/apl-core/commit/2dd59af93c86d27b7482526e24790bad32930bab))
* added .editorconfig ([#2209](https://github.com/linode/apl-core/issues/2209)) ([71de040](https://github.com/linode/apl-core/commit/71de040c5853d30bb84db25973d00fcd013cb3fd))
* app versions ([fc840aa](https://github.com/linode/apl-core/commit/fc840aaeadb350d5515d5c622415b755a78f3704))
* **chart-deps:** update harbor to version 1.17.1 ([#2190](https://github.com/linode/apl-core/issues/2190)) ([270b467](https://github.com/linode/apl-core/commit/270b467a6c7ca5e7315f810d9930d0a23c320368))
* **chart-deps:** update ingress-nginx to version 4.11.6 ([#2165](https://github.com/linode/apl-core/issues/2165)) ([95156b3](https://github.com/linode/apl-core/commit/95156b3ea8db866a34ccde8f1a4e72e10c114144))
* **chart-deps:** update sealed-secrets to version 2.17.3 ([#2234](https://github.com/linode/apl-core/issues/2234)) ([f85585e](https://github.com/linode/apl-core/commit/f85585e08b83eff9a94572b7922b23c23cf19007))
* **chart-deps:** Upgrade Kiali Operator ([#2176](https://github.com/linode/apl-core/issues/2176)) ([8220f96](https://github.com/linode/apl-core/commit/8220f96542cb317e3b80a6990da56521551f6e2a))
* **chart-deps:** upgrade Knative Operator to 1.18.1 ([#2181](https://github.com/linode/apl-core/issues/2181)) ([9ec688e](https://github.com/linode/apl-core/commit/9ec688eb0fa443d28836082179218408c0acf206))
* **chart-deps:** upgrade metrics-server to 0.8.0 ([#2361](https://github.com/linode/apl-core/issues/2361)) ([07128b0](https://github.com/linode/apl-core/commit/07128b0f42db60ae7750fe2c6f6b4cf07b60a8a1))
* **chart-deps:** upgrade oauth2 proxy to 7.12.18 and fix session interruption ([#2288](https://github.com/linode/apl-core/issues/2288)) ([8ff04ae](https://github.com/linode/apl-core/commit/8ff04ae30a3c1c2a0a7ae150e8b833da49b4966c))
* **deps:** bump @apidevtools/json-schema-ref-parser from 13.0.1 to 14.0.2 ([#2295](https://github.com/linode/apl-core/issues/2295)) ([3b6e68a](https://github.com/linode/apl-core/commit/3b6e68a2626ba3072b53f99b8d3d2f791c0b6b11))
* **deps:** bump actions/checkout from 3 to 4 ([#2122](https://github.com/linode/apl-core/issues/2122)) ([7d9d239](https://github.com/linode/apl-core/commit/7d9d2392e7a4e17acf30fa818c260a7bb05215ef))
* **deps:** bump dotenv from 16.5.0 to 17.0.0 ([#2296](https://github.com/linode/apl-core/issues/2296)) ([fd6610c](https://github.com/linode/apl-core/commit/fd6610cab68c2ac0fc533b6572d7696a6ca73a56))
* **deps:** bump jest and @types/jest ([#2297](https://github.com/linode/apl-core/issues/2297)) ([cdf27bd](https://github.com/linode/apl-core/commit/cdf27bd3b42270ee6a618cced885608aff285e04))
* **deps:** bump ncipollo/release-action from 1.16.0 to 1.18.0 in the github-actions-dependencies group ([#2294](https://github.com/linode/apl-core/issues/2294)) ([2a724b4](https://github.com/linode/apl-core/commit/2a724b4db0bca27ecb1ddef1736349ce8e964676))
* **deps:** bump the npm-dependencies group with 12 updates ([#2318](https://github.com/linode/apl-core/issues/2318)) ([6760d28](https://github.com/linode/apl-core/commit/6760d282dd0ac03917443fe539936189b3b90179))
* **deps:** bump the npm-dependencies group with 18 updates ([#2277](https://github.com/linode/apl-core/issues/2277)) ([2ee5d81](https://github.com/linode/apl-core/commit/2ee5d811d06b8e58a32b2d175f1dc9d93fff830c))
* **deps:** bump the npm-dependencies group with 8 updates ([#2293](https://github.com/linode/apl-core/issues/2293)) ([9ab1317](https://github.com/linode/apl-core/commit/9ab1317eb0ca57f66191b1ddbfa0f1b6a4dc2b91))
* **deps:** bump the npm-dependencies group with 8 updates ([#2369](https://github.com/linode/apl-core/issues/2369)) ([b95049c](https://github.com/linode/apl-core/commit/b95049cd645146bfe8d1426b381c17f1f15e9a6e))
* **deps:** bump the npm-dependencies group with 9 updates ([#2343](https://github.com/linode/apl-core/issues/2343)) ([2dfd8c0](https://github.com/linode/apl-core/commit/2dfd8c03a48573bc4b5c481e41d3809371af75d8))
* **deps:** update apl-tools version in dockerfile ([#2367](https://github.com/linode/apl-core/issues/2367)) ([12d3699](https://github.com/linode/apl-core/commit/12d3699b4206bb273d6470b6d6f0fe7f469608ae))
* **deps:** update dependencies, replace ts-node with tsx, add new eslint file ([#2125](https://github.com/linode/apl-core/issues/2125)) ([29e22ab](https://github.com/linode/apl-core/commit/29e22ab2e4592df3ee9bc3a42bb6413157889ffa))
* **deps:** upgrade argocd to v3.0.3 ([#2175](https://github.com/linode/apl-core/issues/2175)) ([f782fcb](https://github.com/linode/apl-core/commit/f782fcbc9e3cc6cc16307a6ab347a2c98f8e64e3))
* follow db default version of platform ([#2197](https://github.com/linode/apl-core/issues/2197)) ([c924925](https://github.com/linode/apl-core/commit/c924925e1bf0eb50fb9a0ecc7444a532c282f30b))
* Helmfile v1 compatibility [TOOLS][MINOR] ([#2136](https://github.com/linode/apl-core/issues/2136)) ([515ceca](https://github.com/linode/apl-core/commit/515ceca551882833d0a162225aa4f20455485e9d))
* post release changelog v4.7.0 ([#2289](https://github.com/linode/apl-core/issues/2289)) ([64defcc](https://github.com/linode/apl-core/commit/64defcc1bdb47911455c0824e7cf9ba71b150064))
* release version updates ([#2413](https://github.com/linode/apl-core/issues/2413)) ([c4db670](https://github.com/linode/apl-core/commit/c4db670b1e25055117ada0256535f52b0896e567))
* **release:** 4.10.0-rc.5 ([06fb85b](https://github.com/linode/apl-core/commit/06fb85b3238d161651560b6b883f4b6a0cd9cb4c))
* reset versions to main ([#2363](https://github.com/linode/apl-core/issues/2363)) ([cb8ef4a](https://github.com/linode/apl-core/commit/cb8ef4a083902f7cefaf02d13357c7527b99874f))
* set versions to main ([#2127](https://github.com/linode/apl-core/issues/2127)) ([9c73f65](https://github.com/linode/apl-core/commit/9c73f65b969674199a5bdd3abcc8e0aa3e98d935))
* update api version to show kubeflow pipelines ([bb4ec89](https://github.com/linode/apl-core/commit/bb4ec89de9c3b055515a71e9a01769f0eedac352))
* update helm version to 3.18.4 ([#2338](https://github.com/linode/apl-core/issues/2338)) ([7431a3e](https://github.com/linode/apl-core/commit/7431a3eb57c3de0d86129b17d60d74c510fb04dd))
* update package.json version ([5727ba2](https://github.com/linode/apl-core/commit/5727ba2c13db69c78cbcf16ccdc973e929c18a7a))
* update readme image ([#2302](https://github.com/linode/apl-core/issues/2302)) ([56d54a5](https://github.com/linode/apl-core/commit/56d54a52040581027af733f8284ba1cf0bc8f066))
* update SECURITY.md ([f5d0464](https://github.com/linode/apl-core/commit/f5d04645e9953e65215c4eba81712ed2c25648bc))
* update the displayed versions ([#2152](https://github.com/linode/apl-core/issues/2152)) ([4bac5c5](https://github.com/linode/apl-core/commit/4bac5c5a9e221613c5e195638050a6e1035b875e))
* update versions ([dd364b1](https://github.com/linode/apl-core/commit/dd364b1151bebf816f82a6001ab06cc4972aee17))
* update versions ([653cb42](https://github.com/linode/apl-core/commit/653cb425378751c4a22f37292ed2f8405479b5e1))
* update versions ([57bb82a](https://github.com/linode/apl-core/commit/57bb82a21a4e3f1eac1bfc33cbb8d778a6a1beee))
* Upgrade CloudnativePG Operator ([#2183](https://github.com/linode/apl-core/issues/2183)) ([48369f4](https://github.com/linode/apl-core/commit/48369f4385826275d9976d2a27f9dcd0537d1a76))
* upgrade Istio and deprovision istio operator ([#2155](https://github.com/linode/apl-core/issues/2155)) ([b8a1c94](https://github.com/linode/apl-core/commit/b8a1c945d93540da31e75fabeba0554956a75136))
* Upgrade Keycloak to latest release ([#2174](https://github.com/linode/apl-core/issues/2174)) ([f5f68a0](https://github.com/linode/apl-core/commit/f5f68a05ca100dd9ba025ddeac232d4c0719dd9a))
* upgrade kube-prometheus-stack ([#2313](https://github.com/linode/apl-core/issues/2313)) ([0d8e09e](https://github.com/linode/apl-core/commit/0d8e09e2745aac53569f60c758a79a21d10be019))
* Upgrade to Istio 1.26.1 ([#2210](https://github.com/linode/apl-core/issues/2210)) ([2d978ee](https://github.com/linode/apl-core/commit/2d978eefd81e4b6a8326c47c1d02d762173c3e94))
* v4.6.0 changelog anf package*.json update [ci skip] ([#2182](https://github.com/linode/apl-core/issues/2182)) ([ca23641](https://github.com/linode/apl-core/commit/ca236411c8784548aac1006551a2cf04abb62d54))
* version update ([b2382c6](https://github.com/linode/apl-core/commit/b2382c617c4958312bbad07992e245ac443c9276))
* versions update ([b62971a](https://github.com/linode/apl-core/commit/b62971a623aab8a3d36362419abfba25e803ec6f))

## [4.8.0](https://github.com/linode/apl-core/compare/v4.5.0...v4.8.0) (2025-07-31)


### Features

* add Prometheus monitoring configuration for database resources ([#2317](https://github.com/linode/apl-core/issues/2317)) ([1ede9d0](https://github.com/linode/apl-core/commit/1ede9d02c86da79dabde83c87712bf51cab4ab73))
* add support for deleting Tekton-managed pods and enhance Istio … ([#2287](https://github.com/linode/apl-core/issues/2287)) ([41560c1](https://github.com/linode/apl-core/commit/41560c113fc720ec4e21e1980ef40a4c3fa71ef6))
* adding harbor ORCS support ([#2385](https://github.com/linode/apl-core/issues/2385)) ([97eca95](https://github.com/linode/apl-core/commit/97eca957cedcf6f98a5b6c293c0a0bf166c9477f))
* adding knative ORCS support  ([#2357](https://github.com/linode/apl-core/issues/2357)) ([23d46e0](https://github.com/linode/apl-core/commit/23d46e0ebb5f3fad7ed87e03c7bd236c01326390))
* adding KnativeServing CR ORCS support ([#2260](https://github.com/linode/apl-core/issues/2260)) ([9871159](https://github.com/linode/apl-core/commit/987115912e242a60f750c64de6abc4c7a7a14b61))
* adding ORCS support for tekton tasks ([#2387](https://github.com/linode/apl-core/issues/2387)) ([74ed32d](https://github.com/linode/apl-core/commit/74ed32d1a4f47b5bb0f893c2d245c0f1a411a12f))
* apl-operator clean error messages ([#2290](https://github.com/linode/apl-core/issues/2290)) ([3b53e6b](https://github.com/linode/apl-core/commit/3b53e6b0a403e29661be28feafe5bbf4f37a0084))
* enabling ORCS by default ([#2337](https://github.com/linode/apl-core/issues/2337)) ([afde740](https://github.com/linode/apl-core/commit/afde740d0c7d1f55e210f4e65370ff53a22376a5))
* making linode provider an ORCS dependency ([#2380](https://github.com/linode/apl-core/issues/2380)) ([cb7d265](https://github.com/linode/apl-core/commit/cb7d265cd9e44b29e29d656e7ba95a64f3f907ef))
* nickname as username for gitea ([#2303](https://github.com/linode/apl-core/issues/2303)) ([d39d9ac](https://github.com/linode/apl-core/commit/d39d9ac9f0577c159a7c446ec37c6f88e0e38289))
* reverting ORCS migration for upgraded clusters ([#2381](https://github.com/linode/apl-core/issues/2381)) ([1ac4b86](https://github.com/linode/apl-core/commit/1ac4b86f9651738f984125557f79df08136330ff))
* set custom repository and use selectors on argocd applications ([#2286](https://github.com/linode/apl-core/issues/2286)) ([8f0cc6b](https://github.com/linode/apl-core/commit/8f0cc6baf46dd44b6dec20456d010085b659f833))
* updating tekton registry ([#2339](https://github.com/linode/apl-core/issues/2339)) ([a2b1488](https://github.com/linode/apl-core/commit/a2b1488b0b9a55f6f542b0c18ab8cded844bbf47))


### Bug Fixes

* enhance commit and push operations with quiet mode and error han… ([#2304](https://github.com/linode/apl-core/issues/2304)) ([8107c42](https://github.com/linode/apl-core/commit/8107c421cc2b594899f5d968a40760957a5445b4))
* net-istio-webhook image override ([#2382](https://github.com/linode/apl-core/issues/2382)) ([b28798e](https://github.com/linode/apl-core/commit/b28798ec2c747a99c258dfdfedb4d2d01fb9c7f9))
* reattempt on first installation failure ([#2310](https://github.com/linode/apl-core/issues/2310)) ([59a513d](https://github.com/linode/apl-core/commit/59a513d50a2f0c5cac270ccc067963afd570171c))
* remove version tag of Keycloak ([#2319](https://github.com/linode/apl-core/issues/2319)) ([76d6e25](https://github.com/linode/apl-core/commit/76d6e2554fc059079d4f3e2353fa65781924b0de))
* rendering keycloak release ([#2390](https://github.com/linode/apl-core/issues/2390)) ([88ffe4b](https://github.com/linode/apl-core/commit/88ffe4bff24de3c7ef2074a4b1f079d622f7d776))
* set database connections to 32 for Gitea, Harbor and KC ([#2311](https://github.com/linode/apl-core/issues/2311)) ([47173b2](https://github.com/linode/apl-core/commit/47173b2b9f952fef7ef15012815cc0bcb5dbaf65))
* specify branch in git pull to ensure correct updates from origin ([#2301](https://github.com/linode/apl-core/issues/2301)) ([a43a164](https://github.com/linode/apl-core/commit/a43a164fb1784f5d1d8b7a862106726f939be19b))
* typo for kyverno prometheus label ([#2309](https://github.com/linode/apl-core/issues/2309)) ([ebdfbff](https://github.com/linode/apl-core/commit/ebdfbffe5d01769e218919cd4a2fadf33b3c8ac8))
* update home url for the apl chart ([#2347](https://github.com/linode/apl-core/issues/2347)) ([2e3d389](https://github.com/linode/apl-core/commit/2e3d3895081be98c8f52de733bd37bf592b8502f))
* velero linode plugin image ([#2345](https://github.com/linode/apl-core/issues/2345)) ([b0f56ca](https://github.com/linode/apl-core/commit/b0f56ca876ac04cf901fb1e9f3c52e4d0568dd15))


### Code Refactoring

* remove deprecated otomi-pipelines references  ([#2312](https://github.com/linode/apl-core/issues/2312)) ([b9e7de0](https://github.com/linode/apl-core/commit/b9e7de0d2d0a4eefd89263b0a29d4180c7bb9c18))


### CI

* add CloudFirewall rule for prometheus-node-exporter ([#2324](https://github.com/linode/apl-core/issues/2324)) ([f1eed4e](https://github.com/linode/apl-core/commit/f1eed4e9ce91e73cf37ec5ae219cd88fa038ba76))
* adding ORCS support to the apl installer job and dev github action ([#2379](https://github.com/linode/apl-core/issues/2379)) ([94c63d8](https://github.com/linode/apl-core/commit/94c63d86d7869d2f1e092bf60e1ec8a5c84ac60e))
* oauth2-proxy chart source ([#2285](https://github.com/linode/apl-core/issues/2285)) ([b9f555f](https://github.com/linode/apl-core/commit/b9f555f4d10283c90f986d627ca5c64b955a5895))
* pin commit hash in ArgoCD target revision ([#2307](https://github.com/linode/apl-core/issues/2307)) ([fde66ba](https://github.com/linode/apl-core/commit/fde66ba1f7db28816515b394928c22eedd99fe73))
* workflow_dispatch with useORCS set tu true ([#2300](https://github.com/linode/apl-core/issues/2300)) ([01c2955](https://github.com/linode/apl-core/commit/01c2955615f67ddf3e5c260ff8edae7b7a24e8a4))


### Others

* **chart-deps:** upgrade oauth2 proxy to 7.12.18 and fix session interruption ([#2288](https://github.com/linode/apl-core/issues/2288)) ([8ff04ae](https://github.com/linode/apl-core/commit/8ff04ae30a3c1c2a0a7ae150e8b833da49b4966c))
* **deps:** bump @apidevtools/json-schema-ref-parser from 13.0.1 to 14.0.2 ([#2295](https://github.com/linode/apl-core/issues/2295)) ([3b6e68a](https://github.com/linode/apl-core/commit/3b6e68a2626ba3072b53f99b8d3d2f791c0b6b11))
* **deps:** bump dotenv from 16.5.0 to 17.0.0 ([#2296](https://github.com/linode/apl-core/issues/2296)) ([fd6610c](https://github.com/linode/apl-core/commit/fd6610cab68c2ac0fc533b6572d7696a6ca73a56))
* **deps:** bump jest and @types/jest ([#2297](https://github.com/linode/apl-core/issues/2297)) ([cdf27bd](https://github.com/linode/apl-core/commit/cdf27bd3b42270ee6a618cced885608aff285e04))
* **deps:** bump ncipollo/release-action from 1.16.0 to 1.18.0 in the github-actions-dependencies group ([#2294](https://github.com/linode/apl-core/issues/2294)) ([2a724b4](https://github.com/linode/apl-core/commit/2a724b4db0bca27ecb1ddef1736349ce8e964676))
* **deps:** bump the npm-dependencies group with 12 updates ([#2318](https://github.com/linode/apl-core/issues/2318)) ([6760d28](https://github.com/linode/apl-core/commit/6760d282dd0ac03917443fe539936189b3b90179))
* **deps:** bump the npm-dependencies group with 8 updates ([#2293](https://github.com/linode/apl-core/issues/2293)) ([9ab1317](https://github.com/linode/apl-core/commit/9ab1317eb0ca57f66191b1ddbfa0f1b6a4dc2b91))
* **deps:** bump the npm-dependencies group with 9 updates ([#2343](https://github.com/linode/apl-core/issues/2343)) ([2dfd8c0](https://github.com/linode/apl-core/commit/2dfd8c03a48573bc4b5c481e41d3809371af75d8))
* post release changelog v4.7.0 ([#2289](https://github.com/linode/apl-core/issues/2289)) ([64defcc](https://github.com/linode/apl-core/commit/64defcc1bdb47911455c0824e7cf9ba71b150064))
* update helm version to 3.18.4 ([#2338](https://github.com/linode/apl-core/issues/2338)) ([7431a3e](https://github.com/linode/apl-core/commit/7431a3eb57c3de0d86129b17d60d74c510fb04dd))
* update readme image ([#2302](https://github.com/linode/apl-core/issues/2302)) ([56d54a5](https://github.com/linode/apl-core/commit/56d54a52040581027af733f8284ba1cf0bc8f066))


## [4.7.0](https://github.com/linode/apl-core/compare/v4.5.0...v4.7.0) (2025-06-26)


### Features

* add argocd prometheus rules ([#2262](https://github.com/linode/apl-core/issues/2262)) ([822cc2b](https://github.com/linode/apl-core/commit/822cc2be7d000934d05076bf87d9372bb960152d))
* add ensure git ops directories to apply-as-apps ([#2211](https://github.com/linode/apl-core/issues/2211)) ([a033abb](https://github.com/linode/apl-core/commit/a033abb7df45881e172c14bdde1f1a3e0b531a7a))
* add post-install cleanup job ([#2207](https://github.com/linode/apl-core/issues/2207)) ([84fd5ab](https://github.com/linode/apl-core/commit/84fd5abce973aa81a14565e3242d9a1b36a6dcee))
* APL-672 adding ORCS support ([#2203](https://github.com/linode/apl-core/issues/2203)) ([57b802d](https://github.com/linode/apl-core/commit/57b802d9d65b0af31a51dd50fb6b18aebfa81a6b))
* compatibility k8s version v1.33 ([#2107](https://github.com/linode/apl-core/issues/2107)) ([29c92ce](https://github.com/linode/apl-core/commit/29c92ce2b934511c17165295cfe0419c46b93698))
* deploy manifest using apl-operator instead of using Tekton ([#2151](https://github.com/linode/apl-core/issues/2151)) ([bb1623d](https://github.com/linode/apl-core/commit/bb1623d1f39fbc757ea1e046ed4a4892c0438006))
* detect and restart pods with old istio-proxy version ([#2232](https://github.com/linode/apl-core/issues/2232)) ([373408f](https://github.com/linode/apl-core/commit/373408f7138756f4806b276a48ec020988555b33))
* implement restart functionality for otomi-api deployment ([#2272](https://github.com/linode/apl-core/issues/2272)) ([ed2b8a7](https://github.com/linode/apl-core/commit/ed2b8a78fae5d4c9b4c144290782be4d5627184f))
* optimize the order of deploying manifests during the initial installation ([#2250](https://github.com/linode/apl-core/issues/2250)) ([109943a](https://github.com/linode/apl-core/commit/109943a68e259ed413dd62206061622bc831cf8f))
* replace clusterrole for secrets with namespaced role and removed ingress update clusterrole ([#2163](https://github.com/linode/apl-core/issues/2163)) ([bc22632](https://github.com/linode/apl-core/commit/bc2263220cbcc0ade743bb483f9aa288ad36cb83))
* upgrade Gitea to recent release ([#2085](https://github.com/linode/apl-core/issues/2085)) ([8267993](https://github.com/linode/apl-core/commit/8267993ca180d6efc5a3e6ce11c90c1b8bb0a004))
* upgrade k8s/client-node and node 22 ([#2204](https://github.com/linode/apl-core/issues/2204)) ([b09b0f3](https://github.com/linode/apl-core/commit/b09b0f3057ab5bb3fcc7f830179ec576ffeafb8c))
* upgrade Keycloak to recent release and deprovision operator ([#2078](https://github.com/linode/apl-core/issues/2078)) ([9e84b9f](https://github.com/linode/apl-core/commit/9e84b9f9a14be3fddf6c9ae5bfa35517d75dd4f7))


### Bug Fixes

* actually check for difference between files ([#2164](https://github.com/linode/apl-core/issues/2164)) ([eaf03aa](https://github.com/linode/apl-core/commit/eaf03aa2c2f90221994d41ea81bd380dac258e67))
* add default values to apl-operator ([#2251](https://github.com/linode/apl-core/issues/2251)) ([67c3dd2](https://github.com/linode/apl-core/commit/67c3dd211ceadde6660f153e69c445357e11cae3))
* added v1.33 to the supportedK8sVersions.json file ([#2159](https://github.com/linode/apl-core/issues/2159)) ([b6e761f](https://github.com/linode/apl-core/commit/b6e761fb745edc93f40481c2237b376a0a64852e))
* adjust Gitea backup service account ([#2187](https://github.com/linode/apl-core/issues/2187)) ([18dc630](https://github.com/linode/apl-core/commit/18dc63016b1616334ebbd524e949d92fac0a416f))
* always deploy tekton and apl related namespaces ([#2284](https://github.com/linode/apl-core/issues/2284)) ([2058097](https://github.com/linode/apl-core/commit/20580973632c552ada16c217cdb1c09ddf0c6d66))
* annotate Gitea volume ([#2158](https://github.com/linode/apl-core/issues/2158)) ([3c2dc50](https://github.com/linode/apl-core/commit/3c2dc50633bd1ca9ae1548c7cc1a2f18f2581bc1))
* APL-851 knative service url rendering ([#2214](https://github.com/linode/apl-core/issues/2214)) ([c0d37e6](https://github.com/linode/apl-core/commit/c0d37e69d37c689a5377b1071d886c4b880d8ff0))
* barman compatibility with non-aws object storage ([#2221](https://github.com/linode/apl-core/issues/2221)) ([98e5ed7](https://github.com/linode/apl-core/commit/98e5ed7a7f0c6357073b917fe4ca5844b04d99ea))
* create gitea-db-secret before database exists ([#2279](https://github.com/linode/apl-core/issues/2279)) ([b4ae09d](https://github.com/linode/apl-core/commit/b4ae09dfa714c2358ae83790f822f3fd44801355))
* create initial credential secret before the message shows up ([#2226](https://github.com/linode/apl-core/issues/2226)) ([5650905](https://github.com/linode/apl-core/commit/5650905d5918160ee63fb3fe8c65c5e1c3ad1ff3))
* handle error when retrieving git log for empty repository ([#2257](https://github.com/linode/apl-core/issues/2257)) ([b497184](https://github.com/linode/apl-core/commit/b497184981404450ae2f30e96eddd6aa31362eef))
* include ingress-nginx apps in values ([#2132](https://github.com/linode/apl-core/issues/2132)) ([6141f21](https://github.com/linode/apl-core/commit/6141f2151db2b3c46faea3eba8448896ce321375))
* incompatibility between helm and helm-secrets ([#2215](https://github.com/linode/apl-core/issues/2215)) ([d5df084](https://github.com/linode/apl-core/commit/d5df084fb9b09c4ab270cd137f49eacc8e10e1ae))
* knative-operator templating ([#2236](https://github.com/linode/apl-core/issues/2236)) ([826a394](https://github.com/linode/apl-core/commit/826a39421ef9d6b41601b6c10c411f7f71b7def2))
* only run coverage report on changes in src ([#2202](https://github.com/linode/apl-core/issues/2202)) ([1e6cad4](https://github.com/linode/apl-core/commit/1e6cad4a76898d0a9803ebc61600c5892e092ef2))
* perform cleanup after installation within job ([#2235](https://github.com/linode/apl-core/issues/2235)) ([658254e](https://github.com/linode/apl-core/commit/658254eb646d9f77ca44faa3a36ce0e9616c05d6))
* pre-upgrade script, username, and installation order for Keycloak ([#2128](https://github.com/linode/apl-core/issues/2128)) ([219a594](https://github.com/linode/apl-core/commit/219a5949e360fe06198f67d07c50a8cfec9c6365))
* prerelease versions in upgrade check ([#2246](https://github.com/linode/apl-core/issues/2246)) ([54fe687](https://github.com/linode/apl-core/commit/54fe6875e53897f4e7f56204946a54e371e84330))
* prerelease versions in upgrade check ([#2248](https://github.com/linode/apl-core/issues/2248)) ([ccb22b7](https://github.com/linode/apl-core/commit/ccb22b75d23d3522ea21b68f0fa3ba9eeb14a07e))
* quote sensitive values in Helm templates ([#2150](https://github.com/linode/apl-core/issues/2150)) ([214bd5d](https://github.com/linode/apl-core/commit/214bd5d54f86c9dd42dd5de808c39459ca97b7e4))
* removed apl docs links from apps ([#2245](https://github.com/linode/apl-core/issues/2245)) ([c09c727](https://github.com/linode/apl-core/commit/c09c7273ef5d920ac671579a205a07537fcc9771))
* restart otomiApi deploy after 4.7.0 upgrade ([#2280](https://github.com/linode/apl-core/issues/2280)) ([044a662](https://github.com/linode/apl-core/commit/044a66207ad4eb5d0ef5036942863f02ae6982b4))
* restore istiod configuration  ([#2177](https://github.com/linode/apl-core/issues/2177)) ([82f7af7](https://github.com/linode/apl-core/commit/82f7af75a6722f6b073f2f0e209f191f1ea086cd))
* sealed secrets sample file ([#2201](https://github.com/linode/apl-core/issues/2201)) ([78583dd](https://github.com/linode/apl-core/commit/78583dd8397227f21d4ef34611eb314ec5c769b9))
* set default k8s version 1.32 ([#2156](https://github.com/linode/apl-core/issues/2156)) ([d12707a](https://github.com/linode/apl-core/commit/d12707af500f6e573e075c1873a39c1ab106698e))
* set default k8s version to 1.33 for gh workflows ([#2220](https://github.com/linode/apl-core/issues/2220)) ([70a4a98](https://github.com/linode/apl-core/commit/70a4a989207d5845817c9ce4b7a97cad6ac111cd))
* skip runtime upgrades during intial install and pre-release on same patch ([#2278](https://github.com/linode/apl-core/issues/2278)) ([c360dac](https://github.com/linode/apl-core/commit/c360dac36cb7e561fdb47dd546bdd52a146901ff))
* small fixes in go templates ([#2157](https://github.com/linode/apl-core/issues/2157)) ([9c818e8](https://github.com/linode/apl-core/commit/9c818e8ed52d735be3794352e980d3d1f0aec79c))
* status code evaluation from k8s client ([#2225](https://github.com/linode/apl-core/issues/2225)) ([340f7b6](https://github.com/linode/apl-core/commit/340f7b6d1c0aa0f9f18575be4ff51fcf2888d70f))
* suppress output during cleanup of ClusterRoleBinding ([#2252](https://github.com/linode/apl-core/issues/2252)) ([61bc164](https://github.com/linode/apl-core/commit/61bc1640cf010cfa00703c38d14ed16fd075ebd2))
* team grafana password ([#2168](https://github.com/linode/apl-core/issues/2168)) ([44e5238](https://github.com/linode/apl-core/commit/44e523841e68c92c67783b969c4459552e4682d9))
* tekton-triggers-webhook image ([#2258](https://github.com/linode/apl-core/issues/2258)) ([a8f51d3](https://github.com/linode/apl-core/commit/a8f51d3ff7d297b69304d1c3ca9f25f58fc8046d))
* update apply state ([#2231](https://github.com/linode/apl-core/issues/2231)) ([377ca60](https://github.com/linode/apl-core/commit/377ca608d0ca22db63a5dcc96496eca82afb213e))
* update helmfile template version in migration script for apl-operator ([#2261](https://github.com/linode/apl-core/issues/2261)) ([a465450](https://github.com/linode/apl-core/commit/a465450d2543d747c4876823bf03b2d263b42b64))
* update istio proxy image tag for ORCS ([#2281](https://github.com/linode/apl-core/issues/2281)) ([375054b](https://github.com/linode/apl-core/commit/375054bd9a10c4673d16379423005f833f035765))
* use single-instance cache for Gitea ([#2208](https://github.com/linode/apl-core/issues/2208)) ([f6bdf74](https://github.com/linode/apl-core/commit/f6bdf74950fbf63f34b5faf17526ddc202d29296))


### CI

* enhance dependabot configuration for auto-approval and grouping… ([#2271](https://github.com/linode/apl-core/issues/2271)) ([6523159](https://github.com/linode/apl-core/commit/65231597529d2e6e064547011f66d0202d9060a7))
* install Cloud Firewall Controller for LKE cluster ([#2137](https://github.com/linode/apl-core/issues/2137)) ([9111015](https://github.com/linode/apl-core/commit/91110157b895f3740ba1ffccc7d7af1eb5b567b4))
* read gitea-credentials from cluster ([#2171](https://github.com/linode/apl-core/issues/2171)) ([588a480](https://github.com/linode/apl-core/commit/588a480d680f01d61aebf6361cc1df44337711b6))
* remove pre-commit hook ([#2186](https://github.com/linode/apl-core/issues/2186)) ([30fa367](https://github.com/linode/apl-core/commit/30fa3672aa404175745e207c507b0c9a3962f45c))
* restart dev apl-operator after main branch update ([#2178](https://github.com/linode/apl-core/issues/2178)) ([29fb155](https://github.com/linode/apl-core/commit/29fb15534fbc3ed0ac4308ef1add42c733c2e373))
* update apps.yaml with charts ([#2270](https://github.com/linode/apl-core/issues/2270)) ([e1bba4f](https://github.com/linode/apl-core/commit/e1bba4f12b4d057fd772d33c56c1b8085b7830a2))


### Others

* add code owners ([#2141](https://github.com/linode/apl-core/issues/2141)) ([2dd59af](https://github.com/linode/apl-core/commit/2dd59af93c86d27b7482526e24790bad32930bab))
* added .editorconfig ([#2209](https://github.com/linode/apl-core/issues/2209)) ([71de040](https://github.com/linode/apl-core/commit/71de040c5853d30bb84db25973d00fcd013cb3fd))
* **chart-deps:** update harbor to version 1.17.1 ([#2190](https://github.com/linode/apl-core/issues/2190)) ([270b467](https://github.com/linode/apl-core/commit/270b467a6c7ca5e7315f810d9930d0a23c320368))
* **chart-deps:** update ingress-nginx to version 4.11.6 ([#2165](https://github.com/linode/apl-core/issues/2165)) ([95156b3](https://github.com/linode/apl-core/commit/95156b3ea8db866a34ccde8f1a4e72e10c114144))
* **chart-deps:** Upgrade Kiali Operator ([#2176](https://github.com/linode/apl-core/issues/2176)) ([8220f96](https://github.com/linode/apl-core/commit/8220f96542cb317e3b80a6990da56521551f6e2a))
* **chart-deps:** upgrade Knative Operator to 1.18.1 ([#2181](https://github.com/linode/apl-core/issues/2181)) ([9ec688e](https://github.com/linode/apl-core/commit/9ec688eb0fa443d28836082179218408c0acf206))
* **deps:** bump actions/checkout from 3 to 4 ([#2122](https://github.com/linode/apl-core/issues/2122)) ([7d9d239](https://github.com/linode/apl-core/commit/7d9d2392e7a4e17acf30fa818c260a7bb05215ef))
* **deps:** bump the npm-dependencies group with 18 updates ([#2277](https://github.com/linode/apl-core/issues/2277)) ([2ee5d81](https://github.com/linode/apl-core/commit/2ee5d811d06b8e58a32b2d175f1dc9d93fff830c))
* **deps:** update dependencies, replace ts-node with tsx, add new eslint file ([#2125](https://github.com/linode/apl-core/issues/2125)) ([29e22ab](https://github.com/linode/apl-core/commit/29e22ab2e4592df3ee9bc3a42bb6413157889ffa))
* **deps:** upgrade argocd to v3.0.3 ([#2175](https://github.com/linode/apl-core/issues/2175)) ([f782fcb](https://github.com/linode/apl-core/commit/f782fcbc9e3cc6cc16307a6ab347a2c98f8e64e3))
* follow db default version of platform ([#2197](https://github.com/linode/apl-core/issues/2197)) ([c924925](https://github.com/linode/apl-core/commit/c924925e1bf0eb50fb9a0ecc7444a532c282f30b))
* Helmfile v1 compatibility [TOOLS][MINOR] ([#2136](https://github.com/linode/apl-core/issues/2136)) ([515ceca](https://github.com/linode/apl-core/commit/515ceca551882833d0a162225aa4f20455485e9d))
* set versions to main ([#2127](https://github.com/linode/apl-core/issues/2127)) ([9c73f65](https://github.com/linode/apl-core/commit/9c73f65b969674199a5bdd3abcc8e0aa3e98d935))
* update SECURITY.md ([f5d0464](https://github.com/linode/apl-core/commit/f5d04645e9953e65215c4eba81712ed2c25648bc))
* update the displayed versions ([#2152](https://github.com/linode/apl-core/issues/2152)) ([4bac5c5](https://github.com/linode/apl-core/commit/4bac5c5a9e221613c5e195638050a6e1035b875e))
* update versions ([71e8eca](https://github.com/linode/apl-core/commit/71e8eca6af5ae75259d84dd9c7f9f739609e1114))
* Upgrade CloudnativePG Operator ([#2183](https://github.com/linode/apl-core/issues/2183)) ([48369f4](https://github.com/linode/apl-core/commit/48369f4385826275d9976d2a27f9dcd0537d1a76))
* upgrade Istio and deprovision istio operator ([#2155](https://github.com/linode/apl-core/issues/2155)) ([b8a1c94](https://github.com/linode/apl-core/commit/b8a1c945d93540da31e75fabeba0554956a75136))
* Upgrade Keycloak to latest release ([#2174](https://github.com/linode/apl-core/issues/2174)) ([f5f68a0](https://github.com/linode/apl-core/commit/f5f68a05ca100dd9ba025ddeac232d4c0719dd9a))
* Upgrade to Istio 1.26.1 ([#2210](https://github.com/linode/apl-core/issues/2210)) ([2d978ee](https://github.com/linode/apl-core/commit/2d978eefd81e4b6a8326c47c1d02d762173c3e94))
* v4.6.0 changelog anf package*.json update [ci skip] ([#2182](https://github.com/linode/apl-core/issues/2182)) ([ca23641](https://github.com/linode/apl-core/commit/ca236411c8784548aac1006551a2cf04abb62d54))

## [4.6.0](https://github.com/linode/apl-core/compare/v4.5.0...v4.6.0) (2025-05-27)


### Features

* compatibility k8s version v1.33 ([#2107](https://github.com/linode/apl-core/issues/2107)) ([9bd46c9](https://github.com/linode/apl-core/commit/9bd46c9d2e023415bd18f4c1dc8f1a460061ab1c))
* upgrade Gitea to recent release ([#2085](https://github.com/linode/apl-core/issues/2085)) ([8267993](https://github.com/linode/apl-core/commit/8267993ca180d6efc5a3e6ce11c90c1b8bb0a004))
* upgrade Keycloak to recent release and deprovision operator ([#2078](https://github.com/linode/apl-core/issues/2078)) ([9e84b9f](https://github.com/linode/apl-core/commit/9e84b9f9a14be3fddf6c9ae5bfa35517d75dd4f7))


### Bug Fixes

* added v1.33 to the supportedK8sVersions.json file ([#2159](https://github.com/linode/apl-core/issues/2159)) ([9809d45](https://github.com/linode/apl-core/commit/9809d45b11f8c689ba30a2a1ab5f98a6950c4875))
* annotate Gitea volume ([#2158](https://github.com/linode/apl-core/issues/2158)) ([731e810](https://github.com/linode/apl-core/commit/731e81085880efa4c744ada32436470eec072cb1))
* include ingress-nginx apps in values ([#2132](https://github.com/linode/apl-core/issues/2132)) ([6141f21](https://github.com/linode/apl-core/commit/6141f2151db2b3c46faea3eba8448896ce321375))
* pre-upgrade script, username, and installation order for Keycloak ([#2128](https://github.com/linode/apl-core/issues/2128)) ([219a594](https://github.com/linode/apl-core/commit/219a5949e360fe06198f67d07c50a8cfec9c6365))
* quote sensitive values in Helm templates ([#2150](https://github.com/linode/apl-core/issues/2150)) ([214bd5d](https://github.com/linode/apl-core/commit/214bd5d54f86c9dd42dd5de808c39459ca97b7e4))


### Others

* add code owners ([#2141](https://github.com/linode/apl-core/issues/2141)) ([2dd59af](https://github.com/linode/apl-core/commit/2dd59af93c86d27b7482526e24790bad32930bab))
* **deps:** bump actions/checkout from 3 to 4 ([#2122](https://github.com/linode/apl-core/issues/2122)) ([7d9d239](https://github.com/linode/apl-core/commit/7d9d2392e7a4e17acf30fa818c260a7bb05215ef))
* **deps:** update dependencies, replace ts-node with tsx, add new eslint file ([#2125](https://github.com/linode/apl-core/issues/2125)) ([29e22ab](https://github.com/linode/apl-core/commit/29e22ab2e4592df3ee9bc3a42bb6413157889ffa))
* set versions to main ([#2127](https://github.com/linode/apl-core/issues/2127)) ([9c73f65](https://github.com/linode/apl-core/commit/9c73f65b969674199a5bdd3abcc8e0aa3e98d935))
* update the displayed versions ([#2152](https://github.com/linode/apl-core/issues/2152)) ([4bac5c5](https://github.com/linode/apl-core/commit/4bac5c5a9e221613c5e195638050a6e1035b875e))
* **versions:** updating apl projects versions ([be18652](https://github.com/linode/apl-core/commit/be186521c59630895d0a05722e969a89ecf04479))

## [4.5.0](https://github.com/linode/apl-core/compare/v4.4.0...v4.5.0) (2025-05-06)


### Features

* add argocd sync waves to ensure tasks and pipelines are created in the right order ([#2117](https://github.com/linode/apl-core/issues/2117)) ([9ac4dcc](https://github.com/linode/apl-core/commit/9ac4dcca221d15e2ddf68b3369bcadaa4642aa89))
* add gitea repo public url as env ([#2034](https://github.com/linode/apl-core/issues/2034)) ([332fdcb](https://github.com/linode/apl-core/commit/332fdcb071b8e04342f12e56471877c4e53280e6))
* allow gitea-operator to list pods in Gitea namespace ([#2106](https://github.com/linode/apl-core/issues/2106)) ([2062488](https://github.com/linode/apl-core/commit/2062488c0f5f34edf01cb46ef934e70213f9dc15))
* argocd to check repo every 15s ([#2075](https://github.com/linode/apl-core/issues/2075)) ([81578f6](https://github.com/linode/apl-core/commit/81578f6e9e5f5ed9989ad87ac9c3bf7703e03168))
* auto creation of webhooks in gitea for builds ([#1971](https://github.com/linode/apl-core/issues/1971)) ([b5338af](https://github.com/linode/apl-core/commit/b5338af6b20ca52e2cc012282b6aa1785340405b))
* CNPG recovery options ([#1926](https://github.com/linode/apl-core/issues/1926)) ([98d8bfe](https://github.com/linode/apl-core/commit/98d8bfe4738bf2b772e437e376920ba5dfaeba9c))
* improve gitops  compatibility by defining new file structure ([#1930](https://github.com/linode/apl-core/issues/1930)) ([8e15923](https://github.com/linode/apl-core/commit/8e15923121c5d0a437dac7313959f2009ab44fd6))
* new build page ([#2026](https://github.com/linode/apl-core/issues/2026)) ([7bee88b](https://github.com/linode/apl-core/commit/7bee88be4a9b3af4104fde081be5edcbaa3c64f7))
* rely solely on metadata name ([#2040](https://github.com/linode/apl-core/issues/2040)) ([0f89b2b](https://github.com/linode/apl-core/commit/0f89b2b507b5e3d79ed4c289683eb20ac714763e))
* service page using new components ([#1996](https://github.com/linode/apl-core/issues/1996)) ([f3b5745](https://github.com/linode/apl-core/commit/f3b57450ae7c4c4101d046e3ba1c64059195023d))
* split up team policies to single file ([#2057](https://github.com/linode/apl-core/issues/2057)) ([33d68ff](https://github.com/linode/apl-core/commit/33d68fff499efae2b8b7c050a2a2e2b7ea285a8d))
* static team settings page  ([#2024](https://github.com/linode/apl-core/issues/2024)) ([b6c66b1](https://github.com/linode/apl-core/commit/b6c66b1028d6aae1c6d88b41de54fe4b8ee49298))
* switching to linode-block-storage as default for tekton builds ([#2101](https://github.com/linode/apl-core/issues/2101)) ([776f3c4](https://github.com/linode/apl-core/commit/776f3c4d0b4c35a846e550adf36e51d4d9bcd7a9))
* update api and console versions ([#2019](https://github.com/linode/apl-core/issues/2019)) ([793df47](https://github.com/linode/apl-core/commit/793df471d2cda2a840179ca0d63f9b08352289f3))
* updated ingress_nginx helm chart to v4.11.5 ([#2011](https://github.com/linode/apl-core/issues/2011)) ([4d81a61](https://github.com/linode/apl-core/commit/4d81a618295df7813ed7accb6138d06d600bae20))
* updated keycloak operator and gitea values ([#2008](https://github.com/linode/apl-core/issues/2008)) ([ebda118](https://github.com/linode/apl-core/commit/ebda1187d9a01cb36f646c61f375d7bbd1b8ea5e))
* use internal service for traffic between apl-api and gitea ([#2016](https://github.com/linode/apl-core/issues/2016)) ([775e307](https://github.com/linode/apl-core/commit/775e307449b8b6db1dc851572874c92cd00ead0d))


### Bug Fixes

* 5xx errors ([#2025](https://github.com/linode/apl-core/issues/2025)) ([85f474f](https://github.com/linode/apl-core/commit/85f474f7224cccd5fc5808955f9729ca9f99fa77))
* alert values ([#2077](https://github.com/linode/apl-core/issues/2077)) ([053077b](https://github.com/linode/apl-core/commit/053077b9e4d337fd4fb13d6f22f00d17b37e1a04))
* always deploy ingress for team core apps  ([#2110](https://github.com/linode/apl-core/issues/2110)) ([5121cad](https://github.com/linode/apl-core/commit/5121cadfbef7c62287259b97e997c8d1ca521ef6))
* commit and push ([#2066](https://github.com/linode/apl-core/issues/2066)) ([d358c38](https://github.com/linode/apl-core/commit/d358c383bdb8082af28052ba92cb8656c52cfd1d))
* correct values order ([#2074](https://github.com/linode/apl-core/issues/2074)) ([d92a543](https://github.com/linode/apl-core/commit/d92a543469879a087802be71439ca6592961b833))
* decrypt after updated structure encryption ([#2082](https://github.com/linode/apl-core/issues/2082)) ([9be7903](https://github.com/linode/apl-core/commit/9be7903a2897eaa1d0c68dc26ae18171fc11f3fe))
* dont run team-tasks on "ci_skip" commits ([#2103](https://github.com/linode/apl-core/issues/2103)) ([8e129bd](https://github.com/linode/apl-core/commit/8e129bddb3ab7c474bdb0a216425f3dc0f4465b6))
* ensure sealedsecrets and workloadValues directories exist ([#2069](https://github.com/linode/apl-core/issues/2069)) ([ac1b191](https://github.com/linode/apl-core/commit/ac1b1910ba4920aaebe52e57dd6e94f2f8808950))
* get envDir path from the function argument ([#2004](https://github.com/linode/apl-core/issues/2004)) ([8341059](https://github.com/linode/apl-core/commit/8341059d8b473bad4d138698da2e8142670f5a13))
* log complete error of ajv validation ([#2065](https://github.com/linode/apl-core/issues/2065)) ([1420a40](https://github.com/linode/apl-core/commit/1420a40a014a87db49502a739bb09bb28311fe44))
* move operator rbac to chart ([#2093](https://github.com/linode/apl-core/issues/2093)) ([790b99f](https://github.com/linode/apl-core/commit/790b99f12509d2d780d82581a1d5862e38d1e86f))
* obtaining the apl version from values repo ([#2003](https://github.com/linode/apl-core/issues/2003)) ([242a42e](https://github.com/linode/apl-core/commit/242a42ed4ad37700908d111ffd2b34a7b85f6020))
* only encrypt secret files if not encrypted ([#2086](https://github.com/linode/apl-core/issues/2086)) ([920ef83](https://github.com/linode/apl-core/commit/920ef8332648a1445e17f2f83a23c45f66970917))
* process resource quota as list ([#2055](https://github.com/linode/apl-core/issues/2055)) ([3a344b4](https://github.com/linode/apl-core/commit/3a344b4be7ae34605b30deb8efebfa950bc564f9))
* pull before pushing to gitea in commitAndPush func ([#2063](https://github.com/linode/apl-core/issues/2063)) ([96003c8](https://github.com/linode/apl-core/commit/96003c8ecf387e511f4da66a674867bb0df5b8ec))
* rabbitmq out of sync in argocd ([#2018](https://github.com/linode/apl-core/issues/2018)) ([c4ed6dd](https://github.com/linode/apl-core/commit/c4ed6dda672bb5ef72d346acf576d0b7a4ccdec0))
* remove coverage annotations ([#2050](https://github.com/linode/apl-core/issues/2050)) ([0eab891](https://github.com/linode/apl-core/commit/0eab891f24f0e1c0cc05b30011b30ee13f8e12c8))
* remove resourcequota and limitrange limits ([#2115](https://github.com/linode/apl-core/issues/2115)) ([73fdd55](https://github.com/linode/apl-core/commit/73fdd55ff87fa38310fc7e41919967a25c77241b))
* render build git-credentials only if secretName specified ([#2062](https://github.com/linode/apl-core/issues/2062)) ([ffdfa3e](https://github.com/linode/apl-core/commit/ffdfa3e209bfe656eb05f7b6bf257f1f761672ef))
* replace username and password from git related logs ([#2037](https://github.com/linode/apl-core/issues/2037)) ([94b056f](https://github.com/linode/apl-core/commit/94b056f4b4e5fba14773549cd8cbb10ae1c74d29))
* selfservice defaults ([#2104](https://github.com/linode/apl-core/issues/2104)) ([5e60e9e](https://github.com/linode/apl-core/commit/5e60e9ee03ef31a497cc1fcbbaf84c1964f23545))
* set resource limits to enforce resource defaults for containers ([#2100](https://github.com/linode/apl-core/issues/2100)) ([41d316a](https://github.com/linode/apl-core/commit/41d316adfbfb59b88dc8d91bea52316e63389147))
* set team defaults ([#2095](https://github.com/linode/apl-core/issues/2095)) ([6f7d447](https://github.com/linode/apl-core/commit/6f7d447937c7e26b290579abe1974da4a3323c28))
* team access to loki logs ([#2116](https://github.com/linode/apl-core/issues/2116)) ([c39bc9b](https://github.com/linode/apl-core/commit/c39bc9b2f17d552d77bbd20343deaae50f52d201))
* team-ns build templates for git credentials ([#2068](https://github.com/linode/apl-core/issues/2068)) ([8716f15](https://github.com/linode/apl-core/commit/8716f15fd5e68d25bcf4e7ac69c07c27ee520f93))
* updated keycloak init container version rendering ([#2108](https://github.com/linode/apl-core/issues/2108)) ([ce8f4f0](https://github.com/linode/apl-core/commit/ce8f4f046729bad6682a023bf51385424aae6684))


### Others

* **chart-deps:** update external-dns to version 8.7.8 ([#2015](https://github.com/linode/apl-core/issues/2015)) ([3bb0b16](https://github.com/linode/apl-core/commit/3bb0b1691f0338b366924a930d06a7bda882cfd3))
* **deps:** bump @types/lodash from 4.17.13 to 4.17.16 ([#2041](https://github.com/linode/apl-core/issues/2041)) ([3143105](https://github.com/linode/apl-core/commit/314310543171ed94bf72b8237f000a7a4ea32d53))
* **deps:** bump @types/retry from 0.12.2 to 0.12.5 ([#1915](https://github.com/linode/apl-core/issues/1915)) ([f8aa45a](https://github.com/linode/apl-core/commit/f8aa45a71b252cdda9cd92678a5a0f38f7f0fe9c))
* **deps:** bump debug and @types/debug ([#1913](https://github.com/linode/apl-core/issues/1913)) ([a2a5b79](https://github.com/linode/apl-core/commit/a2a5b7907df840d7e5219d8b065bc118e7f4cc16))
* **deps:** bump ncipollo/release-action from 1.15.0 to 1.16.0 ([#1972](https://github.com/linode/apl-core/issues/1972)) ([54b2960](https://github.com/linode/apl-core/commit/54b296009176636bcda71418a041e3e0db860ef0))
* **deps:** bump ts-node-dev from 1.1.8 to 2.0.0 ([#1914](https://github.com/linode/apl-core/issues/1914)) ([7a586c1](https://github.com/linode/apl-core/commit/7a586c1df5907e1d574d09d4a5743d6d19c134b7))
* set api version 4.1.1 ([#2036](https://github.com/linode/apl-core/issues/2036)) ([e186417](https://github.com/linode/apl-core/commit/e18641704921f198ef31be2f6260e8d77fa85096))
* update .env.sample ([#2017](https://github.com/linode/apl-core/issues/2017)) ([22cc2f5](https://github.com/linode/apl-core/commit/22cc2f5b62de6fc14e6dd0041f5ef7461789b655))
* update api version ([#2030](https://github.com/linode/apl-core/issues/2030)) ([a6254b2](https://github.com/linode/apl-core/commit/a6254b2319582e83bb8e09030ca3bd86dc2052ce))
* update pull request template ([#2046](https://github.com/linode/apl-core/issues/2046)) ([e58f39d](https://github.com/linode/apl-core/commit/e58f39d4aa26e6347991c70df8ece79ba11d40e9))
* update task version ([#2022](https://github.com/linode/apl-core/issues/2022)) ([7b3ce79](https://github.com/linode/apl-core/commit/7b3ce79db92fae910cf60300d2ee69af938126d3))
* update versions ([#2043](https://github.com/linode/apl-core/issues/2043)) ([fb4340f](https://github.com/linode/apl-core/commit/fb4340f6c37a0b05fc09136d2abda5ad096aaccf))


### Tests

* add build fixtures ([#2067](https://github.com/linode/apl-core/issues/2067)) ([c0f4765](https://github.com/linode/apl-core/commit/c0f4765c4aceb4060880fd8ec931fe3f9ec6918b))


### CI

* added automatic deployment to dev for commits to main ([#2047](https://github.com/linode/apl-core/issues/2047)) ([a0a4623](https://github.com/linode/apl-core/commit/a0a4623d2a261f487103b57a5d6385adf00cd3e3))
* added checkout step to deploy-to-dev job ([#2048](https://github.com/linode/apl-core/issues/2048)) ([ea0722b](https://github.com/linode/apl-core/commit/ea0722b8298514cb01095b39e71d845df35e5da9))
* added pr-autoupdate job ([#2053](https://github.com/linode/apl-core/issues/2053)) ([b731a85](https://github.com/linode/apl-core/commit/b731a85926abc5d114657dcbed5780a2ea7f39a5))
* added release candidate pipelines ([#2076](https://github.com/linode/apl-core/issues/2076)) ([54d4727](https://github.com/linode/apl-core/commit/54d4727d2054e946d838e0013718ddff92c4313b))
* fix compare.sh script ([#2045](https://github.com/linode/apl-core/issues/2045)) ([b299c9f](https://github.com/linode/apl-core/commit/b299c9f61bd8ddaedd5dd3cb66433feb499b33b0))
* fixed git config order ([#2096](https://github.com/linode/apl-core/issues/2096)) ([4305ef1](https://github.com/linode/apl-core/commit/4305ef11d1ff5861fc21c777a4767acb38350e0b))
* path of workload values in installation profiles ([#2028](https://github.com/linode/apl-core/issues/2028)) ([d8e3552](https://github.com/linode/apl-core/commit/d8e3552545381e02a5deba3e712e8f4ed1bd6a5d))
* update manifest kind in fixtures ([#2029](https://github.com/linode/apl-core/issues/2029)) ([830b5b2](https://github.com/linode/apl-core/commit/830b5b2d7db414988c24f83cd97ce26b29d1ad33))
* update test fixtures ([#2039](https://github.com/linode/apl-core/issues/2039)) ([5e1dc9c](https://github.com/linode/apl-core/commit/5e1dc9ca6305735f35caa2133a136e323f4bf268))
* updated github token to bot token ([#2099](https://github.com/linode/apl-core/issues/2099)) ([4258f87](https://github.com/linode/apl-core/commit/4258f87605d05b2f44d8f750d8eb3a076fb644ad))
* updated trigger_dev.sh clone directory ([#2049](https://github.com/linode/apl-core/issues/2049)) ([aa419a9](https://github.com/linode/apl-core/commit/aa419a91f5bfa8d1745a2c6f45b27f934030213b))
* updated workflow to use a PAT instead of the default GITHUB_TOKEN ([#2088](https://github.com/linode/apl-core/issues/2088)) ([f098b49](https://github.com/linode/apl-core/commit/f098b4917eadf5672eead6eaaa8b8db8e9d169b1))
* using BOT_EMAIL and BOT_USERNAME variables ([#2094](https://github.com/linode/apl-core/issues/2094)) ([b9bb9dc](https://github.com/linode/apl-core/commit/b9bb9dc84b11ce5753d651ccd93d0b1247a11e5d))
* using node 20 ([#2092](https://github.com/linode/apl-core/issues/2092)) ([ed24a18](https://github.com/linode/apl-core/commit/ed24a1839f7e2a30c2c2fe7ed30e81155adbc53d))

## [4.4.0](https://github.com/linode/apl-core/compare/v4.3.0...v4.4.0) (2025-03-14)


### Features

* add coderepository schema & fixtures ([#1945](https://github.com/linode/apl-core/issues/1945)) ([0382ee1](https://github.com/linode/apl-core/commit/0382ee1ecef527cd9b813299a96964fcf9df85fd))
* added semantic-release gh-actions ([#1933](https://github.com/linode/apl-core/issues/1933)) ([8b379fa](https://github.com/linode/apl-core/commit/8b379fae329bc16b046d92291a479c2591ad32c8))
* added upgrade script for secrets ([#1967](https://github.com/linode/apl-core/issues/1967)) ([86b8ae0](https://github.com/linode/apl-core/commit/86b8ae05cac57b44239f444ca58cb4f55fbe5e8f))
* api endpoint ([#1982](https://github.com/linode/apl-core/issues/1982)) ([24b45e9](https://github.com/linode/apl-core/commit/24b45e934b07e1ddf10ad9419e7e50fb8f29cf61))
* Add self-service option for admins to add external helm charts to the catalog ([#1979](https://github.com/linode/apl-core/issues/1979)) ([fb993e1](https://github.com/linode/apl-core/commit/fb993e10f05d0ee0d85fa17223c46c4e836ae490))
* create service accounts for gitea organizations ([#1929](https://github.com/linode/apl-core/issues/1929)) ([40a3d20](https://github.com/linode/apl-core/commit/40a3d2004b63e6565adb36013b1140b6b5a85984))
* deploy sealed secrets from the values repo ([#1924](https://github.com/linode/apl-core/issues/1924)) ([f70c855](https://github.com/linode/apl-core/commit/f70c855071e97d5ff4d8c71b3019259c182c1862))
* update versions.yaml ([#1989](https://github.com/linode/apl-core/issues/1989)) ([69224d6](https://github.com/linode/apl-core/commit/69224d63759866442c9ce459a65d8f5751ce7fc0))


### Bug Fixes

* check for helm secrets version and update it ([#1927](https://github.com/linode/apl-core/issues/1927)) ([b74377c](https://github.com/linode/apl-core/commit/b74377cf6cc3ed25f5652f1b17f99a09d366472a))
* checking if gitea is ready in git-clone tasks ([#1936](https://github.com/linode/apl-core/issues/1936)) ([a3dfb4a](https://github.com/linode/apl-core/commit/a3dfb4a3a4a969677ab96954a47407e5077b05a2))
* falco dashboard title ([#1928](https://github.com/linode/apl-core/issues/1928)) ([d0fb19c](https://github.com/linode/apl-core/commit/d0fb19cb7bdcc4c0c4b2d2457ef90b0a595b31ac))
* generate password with special characters ([#1938](https://github.com/linode/apl-core/issues/1938)) ([f16ce6b](https://github.com/linode/apl-core/commit/f16ce6bd00459d769a466a04dccc2de122ea1167))
* ignoreDifferences for apps created by team-admin ([#1995](https://github.com/linode/apl-core/issues/1995)) ([80e260e](https://github.com/linode/apl-core/commit/80e260e353914b74b1b2d4dd2f5c0bda8771195b))
* removed git error which can expose credentials ([#1944](https://github.com/linode/apl-core/issues/1944)) ([4c00fa1](https://github.com/linode/apl-core/commit/4c00fa19abbe7277796273e7bcb5e87912f61ed2))
* unique admin password for gitea ([#1910](https://github.com/linode/apl-core/issues/1910)) ([a2f1349](https://github.com/linode/apl-core/commit/a2f1349b02ab309fa6c20f869964ab09347c4b13))
* unique admin password for gitea ([#1940](https://github.com/linode/apl-core/issues/1940)) ([eea8299](https://github.com/linode/apl-core/commit/eea82990099125b83c8434b26254acd5d0f14914))
* workload with validatingwebhookcfg ([#1942](https://github.com/linode/apl-core/issues/1942)) ([70d6aee](https://github.com/linode/apl-core/commit/70d6aee6ff09d4bb9c76fb09ba004693d96b3ff3))


### Reverts

* fix - unique admin password for gitea ([#1939](https://github.com/linode/apl-core/issues/1939)) ([7d8bf90](https://github.com/linode/apl-core/commit/7d8bf908d2d5e55a718bc4eef292c6cc9fb3e977))


### CI

* add charts and alias ([#1931](https://github.com/linode/apl-core/issues/1931)) ([57c74ec](https://github.com/linode/apl-core/commit/57c74ec67890cb205d23c89a6c6671aeac9cb6da))
* added alias for rabbitmq operator ([#1966](https://github.com/linode/apl-core/issues/1966)) ([c557cbf](https://github.com/linode/apl-core/commit/c557cbfd6f915a30432d1b3c4db1fb6cab733d42))
* added more linode types to the integration workflow ([#1976](https://github.com/linode/apl-core/issues/1976)) ([2c6e084](https://github.com/linode/apl-core/commit/2c6e084bcca9a309597c6e018273cd15733bdfd6))
* update chart index and improve checks ([#1963](https://github.com/linode/apl-core/issues/1963)) ([0ee8cd2](https://github.com/linode/apl-core/commit/0ee8cd27b1d9c47a47145254dc301fca1736bb0e))
* update chart references ([#1937](https://github.com/linode/apl-core/issues/1937)) ([fea5c4c](https://github.com/linode/apl-core/commit/fea5c4c2c29443c75217d5068b85ec298ae8d079))
* update workflow to support k8s 1.32 and wait for kubeconfig ([#1943](https://github.com/linode/apl-core/issues/1943)) ([ab7b631](https://github.com/linode/apl-core/commit/ab7b6311dac8eee3a72dc2c7632829df04b021b1))


### Others

* **chart-deps:** update cert-manager to version v1.17.1 ([#1941](https://github.com/linode/apl-core/issues/1941)) ([e634d34](https://github.com/linode/apl-core/commit/e634d3468c4c0e86eb9451eee1906932e958d89d))
* **chart-deps:** update harbor to version 1.16.2 ([#1903](https://github.com/linode/apl-core/issues/1903)) ([af1a3a0](https://github.com/linode/apl-core/commit/af1a3a02a1137df6e7922ff76ffd04c0b5e98efd))
* **chart-deps:** update rabbitmq-cluster-operator to version 3.20.1 ([#1969](https://github.com/linode/apl-core/issues/1969)) ([d3f8a2f](https://github.com/linode/apl-core/commit/d3f8a2f923f51eb52e35c23942c3ff5414100495))
* **deps:** bump helm/chart-releaser-action from 1.6.0 to 1.7.0 ([#1901](https://github.com/linode/apl-core/issues/1901)) ([d759673](https://github.com/linode/apl-core/commit/d75967368303bb72626ddbb399fd790f30b7d837))
* **deps:** bump ncipollo/release-action from 1.14.0 to 1.15.0 ([#1893](https://github.com/linode/apl-core/issues/1893)) ([abdee3d](https://github.com/linode/apl-core/commit/abdee3d9c187d456849cf99e6e9fd6e73b4b20db))
* tasks version to 3.7.0 ([#1977](https://github.com/linode/apl-core/issues/1977)) ([cfa5608](https://github.com/linode/apl-core/commit/cfa5608c8060a641cee08b50fc05e38198b5a101))
* updated api and console versions ([#1999](https://github.com/linode/apl-core/issues/1999)) ([753e480](https://github.com/linode/apl-core/commit/753e480388c650e1114f7f062cfbb5e47c731284))
* versions ([#1970](https://github.com/linode/apl-core/issues/1970)) ([40ef843](https://github.com/linode/apl-core/commit/40ef843a930683215ce271571dfcad8a601caf0e))

## [4.3.0](https://github.com/linode/apl-core/compare/v4.2.0...v4.3.0) (2025-02-10)


### Features

* add coverage to github ci ([#1920](https://github.com/linode/apl-core/issues/1920)) ([232bb48](https://github.com/linode/apl-core/commit/232bb48e367647d893cf861108dee70f9850bdce))
* add support for Kubernetes 1.32 ([#1894](https://github.com/linode/apl-core/issues/1894)) ([9b1e19c](https://github.com/linode/apl-core/commit/9b1e19c90c6bac3c10e017fd960ecaf5571839a7))
* added more charts to the chart-index ([#1900](https://github.com/linode/apl-core/issues/1900)) ([061d372](https://github.com/linode/apl-core/commit/061d37232fec7959e192e5a6f595ee964b6781f5))
* updating teams defaults ([#1909](https://github.com/linode/apl-core/issues/1909)) ([6dc29db](https://github.com/linode/apl-core/commit/6dc29db37c00543db56fe74ea89cbc1606f28d71))
* fix decrypt ([#1922](https://github.com/linode/apl-core/issues/1922)) ([ea3badf](https://github.com/linode/apl-core/commit/ea3badf4ac3f007047aee43ebcb706a125dd1300))
* fix open redirect vulnerability ([#1899](https://github.com/linode/apl-core/issues/1899)) ([f180cc9](https://github.com/linode/apl-core/commit/f180cc9b3f772bf49e2c3e862f6b6c7cf2796a14))
* increase Gitea timeout ([#1921](https://github.com/linode/apl-core/issues/1921)) ([21a0691](https://github.com/linode/apl-core/commit/21a06911c6a0e43105e956260c6799e8ae780c21))
* lowering DBs cpu resources ([#1891](https://github.com/linode/apl-core/issues/1891)) ([07ba2b9](https://github.com/linode/apl-core/commit/07ba2b9671bf6f9afc40be701a5dd65a5b3567e3))


### Bug Fixes

* added team networkpolicies to the team-ns values gotemplate ([#1902](https://github.com/linode/apl-core/issues/1902)) ([51300a5](https://github.com/linode/apl-core/commit/51300a559e3dc77bb287b32d1ef48849c5b9cb55))
* bootstrap team password ([#1917](https://github.com/linode/apl-core/issues/1917)) ([b5ac229](https://github.com/linode/apl-core/commit/b5ac229b61d0083f0038f6410bc180f0d9f8c939))
* encryption ([#1919](https://github.com/linode/apl-core/issues/1919)) ([3773a29](https://github.com/linode/apl-core/commit/3773a292c9c32c23f71f1b6ff55cb5ed405a1124))
* package-lock ([#1923](https://github.com/linode/apl-core/issues/1923)) ([4d488b7](https://github.com/linode/apl-core/commit/4d488b7c36122fc0bb4bfa67d950778ab4a94a2e))
* team network policies ([#1904](https://github.com/linode/apl-core/issues/1904)) ([9b5ee85](https://github.com/linode/apl-core/commit/9b5ee85154eaaa98ceb363fbf0f14842cb667994))
* update message ([#1889](https://github.com/linode/apl-core/issues/1889)) ([152dcd2](https://github.com/linode/apl-core/commit/152dcd22eb46bdc83092192c5c6681bb8305771d))
* update session settings for Gitea ([#1908](https://github.com/linode/apl-core/issues/1908)) ([0b639bb](https://github.com/linode/apl-core/commit/0b639bbdcaa217f1e1dcdc32c7bae6613b13d9dc))
* use emptydir for Gitea backup volume on custom provider ([#1898](https://github.com/linode/apl-core/issues/1898)) ([80ebd93](https://github.com/linode/apl-core/commit/80ebd93ed5578de5b4f7164b8718ab1367b720bf))


### Others

* **chart-deps:** update cert-manager to version v1.16.2 ([#1874](https://github.com/linode/apl-core/issues/1874)) ([bfeb0a0](https://github.com/linode/apl-core/commit/bfeb0a00276180697a2165204c1e608290f8bc9f))
* **chart-deps:** update cert-manager to version v1.16.3 ([#1896](https://github.com/linode/apl-core/issues/1896)) ([7d78be9](https://github.com/linode/apl-core/commit/7d78be97681792f7a7a5f4d49636483d06bb79b4))
* **chart-deps:** update cloudnative-pg to version 0.23.0 ([#1880](https://github.com/linode/apl-core/issues/1880)) ([84748ed](https://github.com/linode/apl-core/commit/84748ed3de2493decd86f612269a182b94800c6b))
* **chart-deps:** update harbor to version 1.16.1 ([#1892](https://github.com/linode/apl-core/issues/1892)) ([75fc895](https://github.com/linode/apl-core/commit/75fc8957f45b68028373043c57377c31b440bbfa))
* **chart-deps:** update promtail to version 6.16.6 ([#1877](https://github.com/linode/apl-core/issues/1877)) ([bada051](https://github.com/linode/apl-core/commit/bada051021b4ec6f31a2c9947049c7fc9c1f7de5))
* **chart-deps:** update sealed-secrets to version 2.17.1 ([#1897](https://github.com/linode/apl-core/issues/1897)) ([e3f074a](https://github.com/linode/apl-core/commit/e3f074a5898680ddb9b38f5afd3734bb3ae76b7c))
* **deps:** bump actions/checkout from 3 to 4 ([#1869](https://github.com/linode/apl-core/issues/1869)) ([ea9e397](https://github.com/linode/apl-core/commit/ea9e397083c398561c45e2291591e7c9fe04bd27))
* **deps:** bump actions/setup-node from 3 to 4 ([#1868](https://github.com/linode/apl-core/issues/1868)) ([d13e48c](https://github.com/linode/apl-core/commit/d13e48c1f88275964630f419078a3f47fc35992d))
* **deps:** bump linode/apl-tools from v2.8.6 to v2.8.7 ([#1870](https://github.com/linode/apl-core/issues/1870)) ([21dcaf9](https://github.com/linode/apl-core/commit/21dcaf9493f0a5ae36fe326b7b49cf05fee69035))
* update changelog ([#1890](https://github.com/linode/apl-core/issues/1890)) ([2c0e39f](https://github.com/linode/apl-core/commit/2c0e39fe7e78b719ef40b5dde8620d87e1285a23))
* update console and api to latest release ([#1932](https://github.com/linode/apl-core/issues/1932)) ([0fab990](https://github.com/linode/apl-core/commit/0fab9907989348d5bd8c27c88b405e28cd6bf3e7))
* update task version to 3.6.0 ([#1895](https://github.com/linode/apl-core/issues/1895)) ([5e07fd0](https://github.com/linode/apl-core/commit/5e07fd0f44f389c9e612222a95ce7a5ca8769277))
* update task version to 3.6.1 ([#1916](https://github.com/linode/apl-core/issues/1916)) ([9e1b61f](https://github.com/linode/apl-core/commit/9e1b61f9e2864db9ca490efd2f0549b6ccab2b35))
* updated trivy-operator helm chart registry ([#1905](https://github.com/linode/apl-core/issues/1905)) ([6cb6017](https://github.com/linode/apl-core/commit/6cb60177ec545844c72dd83a7464d86344842bf3))


### [4.2.2](https://github.com/linode/apl-core/compare/v4.2.1...v4.2.2) (2025-01-09)


### Features

* lowering DBs cpu resources ([#1891](https://github.com/linode/apl-core/issues/1891)) ([df2245a](https://github.com/linode/apl-core/commit/df2245a5e3d1581dacf957fb4855a0d651644a36))

### [4.2.1](https://github.com/linode/apl-core/compare/v4.1.0...v4.2.1) (2025-01-08)


### Bug Fixes

* update message ([#1889](https://github.com/linode/apl-core/issues/1889)) ([4552c4a](https://github.com/linode/apl-core/commit/4552c4a9dbc2c2e196e78e426d96a971db04ee9f))

## [4.2.0](https://github.com/linode/apl-core/compare/v4.1.0...v4.2.0) (2025-01-08)


### Features

* add dependabot ([#1807](https://github.com/linode/apl-core/issues/1807)) ([497c66d](https://github.com/linode/apl-core/commit/497c66d71e2dc3dd6b00882aedc681c970c84c59))
* add path for gitea ([#1835](https://github.com/linode/apl-core/issues/1835)) ([6e62d6a](https://github.com/linode/apl-core/commit/6e62d6a15868ee8debc9124df0fbc9c145d462d9))
* add prometheus rule to validate db backup executions ([#1866](https://github.com/linode/apl-core/issues/1866)) ([5586cd9](https://github.com/linode/apl-core/commit/5586cd9b522e303cb168a51381f942317a453301))
* add prometheus rules for cnpg backups ([#1837](https://github.com/linode/apl-core/issues/1837)) ([99e9e20](https://github.com/linode/apl-core/commit/99e9e2061069b405d5e8da844bd52237155ef4ef))
* add resource configuration for apps to teams ([#1819](https://github.com/linode/apl-core/issues/1819)) ([64a51c3](https://github.com/linode/apl-core/commit/64a51c3e0c95ca54a8a535ddff3d3115dd239f8b))
* lower database memory footprint ([#1856](https://github.com/linode/apl-core/issues/1856)) ([8dfe18b](https://github.com/linode/apl-core/commit/8dfe18b566db5f046c28515c7dbb7f5ca3e53c21))
* cnpg upgrade fix ([#1871](https://github.com/linode/apl-core/issues/1871)) ([faa8ac8](https://github.com/linode/apl-core/commit/faa8ac881d423e2302a59c2384f377a95a1891b4))
* github-actions update ([#1825](https://github.com/linode/apl-core/issues/1825)) ([e0bc42e](https://github.com/linode/apl-core/commit/e0bc42e7237bec58552347c3697aa3ce972e37dd))
* lower pipeline and db footprint ([#1873](https://github.com/linode/apl-core/issues/1873)) ([3b76352](https://github.com/linode/apl-core/commit/3b76352734294e18b02c75b658bfb1cf54a01ffe))
* upgrade to node 20  ([#1797](https://github.com/linode/apl-core/issues/1797)) ([69d7364](https://github.com/linode/apl-core/commit/69d7364da43f3e1805c9ea8369c029e3e9e6f437))
* patch argocd resources when oomkilled ([#1814](https://github.com/linode/apl-core/issues/1814)) ([99553f3](https://github.com/linode/apl-core/commit/99553f3aa0ebe5cae3cfbb44e4d53af2f35f4cac))
* removed uneeded tag ([#1811](https://github.com/linode/apl-core/issues/1811)) ([8cc8441](https://github.com/linode/apl-core/commit/8cc8441c0342b59e678736ff3c0fbe0cfe1c7a80))
* render only relevant values for team-ns helm chart ([#1872](https://github.com/linode/apl-core/issues/1872)) ([37bdd3c](https://github.com/linode/apl-core/commit/37bdd3c47f0338e552d3cf3f76f3b0a550d6d9ee))
* update helm secrets ([#1839](https://github.com/linode/apl-core/issues/1839)) ([6ea07ae](https://github.com/linode/apl-core/commit/6ea07aea1caf73466d32982f9f33874f4aea9306))
* updated cloud-tty tools [TTY][MINOR] ([#1815](https://github.com/linode/apl-core/issues/1815)) ([26f388e](https://github.com/linode/apl-core/commit/26f388e6304c569877349e8b2c69696403c36904))
* updated release tag generation ([#1816](https://github.com/linode/apl-core/issues/1816)) ([ea936d6](https://github.com/linode/apl-core/commit/ea936d62cf55ff1c755c4265c51787c9cf1dc44b))
* upgrade Trivy Operator to support k8s version 1.31 ([#1845](https://github.com/linode/apl-core/issues/1845)) ([e78fdb8](https://github.com/linode/apl-core/commit/e78fdb800d94d401bc7d7f7777f19916d158aa28))
* upgrading cnpg chart and postgresql version ([#1784](https://github.com/linode/apl-core/issues/1784)) ([2e355c5](https://github.com/linode/apl-core/commit/2e355c5e34d74777346367d96678e15dd6b9aae5))


### Bug Fixes

* git url encoding in otomi-tasks  ([#1808](https://github.com/linode/apl-core/issues/1808)) ([74a1705](https://github.com/linode/apl-core/commit/74a17050ef930e3fafe6419ddf1744b761ba8105))
* apl-tools patch image generation ([#1824](https://github.com/linode/apl-core/issues/1824)) ([662db99](https://github.com/linode/apl-core/commit/662db991940e47ae00cd067780e80eb8bfa9971d))
* broken builds in the input files ([#1838](https://github.com/linode/apl-core/issues/1838)) ([de56ccb](https://github.com/linode/apl-core/commit/de56ccb3b4ab6de3a6cdde9f3ac5d3cffb48e3c6))
* CNPG object storage endpint URL ([#1812](https://github.com/linode/apl-core/issues/1812)) ([3b79846](https://github.com/linode/apl-core/commit/3b79846f7591dd069b351ac485a738e51e309e64))
* dependabot ignore >=21 node ([#1823](https://github.com/linode/apl-core/issues/1823)) ([d921978](https://github.com/linode/apl-core/commit/d9219782f07b6288fd5be396b770fcb62dd9f1bf))
* ensure correct working directory and increase retry timeout ([#1882](https://github.com/linode/apl-core/issues/1882)) ([4ab74e0](https://github.com/linode/apl-core/commit/4ab74e0c9b98ab77364cd9bdbd6db67d90d3c7f4))
* install minio based on enabled ([#1847](https://github.com/linode/apl-core/issues/1847)) ([f99e49f](https://github.com/linode/apl-core/commit/f99e49f10b2dd2d9744dab22d6a308d5b0d410be))
* reference to team network policies ([#1888](https://github.com/linode/apl-core/issues/1888)) ([1467a61](https://github.com/linode/apl-core/commit/1467a613426dee8d3a17a80b3098063571d92507))
* removed external-secrets charts from chart-index ([#1864](https://github.com/linode/apl-core/issues/1864)) ([8a20b29](https://github.com/linode/apl-core/commit/8a20b29bfa60886efa500600462e57fe659ad135))
* removed repoUrl variable from error message ([#1885](https://github.com/linode/apl-core/issues/1885)) ([1f64773](https://github.com/linode/apl-core/commit/1f647730fb37e2148619dad06d0e97b2e53b4a4a))
* resource check for argocd controller ([#1836](https://github.com/linode/apl-core/issues/1836)) ([a02a5b8](https://github.com/linode/apl-core/commit/a02a5b82c40a04f3231eccdeaa08d7adab8508a4))
* skip assignment of team-admin to argocd admin roles ([#1818](https://github.com/linode/apl-core/issues/1818)) ([39a53f9](https://github.com/linode/apl-core/commit/39a53f916a627382bdb744b0f3251790b643d926))
* update values schema to adhere k8s naming ([#1850](https://github.com/linode/apl-core/issues/1850)) ([8e8e21d](https://github.com/linode/apl-core/commit/8e8e21d9e8b51d3e751b174f6a2a3e58686efec0))


### CI

* add script to check for helm chart updates ([#1827](https://github.com/linode/apl-core/issues/1827)) ([d77351d](https://github.com/linode/apl-core/commit/d77351ddb72374bcf90c7b3d4bfd9649b8e500ec))
* update chart version index for a single chart ([#1867](https://github.com/linode/apl-core/issues/1867)) ([d636aba](https://github.com/linode/apl-core/commit/d636abae840af6bb5662f8ed1941a4996ffd9e7c))


### Tests

* set the isPreinstalled flag ([#1887](https://github.com/linode/apl-core/issues/1887)) ([d78625f](https://github.com/linode/apl-core/commit/d78625f34ebb192a496047ef3b824f5b8629aa8d))


### Others

* **deps:** bump linode/apl-tools from v2.8.2 to v2.8.5 ([#1820](https://github.com/linode/apl-core/issues/1820)) ([82e3716](https://github.com/linode/apl-core/commit/82e371681a02e5b89d9638c6330a1c446c843d73))
* **deps:** bump ncipollo/release-action from 1.12.0 to 1.14.0 ([#1821](https://github.com/linode/apl-core/issues/1821)) ([4aa18e6](https://github.com/linode/apl-core/commit/4aa18e6f749e68ebf407a4d16389961bc0ae2e57))
* update api v3.4.0 ([#1826](https://github.com/linode/apl-core/issues/1826)) ([be6aa6e](https://github.com/linode/apl-core/commit/be6aa6e5eca660de39851e9b936bc610cfcfbdfd))
* update console ([#1886](https://github.com/linode/apl-core/issues/1886)) ([1ce8700](https://github.com/linode/apl-core/commit/1ce8700559c94f66b398a7aa85350f95130357f2))
* versions ([#1817](https://github.com/linode/apl-core/issues/1817)) ([5f1ea8c](https://github.com/linode/apl-core/commit/5f1ea8c7c73e02c2448f93f8d6d2050e3a184808))
* versions ([#1879](https://github.com/linode/apl-core/issues/1879)) ([ff29a21](https://github.com/linode/apl-core/commit/ff29a218d00b200e5593c4a3aaefa81c05990305))

## [4.1.0](https://github.com/linode/apl-core/compare/v4.0.0...v4.1.0) (2024-11-12)


### Features

* added cors for ouath2-proxy ingress ([#1799](https://github.com/linode/apl-core/issues/1799)) ([d0ee298](https://github.com/linode/apl-core/commit/d0ee2981378f4f2234c0ca161fd8cb98f8c25dd8))
* added policy setting to external-dns values ([#1793](https://github.com/linode/apl-core/issues/1793)) ([d6d9741](https://github.com/linode/apl-core/commit/d6d9741d001ca1694a14e8c689a49770a73cfe22))
* adjust retry factor to 1 and 30 retries of 1 minute ([#1801](https://github.com/linode/apl-core/issues/1801)) ([70099bc](https://github.com/linode/apl-core/commit/70099bceb34e525bdf8d58e30e087f044b43fb6e))
* object storage wizard ([#1790](https://github.com/linode/apl-core/issues/1790)) ([4d28234](https://github.com/linode/apl-core/commit/4d28234da70c6cb0e81b72f4e1ad03c37fcc60f2))
* set datasource for trivy dashboard to default ([#1796](https://github.com/linode/apl-core/issues/1796)) ([cd52cc0](https://github.com/linode/apl-core/commit/cd52cc0f86e7347b2c6c249c6d2902912b030c7f))
* update tools version ([#1794](https://github.com/linode/apl-core/issues/1794)) ([718719b](https://github.com/linode/apl-core/commit/718719b2d4890a0dc56e4525880c96290e012f65))


### Bug Fixes

* change default falco driver ([#1795](https://github.com/linode/apl-core/issues/1795)) ([5fc6f14](https://github.com/linode/apl-core/commit/5fc6f149eb10e920be4f6b64b6b98f01d840d5a2))
* datasource for team and platform Grafana dashboards ([#1785](https://github.com/linode/apl-core/issues/1785)) ([6782421](https://github.com/linode/apl-core/commit/6782421ac651aea5cebdc68c9aaa98f1b2897b38))
* falco team grafana falco dashboard datasource ([#1806](https://github.com/linode/apl-core/issues/1806)) ([378903f](https://github.com/linode/apl-core/commit/378903f7f433113658f6178b5540de734eb8ec0a))


### Others

* rename application  to app ([#1804](https://github.com/linode/apl-core/issues/1804)) ([9d886eb](https://github.com/linode/apl-core/commit/9d886eb3d6c3038eb439ac6f7371d3fc34523909))
* update packages and docker image [TOOLS][MINOR] ([#1788](https://github.com/linode/apl-core/issues/1788)) ([1ab0fca](https://github.com/linode/apl-core/commit/1ab0fca52a9f794ef872eb115d130db47f4d9f8f))
* versions ([#1802](https://github.com/linode/apl-core/issues/1802)) ([8dca419](https://github.com/linode/apl-core/commit/8dca419f5433039a73a901857ba30f8274ef748a))

## [4.0.0](https://github.com/linode/apl-core/compare/v3.0.0...v4.0.0) (2024-11-01)


### Features

* add init container for oauth2 proxy ([#1779](https://github.com/linode/apl-core/issues/1779)) ([e3886cc](https://github.com/linode/apl-core/commit/e3886cc7e03392a2a04043e9a775fb3ef3efbeee))
* add thanos for prom HA ([#1729](https://github.com/linode/apl-core/issues/1729)) ([6dd3ad7](https://github.com/linode/apl-core/commit/6dd3ad732ddaf62df665a1046adcde38c0a7852e))
* add support for externally-managed-tls-secret ([#1746](https://github.com/linode/apl-core/issues/1746)) ([f72ff6c](https://github.com/linode/apl-core/commit/f72ff6c59602dc4714aa17fc57684c2b13678aae))
* remove gatekeeper ([#1737](https://github.com/linode/apl-core/issues/1737)) ([fe9f06f](https://github.com/linode/apl-core/commit/fe9f06fc8afe779d78ca069b06dde2f9bd801549))
* upgrade tools versions ([#1743](https://github.com/linode/apl-core/issues/1743)) ([d7918dc](https://github.com/linode/apl-core/commit/d7918dcaaee3507815b5b313543c407b04493a76))
* upgrade ingress apps ([#1761](https://github.com/linode/apl-core/issues/1761)) ([990d3a1](https://github.com/linode/apl-core/commit/990d3a18fa613fe5436f094cea03a667092b3ed4))
* implement argocd applicaiton removal ([#1727](https://github.com/linode/apl-core/issues/1727)) ([bb4a757](https://github.com/linode/apl-core/commit/bb4a757f4702cf36c953c1e96d47b08a0e722da4))
* chart index ([#1759](https://github.com/linode/apl-core/issues/1759)) ([f29e5bf](https://github.com/linode/apl-core/commit/f29e5bf6c4bae9fb3e2b1ee049ef3f96bd704d02))
* add configurable core apps resources and scaling optimization  ([#1754](https://github.com/linode/apl-core/issues/1754)) ([938ac7d](https://github.com/linode/apl-core/commit/938ac7dc0737c25f8563a789bd248e15b8d95e54))
* default platform admin user ([#1770](https://github.com/linode/apl-core/issues/1770)) ([7f1f6d3](https://github.com/linode/apl-core/commit/7f1f6d395dcf8d26c11f8676dddf957db17d4f26))
* gitea backup to object storage ([#1723](https://github.com/linode/apl-core/issues/1723)) ([d2d3064](https://github.com/linode/apl-core/commit/d2d3064f3ce2669199b0fee63ca71bb23089758d))
* implement age values encryption ([#1709](https://github.com/linode/apl-core/issues/1709)) ([20ced03](https://github.com/linode/apl-core/commit/20ced03ad679ad85f7c605c4f59a09e7050c4d04))
* improve installer job feedback ([#1755](https://github.com/linode/apl-core/issues/1755)) ([d3e0783](https://github.com/linode/apl-core/commit/d3e0783d510a474fbfbc1846a459090c76b4c92c))
* add ispreinstalled flag ([#1760](https://github.com/linode/apl-core/issues/1760)) ([e498b48](https://github.com/linode/apl-core/commit/e498b48e0acac1b360724fe1e5226d4622c6b248))
* support k8s 1.31 upgrade ([#1742](https://github.com/linode/apl-core/issues/1742)) ([c298d8d](https://github.com/linode/apl-core/commit/c298d8d969698feafbfd146b7297d6f915badb26))
* add oauth2-proxy custom error page ([#1758](https://github.com/linode/apl-core/issues/1758)) ([fef95dd](https://github.com/linode/apl-core/commit/fef95dd9777696147aeca5dfb48abb757287e063))
* implement single prometheus for the whole platform ([#1724](https://github.com/linode/apl-core/issues/1724)) ([79d84e2](https://github.com/linode/apl-core/commit/79d84e26a948e9516c59fa6cd79ac0186f96d500))
* remove optional private grafana ([#1783](https://github.com/linode/apl-core/issues/1783)) ([9cc2b7e](https://github.com/linode/apl-core/commit/9cc2b7eea896ed329babced30f1beb0705a8ea69))
* upgrade apl-tools [TOOLS][MINOR] ([#1735](https://github.com/linode/apl-core/issues/1735)) ([dbfc089](https://github.com/linode/apl-core/commit/dbfc0895b2a0843ad012967f5360e79593b5c1b9))
* upgrade Istio Knative and Kiali ([#1736](https://github.com/linode/apl-core/issues/1736)) ([600f584](https://github.com/linode/apl-core/commit/600f584b3dfa1574829dd11da8d15e52cb3e5d36))
* upgrade kube-prometheus-stack ([#1764](https://github.com/linode/apl-core/issues/1764)) ([4ce16ea](https://github.com/linode/apl-core/commit/4ce16ea992e5d1613a1eb41aaf4e3dd165698c42))
* user management ([#1740](https://github.com/linode/apl-core/issues/1740)) ([9eedbab](https://github.com/linode/apl-core/commit/9eedbab04b724bb873ac81f49bae48f9ee2406cd))


### Bug Fixes

*  apl helm chart helpers([#1734](https://github.com/linode/apl-core/issues/1734)) ([a2460b9](https://github.com/linode/apl-core/commit/a2460b9707f5f7063486318c8b68d4f6697cc163))
* Apl 307 apl-charts repo creation  ([#1774](https://github.com/linode/apl-core/issues/1774)) ([73aac2f](https://github.com/linode/apl-core/commit/73aac2f8faba65c7b197a30d0ed1d04ae703022b))
* argocd queue processors and controller resource defaults ([#1782](https://github.com/linode/apl-core/issues/1782)) ([ca5447a](https://github.com/linode/apl-core/commit/ca5447abf24c60b053621d010d484404ac0cb770))
* byo certificate name ([#1781](https://github.com/linode/apl-core/issues/1781)) ([92cc4fc](https://github.com/linode/apl-core/commit/92cc4fcce6408d069b7d5aec30f8af43172605bd))
* default cpu requests ([#1741](https://github.com/linode/apl-core/issues/1741)) ([2cd44b4](https://github.com/linode/apl-core/commit/2cd44b4b9e102d76fc014281ade6b896b6d455bd))
* default resource config ([#1726](https://github.com/linode/apl-core/issues/1726)) ([5396b10](https://github.com/linode/apl-core/commit/5396b10ce8521934720f593473d19231fa5f8c45))
* default resource config ([#1747](https://github.com/linode/apl-core/issues/1747)) ([361e3d8](https://github.com/linode/apl-core/commit/361e3d8fde5702bc0f8d75ea456ab33dd9efcf77))
* determine exact k8s version step ([#1728](https://github.com/linode/apl-core/issues/1728)) ([f7f5271](https://github.com/linode/apl-core/commit/f7f527140c3f283f811cd5b5807a99b2809caa00))
* get kms values & age key generation order ([#1768](https://github.com/linode/apl-core/issues/1768)) ([570061d](https://github.com/linode/apl-core/commit/570061d7e5ec74dd1fc865b7992963ba4f362a35))
* helm notes ([#1731](https://github.com/linode/apl-core/issues/1731)) ([f416c63](https://github.com/linode/apl-core/commit/f416c63952d36ad5c69d0312817098ea213ac86c))
* increase trivy limits in Harbor ([#1777](https://github.com/linode/apl-core/issues/1777)) ([738a5d3](https://github.com/linode/apl-core/commit/738a5d36bd37e7d9f79315e5b47eb997bf9feb8f))
* keycloak login page tag ([#1778](https://github.com/linode/apl-core/issues/1778)) ([e85ff2c](https://github.com/linode/apl-core/commit/e85ff2c7a2c0d5368587d66dc3a10b70cc694989))
* knative domain-template ([#1738](https://github.com/linode/apl-core/issues/1738)) ([5145a05](https://github.com/linode/apl-core/commit/5145a055dcf2f81ed3ae9f4447d075a7306a453a))
* quote team password ([#1765](https://github.com/linode/apl-core/issues/1765)) ([2401eac](https://github.com/linode/apl-core/commit/2401eac62fcfc3cfcc236733253b340823ddc41c))
* remove additional cluster logic ([#1787](https://github.com/linode/apl-core/issues/1787)) ([5e133c1](https://github.com/linode/apl-core/commit/5e133c1b13d38c0fd4e8d35339a90526e638db7c))
* remove duplicate imagePullPolicy ([#1752](https://github.com/linode/apl-core/issues/1752)) ([3c393d4](https://github.com/linode/apl-core/commit/3c393d4c579cf99b7d40b2aa18280f644877641d))
* remove install instructions in README ([#1771](https://github.com/linode/apl-core/issues/1771)) ([26f2c9a](https://github.com/linode/apl-core/commit/26f2c9ab3015af39e712c3c5eed167745b093d5e))
* remove upgrade script ([#1786](https://github.com/linode/apl-core/issues/1786)) ([c50ba52](https://github.com/linode/apl-core/commit/c50ba523fae51a309a8c645b3f8c4f62157089c3))
* resource defaults ([#1732](https://github.com/linode/apl-core/issues/1732)) ([6783cbb](https://github.com/linode/apl-core/commit/6783cbb800d7ea12cd297762908f169de2803dd2))
* Revert "fix: default resource config ([#1747](https://github.com/linode/apl-core/issues/1747))" ([#1750](https://github.com/linode/apl-core/issues/1750)) ([5b1d52f](https://github.com/linode/apl-core/commit/5b1d52f91a862b1aa3382a7da9a0a7a69e9f03bb))
* set versions to main ([#1730](https://github.com/linode/apl-core/issues/1730)) ([3c89f34](https://github.com/linode/apl-core/commit/3c89f34870c01edaef71a216330b7c3b4dfd37ff))
* Trivy indent and capabilities ([#1780](https://github.com/linode/apl-core/issues/1780)) ([04a2511](https://github.com/linode/apl-core/commit/04a25111a2eb9b5d9c63b48a32d1fa92d3b64800))
* updated gh-actions, added no-apl ([#1772](https://github.com/linode/apl-core/issues/1772)) ([af37325](https://github.com/linode/apl-core/commit/af373259f2d78931dac3ea04022e25492898e107))
* upgrade Grafana stack ([#1766](https://github.com/linode/apl-core/issues/1766)) ([3a75202](https://github.com/linode/apl-core/commit/3a75202fdb2e0497d83b1670040a977d29b67d0d))
* upgrade istio to 1.22.5 ([#1769](https://github.com/linode/apl-core/issues/1769)) ([94fdabd](https://github.com/linode/apl-core/commit/94fdabd04ba5f01aed5aff6f6deaca64d12e9c6c))
* use platform-admin group instead of team-admin ([#1762](https://github.com/linode/apl-core/issues/1762)) ([fdbd80d](https://github.com/linode/apl-core/commit/fdbd80dddbe5b36be349a66659d345506526d5b0))
* values changes for istio resources ([#1745](https://github.com/linode/apl-core/issues/1745)) ([603b281](https://github.com/linode/apl-core/commit/603b28159c3a168cefbf845a05b4fd5fe2e36cec))
* versions ([#1725](https://github.com/linode/apl-core/issues/1725)) ([460276e](https://github.com/linode/apl-core/commit/460276ee85193ec8c404cb52edf4f1fac9009037))
* versions ([#1749](https://github.com/linode/apl-core/issues/1749)) ([4ad18c0](https://github.com/linode/apl-core/commit/4ad18c001ba351840c969ab61889172de82f080f))


### Others
* Integration test domains ([#1763](https://github.com/linode/apl-core/issues/1763)) ([b64c334](https://github.com/linode/apl-core/commit/b64c3349d00230da4e1d2e369b2b2b9e48525905))
* versions ([#1775](https://github.com/linode/apl-core/issues/1775)) ([0980afb](https://github.com/linode/apl-core/commit/0980afb74187eb17b4da04ea6775293cbc02606d))
* versions ([#1791](https://github.com/linode/apl-core/issues/1791)) ([cd68c48](https://github.com/linode/apl-core/commit/cd68c48a9c0dcffc6398ce2d4c74417d97ad5cf9))
* github actions update to support valid dns by default ([#1748](https://github.com/linode/apl-core/issues/1748)) ([73ed921](https://github.com/linode/apl-core/commit/73ed9219d65c79d0a6d4153ecd550421ab3ee5f7))

## [3.0.0](https://github.com/linode/apl-core/compare/v3.0.0-rc.1...v3.0.0) (2024-09-19)


### Bug Fixes

* v3 readme ([#1722](https://github.com/linode/apl-core/issues/1722)) ([086072d](https://github.com/linode/apl-core/commit/086072dae6825f796658d79f04ab875e5231b035))

## [3.0.0-rc.1](https://github.com/linode/apl-core/compare/v2.11.0...v3.0.0-rc.1) (2024-09-19)


### Features

* add endpoint with values-schema ([#1692](https://github.com/linode/apl-core/issues/1692)) ([65a00cb](https://github.com/linode/apl-core/commit/65a00cb6dabcd30322fc5bab8edc01daf6ff4d31))
* added keycloak operator ([#1625](https://github.com/linode/apl-core/issues/1625)) ([d8648fd](https://github.com/linode/apl-core/commit/d8648fdb0b0c3da829c49b8524676efbf32b1089))
* added linode as a deploy option ([#1622](https://github.com/linode/apl-core/issues/1622)) ([7993122](https://github.com/linode/apl-core/commit/79931220a465adbe6042705231265b4ee97b64d3))
* apl operators cleanup ([#1648](https://github.com/linode/apl-core/issues/1648)) ([9cd8b83](https://github.com/linode/apl-core/commit/9cd8b8361ccef70d1fcbda575374fd270d52a67b))
* apl-console linode dockerhub ([#1675](https://github.com/linode/apl-core/issues/1675)) ([1cd5dac](https://github.com/linode/apl-core/commit/1cd5dac00093af74d7bfc28a4e65beec4ce920d9))
* bootstrap default values ([#1659](https://github.com/linode/apl-core/issues/1659)) ([cf1bf3c](https://github.com/linode/apl-core/commit/cf1bf3c688585ce9d00493c548cad2d48c228909))
* console prefix ([#1634](https://github.com/linode/apl-core/issues/1634)) ([ba34f5d](https://github.com/linode/apl-core/commit/ba34f5d00e72ba589874ff9e7cc1a20f62b362bf))
* core apps that are always enabled ([#1670](https://github.com/linode/apl-core/issues/1670)) ([174bf3f](https://github.com/linode/apl-core/commit/174bf3f6a3fb757f713acc61a930a64b8be7bb58))
* decouple Gitea from community helm chart ([#1595](https://github.com/linode/apl-core/issues/1595)) ([6e3178a](https://github.com/linode/apl-core/commit/6e3178a68be43c107736ede42b0eb852654728dc))
* deploy core apps via argocd ([#1630](https://github.com/linode/apl-core/issues/1630)) ([98ee9af](https://github.com/linode/apl-core/commit/98ee9af2206b02e473c47b64cfb04a65ca1b8ad0))
* disabled release test and notification job for 3.0.0 rc ([e97af7f](https://github.com/linode/apl-core/commit/e97af7f080063313825958debe04ebaadb4a453f))
* empty rawValues in defaults  ([#1671](https://github.com/linode/apl-core/issues/1671)) ([d43ac21](https://github.com/linode/apl-core/commit/d43ac2116796bb416b57822b6f31d4a5249e0a33))
* fix argocd out of sync issues ([#1711](https://github.com/linode/apl-core/issues/1711)) ([c76c31b](https://github.com/linode/apl-core/commit/c76c31b380fd4f9d48d3c0341b10b7f8ccbbeb42))
* gitea app operator ([#1624](https://github.com/linode/apl-core/issues/1624)) ([89e03c5](https://github.com/linode/apl-core/commit/89e03c562a0e42601c9a373e4b7e717ada184a7c))
* harbor app operator ([#1628](https://github.com/linode/apl-core/issues/1628)) ([43a050e](https://github.com/linode/apl-core/commit/43a050e1b7465a2bc13f9e48bd6ba288c66f7718))
* improve query_limits configuration for loki ([#1612](https://github.com/linode/apl-core/issues/1612)) ([5e6d3db](https://github.com/linode/apl-core/commit/5e6d3dbae9b62e56076c132f31d32d6e4c1ff379))
* improve robustness of initial install ([#1623](https://github.com/linode/apl-core/issues/1623)) ([48730d9](https://github.com/linode/apl-core/commit/48730d9180a9e87cb0767da1afde9e9d28fa6345))
* increase resource limits for prometheus workloads ([#1631](https://github.com/linode/apl-core/issues/1631)) ([5b0c2a2](https://github.com/linode/apl-core/commit/5b0c2a2a734cb91580a3c6655185770464fe7366))
* kyverno policies ([#1462](https://github.com/linode/apl-core/issues/1462)) ([07636a5](https://github.com/linode/apl-core/commit/07636a5c460f74f00661a81a1bed506f7d7b7aa0))
* linode dockerhub apl-api ([#1676](https://github.com/linode/apl-core/issues/1676)) ([5560608](https://github.com/linode/apl-core/commit/5560608a1e242126a3efaab6853e4edbbc2acef9))
* linode dockerhub apl-tasks ([#1677](https://github.com/linode/apl-core/issues/1677)) ([015f8f8](https://github.com/linode/apl-core/commit/015f8f81d0d02fcb19dc80ce803b4fb21c46dd82))
* linode dockerhub apl-tty ([#1679](https://github.com/linode/apl-core/issues/1679)) ([71c5ecc](https://github.com/linode/apl-core/commit/71c5ecc19a3746d1eb20c71535aad4e1534ea40d))
* make compatible with k8s 1.29 ([#1619](https://github.com/linode/apl-core/issues/1619)) ([8f911d6](https://github.com/linode/apl-core/commit/8f911d605b3cfb72f95c68562f24fbdabdeb50df))
* make compatible with k8s 1.30 [TOOLS][MINOR] ([#1687](https://github.com/linode/apl-core/issues/1687)) ([7600d78](https://github.com/linode/apl-core/commit/7600d78c0ab7619f6204af1805f85dae4cb5bf93))
* one backend obj for all apps ([#1640](https://github.com/linode/apl-core/issues/1640)) ([b759896](https://github.com/linode/apl-core/commit/b7598962dcac58afa7ea74dc0dc92be6c2941cde))
* only deploy gitops essential apps on initial install ([#1690](https://github.com/linode/apl-core/issues/1690)) ([890b7f3](https://github.com/linode/apl-core/commit/890b7f34840c76b78ac0bac12ec21373ef36ad7d))
* remove shortcuts ([#1637](https://github.com/linode/apl-core/issues/1637)) ([096d9a1](https://github.com/linode/apl-core/commit/096d9a1d2bd8622735e172ec993eeb9e9b456ee7))
* remove team jobs ([#1665](https://github.com/linode/apl-core/issues/1665)) ([142837d](https://github.com/linode/apl-core/commit/142837d3a73f4e5b6bb4dd9e21950e5231c0e24f))
* remove wait-for job ([#1702](https://github.com/linode/apl-core/issues/1702)) ([1fc5153](https://github.com/linode/apl-core/commit/1fc5153d32f05f8589cf7a07eb90a686d5ae8921))
* removed digitalocean deploy ([#1615](https://github.com/linode/apl-core/issues/1615)) ([5776bc6](https://github.com/linode/apl-core/commit/5776bc61614a52b085406b5a0832d5019ee45268))
* removing hashicorp vault and external-secrets ([#1618](https://github.com/linode/apl-core/issues/1618)) ([dbca465](https://github.com/linode/apl-core/commit/dbca465edddc15aaf6a0523c230207529654972e))
* run test not in docker by default ([#1606](https://github.com/linode/apl-core/issues/1606)) [TOOLS][MAJOR] ([a94b854](https://github.com/linode/apl-core/commit/a94b8541efeb41e60de09d9d89c58e8c389b9733))
* serve values-schema to api endpoint ([#1678](https://github.com/linode/apl-core/issues/1678)) ([9401913](https://github.com/linode/apl-core/commit/9401913214f12ff8aa09fa9b9606a60511aa4450))
* support for Akamai EdgeDNS ([#1708](https://github.com/linode/apl-core/issues/1708)) ([12c11dd](https://github.com/linode/apl-core/commit/12c11ddeae8a8588c55bc65db2c788ef0ce62a0e))
* updating tasks version ([#1611](https://github.com/linode/apl-core/issues/1611)) ([04d5dac](https://github.com/linode/apl-core/commit/04d5dacefc8c829eeee61d1b0d3b1f405c696203))
* use linode dockerhub for apl-core and apl-tools ([#1686](https://github.com/linode/apl-core/issues/1686)) ([d979b43](https://github.com/linode/apl-core/commit/d979b43e84e3a2659c68d10366e799e4868dd25c))


### Bug Fixes

* add apl-keycloak-operator namespace ([#1645](https://github.com/linode/apl-core/issues/1645)) ([57e23fd](https://github.com/linode/apl-core/commit/57e23fdbf3939ca7c2d8614736103fc1efc184cc))
* add metricsgenerator resources to schema ([#1592](https://github.com/linode/apl-core/issues/1592)) ([2f83b72](https://github.com/linode/apl-core/commit/2f83b72af629f5a0f72d44dedc65a1312cf31ba8))
* add missing if check in otomi tools image build ([#1621](https://github.com/linode/apl-core/issues/1621)) ([7cbb16c](https://github.com/linode/apl-core/commit/7cbb16c23d40a7a80f4f5659dd6907822256a42f))
* add trusted root certificates to images ([#1620](https://github.com/linode/apl-core/issues/1620)) ([4dbb03e](https://github.com/linode/apl-core/commit/4dbb03e91ab16ac734a5182169a79ee6ad0626a1))
* added missing env variables to the chart-release job ([31a3743](https://github.com/linode/apl-core/commit/31a3743521bba6beb8ed53c2bc7bccf63267bc02))
* added the GHA workspace as a safe dir for git ([cabdd65](https://github.com/linode/apl-core/commit/cabdd65d5eb95f3f6ee71c782dc0d62d11b17fa0))
* announcement ([f1dbac1](https://github.com/linode/apl-core/commit/f1dbac1d857b9eebb2a410e71e886d47e5b0145f))
* announcement [ci skip] ([1f734ed](https://github.com/linode/apl-core/commit/1f734ed44c3b6cb82d8f199816306a9cbfd83081))
* announcement akamai [ci skip] ([29e7d51](https://github.com/linode/apl-core/commit/29e7d513cc01ae31915cfec4d9e0b5542fa64337))
* apl deployment via GH actions ([#1643](https://github.com/linode/apl-core/issues/1643)) ([aad6d71](https://github.com/linode/apl-core/commit/aad6d71a6b3930c03059c8580a7b5fecf0f2c2f6))
* apl keycloak operator tls ([#1646](https://github.com/linode/apl-core/issues/1646)) ([7ef335d](https://github.com/linode/apl-core/commit/7ef335d93ebc2ffc6cf5197e631ae2d2e6dc84a7))
* apl readme rebranding ([#1642](https://github.com/linode/apl-core/issues/1642)) ([fb16dcb](https://github.com/linode/apl-core/commit/fb16dcbfb060fefbeaf353604b33ca41571d95d6))
* **apl-146:** validate-templates ([#1672](https://github.com/linode/apl-core/issues/1672)) ([df5d907](https://github.com/linode/apl-core/commit/df5d907544732f6fc96f1f9f2d2a817104e16df5))
* argocd defaults ([#1663](https://github.com/linode/apl-core/issues/1663)) ([c96cd83](https://github.com/linode/apl-core/commit/c96cd838d7bfeacaebb0b9ad2282e90707351eca))
* argocd defaults ([#1666](https://github.com/linode/apl-core/issues/1666)) ([011653d](https://github.com/linode/apl-core/commit/011653dea4fffd7b8adc727f434090aa401c4bac))
* argocd hpa defaults ([#1681](https://github.com/linode/apl-core/issues/1681)) ([582999c](https://github.com/linode/apl-core/commit/582999ca7cea1341677ffe5b87b5c6233d8cd8f4))
* bucket only linode ([#1703](https://github.com/linode/apl-core/issues/1703)) ([6ace30c](https://github.com/linode/apl-core/commit/6ace30c188a1e142b5b3b5fd6fe526abfbb5bb86))
* change repo url for catalog charts ([#1635](https://github.com/linode/apl-core/issues/1635)) ([1a1f632](https://github.com/linode/apl-core/commit/1a1f632138d56523bca97e717771dd07af293e6f))
* clone repo in pipeline ([#1699](https://github.com/linode/apl-core/issues/1699)) ([329bace](https://github.com/linode/apl-core/commit/329bace916ff6021772790a8e62d1d0f4dd2aa18))
* cnpg linode obj location for gitea and keycloak ([#1674](https://github.com/linode/apl-core/issues/1674)) ([183a8b1](https://github.com/linode/apl-core/commit/183a8b1307af2e7639f1ad9b96e69c747e89f250))
* defaults for linode webhook and tempo app ([#1718](https://github.com/linode/apl-core/issues/1718)) ([d012094](https://github.com/linode/apl-core/commit/d012094f021448a3f0e38cbef76122091e229ef4))
* don't exclude pipelinerun in argocd ([#1656](https://github.com/linode/apl-core/issues/1656)) ([15bbc76](https://github.com/linode/apl-core/commit/15bbc764c842aaaa6a6b207c54e509a34017fe4f))
* enable argo metrics ([#1694](https://github.com/linode/apl-core/issues/1694)) ([d49c16c](https://github.com/linode/apl-core/commit/d49c16c7d896dd2050afc77b5d00216a3ee15286))
* enable workflow dispatch for otomi tools build ([#1603](https://github.com/linode/apl-core/issues/1603)) ([7856756](https://github.com/linode/apl-core/commit/78567568e48e9a86e9e6f018ab364351499511be))
* errors in otomi-db chart ([#1627](https://github.com/linode/apl-core/issues/1627)) ([8c8bbda](https://github.com/linode/apl-core/commit/8c8bbda79212c09f27979a74779ab1ba0c39187f))
* ex dns resources and dns apiToken Linode ([#1719](https://github.com/linode/apl-core/issues/1719)) ([233e73e](https://github.com/linode/apl-core/commit/233e73e08cbdb69aa8ef89a547514fff5c9a8a52))
* falco custom rules ([#1715](https://github.com/linode/apl-core/issues/1715)) ([c197173](https://github.com/linode/apl-core/commit/c19717367d434345988f0a85ac2570861aed5453))
* git protocol ([#1700](https://github.com/linode/apl-core/issues/1700)) ([632c127](https://github.com/linode/apl-core/commit/632c127a9f721b634fe040b02aa553072dfb8c20))
* gitea enabled flag ([#1657](https://github.com/linode/apl-core/issues/1657)) ([feb7c65](https://github.com/linode/apl-core/commit/feb7c65b8e509412610a3f0122215a3f07653bd7))
* gitea oauth configuration ([#1673](https://github.com/linode/apl-core/issues/1673)) ([ecfb07a](https://github.com/linode/apl-core/commit/ecfb07ae9e2b9d0cd697fa5b22affac257c1fffe))
* handle version prefix in tools version increment script [TOOLS][MAJOR] ([#1616](https://github.com/linode/apl-core/issues/1616)) ([5eda777](https://github.com/linode/apl-core/commit/5eda777c7c9100d0e7061aafe69b263a3c565a9e))
* ignores in team trivy dashboard ([#1713](https://github.com/linode/apl-core/issues/1713)) ([5b7bbc2](https://github.com/linode/apl-core/commit/5b7bbc2153c05f099d41a1a7daa870888a9781a5))
* increase mem limits of apl-gitea operator ([#1721](https://github.com/linode/apl-core/issues/1721)) ([5511bf4](https://github.com/linode/apl-core/commit/5511bf4445a0dcba3ef9557221ca72d850a541dd))
* keycloak login page and logout link ([#1644](https://github.com/linode/apl-core/issues/1644)) ([d2b9e49](https://github.com/linode/apl-core/commit/d2b9e492bd4bbef2e124a7bcbd5d5829cfc0a90e))
* keycloak tab name ([#1720](https://github.com/linode/apl-core/issues/1720)) ([776b94e](https://github.com/linode/apl-core/commit/776b94e1d763a4b4d11803e28efe631f6acd6a72))
* locations in schedule ([#1717](https://github.com/linode/apl-core/issues/1717)) ([ec0e7de](https://github.com/linode/apl-core/commit/ec0e7deb9000300d7f57e8d929a19652a43c0986))
* loki auth for multi-tenancy ([#1662](https://github.com/linode/apl-core/issues/1662)) ([abb6c81](https://github.com/linode/apl-core/commit/abb6c818f6633646992cc5579136bf1a92135803))
* loki storage config without OBJ ([#1680](https://github.com/linode/apl-core/issues/1680)) ([5c2b76d](https://github.com/linode/apl-core/commit/5c2b76db787545f0c683d5bc117b1136e0272066))
* migrate cnpg storage property ([#1688](https://github.com/linode/apl-core/issues/1688)) ([38c8cf9](https://github.com/linode/apl-core/commit/38c8cf9a9c71c69c3524b2c313c1cd7b70d1ec6f))
* missing cluster.yaml file ([#1668](https://github.com/linode/apl-core/issues/1668)) ([909ddc1](https://github.com/linode/apl-core/commit/909ddc10009ef1e97af6fbb0e7b971a151be296f))
* missing env vars in release worklfow ([8d594d4](https://github.com/linode/apl-core/commit/8d594d4d75d7911f6f7312d578e64efc865f9f33))
* move hardcoded certificates to the derived templates ([#1667](https://github.com/linode/apl-core/issues/1667)) ([e9cf4ab](https://github.com/linode/apl-core/commit/e9cf4abb1cbbe483a9cf9b8d71b4c3ea5ceae826))
* nginx defaults ([#1693](https://github.com/linode/apl-core/issues/1693)) ([5c1097d](https://github.com/linode/apl-core/commit/5c1097dfff28a30562b652247715e3c37aa03f4a))
* oauth2-proxy dns config go template  ([#1655](https://github.com/linode/apl-core/issues/1655)) ([dc07e16](https://github.com/linode/apl-core/commit/dc07e165ab36adaf9905e9ba4eb0574357c7eb7c))
* readme docs link ([#1697](https://github.com/linode/apl-core/issues/1697)) ([816c9f1](https://github.com/linode/apl-core/commit/816c9f19fb10417a2af02ab956b286b270a3e061))
* remove aws specif charts ([#1638](https://github.com/linode/apl-core/issues/1638)) ([90832ce](https://github.com/linode/apl-core/commit/90832ce83d4c624c1d7bbf32ecf9d4aabaded20e))
* remove providers ingress ([#1651](https://github.com/linode/apl-core/issues/1651)) ([b435c57](https://github.com/linode/apl-core/commit/b435c57c43dc0af1d2d593b28f4d19ed15bdaf2c))
* rename docs links to new domain ([#1698](https://github.com/linode/apl-core/issues/1698)) ([3539829](https://github.com/linode/apl-core/commit/3539829e54805aeca81c79b1d124cbbb097d7a0c))
* rm azure monitor ([#1584](https://github.com/linode/apl-core/issues/1584)) ([056a3cc](https://github.com/linode/apl-core/commit/056a3ccbab1dc060d452e6cce955f7d4d6311eb9))
* rm civo ([#1705](https://github.com/linode/apl-core/issues/1705)) ([9af2bc6](https://github.com/linode/apl-core/commit/9af2bc6f06f183f624ad9580313b78f0bb41bc92))
* rm cloud storage and configure the storage class per app ([#1636](https://github.com/linode/apl-core/issues/1636)) ([5be31fd](https://github.com/linode/apl-core/commit/5be31fd26f0d236d5e6e5359b0c020f9ad2c04cb))
* rm hasCloudLB flag ([#1591](https://github.com/linode/apl-core/issues/1591)) ([7c2a833](https://github.com/linode/apl-core/commit/7c2a83328900de9f0b41ee84616ef9510fd39d66))
* rm home alerts ([#1706](https://github.com/linode/apl-core/issues/1706)) ([318b386](https://github.com/linode/apl-core/commit/318b38647ce1da6c9f7b30260d1cb589846d3866))
* rm opencost ([#1585](https://github.com/linode/apl-core/issues/1585)) ([e9a8b4a](https://github.com/linode/apl-core/commit/e9a8b4ab94b9a6742484b15e0fb4308df51b8cde))
* rm private ingress ([#1712](https://github.com/linode/apl-core/issues/1712)) ([1d475d3](https://github.com/linode/apl-core/commit/1d475d3711bfac864ffb4f200b646e01ff41b978))
* rm thanos ([#1589](https://github.com/linode/apl-core/issues/1589)) ([6c0adc3](https://github.com/linode/apl-core/commit/6c0adc3c8b7c1ccf929e03f0ff789b82979d0f0e))
* set defaults for apps ([#1710](https://github.com/linode/apl-core/issues/1710)) ([00a9d35](https://github.com/linode/apl-core/commit/00a9d354a8c7872bea130d7f0612ff8ba555bb0e))
* set falco default driver ([#1714](https://github.com/linode/apl-core/issues/1714)) ([8c421ed](https://github.com/linode/apl-core/commit/8c421ed8cbb40bfb3cb90049c842660641778840))
* set linode as default for otomi deploy ([#1633](https://github.com/linode/apl-core/issues/1633)) ([cfaad40](https://github.com/linode/apl-core/commit/cfaad40103fd855d8d0bdf71c80d6277515b6532))
* set workflow input to 1.29 ([#1695](https://github.com/linode/apl-core/issues/1695)) ([60e429d](https://github.com/linode/apl-core/commit/60e429d71c33a81cc094acc1edee880de4eb2c4b))
* sni hosts ([#1658](https://github.com/linode/apl-core/issues/1658)) ([1642303](https://github.com/linode/apl-core/commit/1642303d15a8aa26bd32d645b446514815e0270e))
* tagline [ci skip] ([5675458](https://github.com/linode/apl-core/commit/56754588b205bc65311c04eb291c7891df87e4f2))
* tekton pipelines rerun ([#1594](https://github.com/linode/apl-core/issues/1594)) ([8847396](https://github.com/linode/apl-core/commit/8847396b3972d79a87780c75969e5d8efa83ad40))
* trivy resource defaults ([#1682](https://github.com/linode/apl-core/issues/1682)) ([c74deb3](https://github.com/linode/apl-core/commit/c74deb3a8f48c281d1a6ff5d6be074776418cd2d))
* update dns ttl for linode dns provider ([#1654](https://github.com/linode/apl-core/issues/1654)) ([73f5545](https://github.com/linode/apl-core/commit/73f554523d34541ed55f6ca7b7e3e6c206751aa6))
* values changes ([#1652](https://github.com/linode/apl-core/issues/1652)) ([6bedd2a](https://github.com/linode/apl-core/commit/6bedd2a57cc24cec7cce55086149cf3ca0cd20cd))
* velero storage backup location ([#1716](https://github.com/linode/apl-core/issues/1716)) ([643a4bd](https://github.com/linode/apl-core/commit/643a4bd0fa0127412fafcd28cbadad3b5f1efc6a))
* versions.yaml ([#1684](https://github.com/linode/apl-core/issues/1684)) ([4257b36](https://github.com/linode/apl-core/commit/4257b3686279b32dce3d4ca51a9f1d1a20819a37))
* wrong indenting in otomi-db chart ([#1626](https://github.com/linode/apl-core/issues/1626)) ([34a6608](https://github.com/linode/apl-core/commit/34a66082e003f66e86e163980942742724aa455e))


### CI

* add renovate github action ([d6954f1](https://github.com/linode/apl-core/commit/d6954f11c76c9df3a07fd64892e1c2b45f052e3d))
* change bot user ([bfe3510](https://github.com/linode/apl-core/commit/bfe3510323238578ca63ef60028ad342b9bf57ac))
* disable velero for full install profile ([#1685](https://github.com/linode/apl-core/issues/1685)) ([9bf5ed3](https://github.com/linode/apl-core/commit/9bf5ed3e6942e5b83ac404c024b71856764c748d))
* remove marketplace integrations ([#1602](https://github.com/linode/apl-core/issues/1602)) ([c82b047](https://github.com/linode/apl-core/commit/c82b0472d1b4dc2bf29bedac569ff194959ee496))
* rename chart ([#1641](https://github.com/linode/apl-core/issues/1641)) ([c1d9134](https://github.com/linode/apl-core/commit/c1d91346cdfb59df726be39aa4191277d443409e))


### Tests

* bootstrap values as part of test suite ([#1669](https://github.com/linode/apl-core/issues/1669)) ([6d5ad13](https://github.com/linode/apl-core/commit/6d5ad13fd5d85e7e87522d1c402240b26647ce54))
* improve the compare.sh script ([#1683](https://github.com/linode/apl-core/issues/1683)) ([ebf7635](https://github.com/linode/apl-core/commit/ebf7635afd9e7d9af5bfea6e71584ec4be51a1e5))
* manifest compare utilities ([#1664](https://github.com/linode/apl-core/issues/1664)) ([3fc50c5](https://github.com/linode/apl-core/commit/3fc50c50e11c7764fc9a6d313b82494acad2460e))
* semver compare for rc releases ([#1704](https://github.com/linode/apl-core/issues/1704)) ([8cdab4f](https://github.com/linode/apl-core/commit/8cdab4f6eba0a67c1d5fd57a23b2c9edc1514b17))


### Others

* apl-core transfer ([#1639](https://github.com/linode/apl-core/issues/1639)) ([22eef0f](https://github.com/linode/apl-core/commit/22eef0fab5ad650bcd250836928fc4f9b3dde89b))
* apl-task version ([#1647](https://github.com/linode/apl-core/issues/1647)) ([c317521](https://github.com/linode/apl-core/commit/c317521d3da9ec8cf41e424912f29b6daeb106ba))
* apl-tasks version ([#1707](https://github.com/linode/apl-core/issues/1707)) ([612c9e5](https://github.com/linode/apl-core/commit/612c9e5538b552e56ed0f8ab98e13d7427777bb9))
* bump tools version in otomi core image ([#1617](https://github.com/linode/apl-core/issues/1617)) ([f365a75](https://github.com/linode/apl-core/commit/f365a755396d59b65daa460f79d874178847e4cc))
* **release:** 3.0.0-rc.0 ([f5da461](https://github.com/linode/apl-core/commit/f5da46159635d2231b57742f097e4c5717c92d71))

## [3.0.0-rc.0](https://github.com/linode/apl-core/compare/v2.11.0...v3.0.0-rc.0) (2024-09-18)


### Features

* add endpoint with values-schema ([#1692](https://github.com/linode/apl-core/issues/1692)) ([65a00cb](https://github.com/linode/apl-core/commit/65a00cb6dabcd30322fc5bab8edc01daf6ff4d31))
* added keycloak operator ([#1625](https://github.com/linode/apl-core/issues/1625)) ([d8648fd](https://github.com/linode/apl-core/commit/d8648fdb0b0c3da829c49b8524676efbf32b1089))
* added linode as a deploy option ([#1622](https://github.com/linode/apl-core/issues/1622)) ([7993122](https://github.com/linode/apl-core/commit/79931220a465adbe6042705231265b4ee97b64d3))
* apl operators cleanup ([#1648](https://github.com/linode/apl-core/issues/1648)) ([9cd8b83](https://github.com/linode/apl-core/commit/9cd8b8361ccef70d1fcbda575374fd270d52a67b))
* apl-console linode dockerhub ([#1675](https://github.com/linode/apl-core/issues/1675)) ([1cd5dac](https://github.com/linode/apl-core/commit/1cd5dac00093af74d7bfc28a4e65beec4ce920d9))
* bootstrap default values ([#1659](https://github.com/linode/apl-core/issues/1659)) ([cf1bf3c](https://github.com/linode/apl-core/commit/cf1bf3c688585ce9d00493c548cad2d48c228909))
* console prefix ([#1634](https://github.com/linode/apl-core/issues/1634)) ([ba34f5d](https://github.com/linode/apl-core/commit/ba34f5d00e72ba589874ff9e7cc1a20f62b362bf))
* core apps that are always enabled ([#1670](https://github.com/linode/apl-core/issues/1670)) ([174bf3f](https://github.com/linode/apl-core/commit/174bf3f6a3fb757f713acc61a930a64b8be7bb58))
* decouple Gitea from community helm chart ([#1595](https://github.com/linode/apl-core/issues/1595)) ([6e3178a](https://github.com/linode/apl-core/commit/6e3178a68be43c107736ede42b0eb852654728dc))
* deploy core apps via argocd ([#1630](https://github.com/linode/apl-core/issues/1630)) ([98ee9af](https://github.com/linode/apl-core/commit/98ee9af2206b02e473c47b64cfb04a65ca1b8ad0))
* empty rawValues in defaults  ([#1671](https://github.com/linode/apl-core/issues/1671)) ([d43ac21](https://github.com/linode/apl-core/commit/d43ac2116796bb416b57822b6f31d4a5249e0a33))
* fix argocd out of sync issues ([#1711](https://github.com/linode/apl-core/issues/1711)) ([c76c31b](https://github.com/linode/apl-core/commit/c76c31b380fd4f9d48d3c0341b10b7f8ccbbeb42))
* gitea app operator ([#1624](https://github.com/linode/apl-core/issues/1624)) ([89e03c5](https://github.com/linode/apl-core/commit/89e03c562a0e42601c9a373e4b7e717ada184a7c))
* harbor app operator ([#1628](https://github.com/linode/apl-core/issues/1628)) ([43a050e](https://github.com/linode/apl-core/commit/43a050e1b7465a2bc13f9e48bd6ba288c66f7718))
* improve query_limits configuration for loki ([#1612](https://github.com/linode/apl-core/issues/1612)) ([5e6d3db](https://github.com/linode/apl-core/commit/5e6d3dbae9b62e56076c132f31d32d6e4c1ff379))
* improve robustness of initial install ([#1623](https://github.com/linode/apl-core/issues/1623)) ([48730d9](https://github.com/linode/apl-core/commit/48730d9180a9e87cb0767da1afde9e9d28fa6345))
* increase resource limits for prometheus workloads ([#1631](https://github.com/linode/apl-core/issues/1631)) ([5b0c2a2](https://github.com/linode/apl-core/commit/5b0c2a2a734cb91580a3c6655185770464fe7366))
* kyverno policies ([#1462](https://github.com/linode/apl-core/issues/1462)) ([07636a5](https://github.com/linode/apl-core/commit/07636a5c460f74f00661a81a1bed506f7d7b7aa0))
* linode dockerhub apl-api ([#1676](https://github.com/linode/apl-core/issues/1676)) ([5560608](https://github.com/linode/apl-core/commit/5560608a1e242126a3efaab6853e4edbbc2acef9))
* linode dockerhub apl-tasks ([#1677](https://github.com/linode/apl-core/issues/1677)) ([015f8f8](https://github.com/linode/apl-core/commit/015f8f81d0d02fcb19dc80ce803b4fb21c46dd82))
* linode dockerhub apl-tty ([#1679](https://github.com/linode/apl-core/issues/1679)) ([71c5ecc](https://github.com/linode/apl-core/commit/71c5ecc19a3746d1eb20c71535aad4e1534ea40d))
* make compatible with k8s 1.29 ([#1619](https://github.com/linode/apl-core/issues/1619)) ([8f911d6](https://github.com/linode/apl-core/commit/8f911d605b3cfb72f95c68562f24fbdabdeb50df))
* make compatible with k8s 1.30 [TOOLS][MINOR] ([#1687](https://github.com/linode/apl-core/issues/1687)) ([7600d78](https://github.com/linode/apl-core/commit/7600d78c0ab7619f6204af1805f85dae4cb5bf93))
* one backend obj for all apps ([#1640](https://github.com/linode/apl-core/issues/1640)) ([b759896](https://github.com/linode/apl-core/commit/b7598962dcac58afa7ea74dc0dc92be6c2941cde))
* only deploy gitops essential apps on initial install ([#1690](https://github.com/linode/apl-core/issues/1690)) ([890b7f3](https://github.com/linode/apl-core/commit/890b7f34840c76b78ac0bac12ec21373ef36ad7d))
* remove shortcuts ([#1637](https://github.com/linode/apl-core/issues/1637)) ([096d9a1](https://github.com/linode/apl-core/commit/096d9a1d2bd8622735e172ec993eeb9e9b456ee7))
* remove team jobs ([#1665](https://github.com/linode/apl-core/issues/1665)) ([142837d](https://github.com/linode/apl-core/commit/142837d3a73f4e5b6bb4dd9e21950e5231c0e24f))
* remove wait-for job ([#1702](https://github.com/linode/apl-core/issues/1702)) ([1fc5153](https://github.com/linode/apl-core/commit/1fc5153d32f05f8589cf7a07eb90a686d5ae8921))
* removed digitalocean deploy ([#1615](https://github.com/linode/apl-core/issues/1615)) ([5776bc6](https://github.com/linode/apl-core/commit/5776bc61614a52b085406b5a0832d5019ee45268))
* removing hashicorp vault and external-secrets ([#1618](https://github.com/linode/apl-core/issues/1618)) ([dbca465](https://github.com/linode/apl-core/commit/dbca465edddc15aaf6a0523c230207529654972e))
* run test not in docker by default ([#1606](https://github.com/linode/apl-core/issues/1606)) [TOOLS][MAJOR] ([a94b854](https://github.com/linode/apl-core/commit/a94b8541efeb41e60de09d9d89c58e8c389b9733))
* serve values-schema to api endpoint ([#1678](https://github.com/linode/apl-core/issues/1678)) ([9401913](https://github.com/linode/apl-core/commit/9401913214f12ff8aa09fa9b9606a60511aa4450))
* support for Akamai EdgeDNS ([#1708](https://github.com/linode/apl-core/issues/1708)) ([12c11dd](https://github.com/linode/apl-core/commit/12c11ddeae8a8588c55bc65db2c788ef0ce62a0e))
* updating tasks version ([#1611](https://github.com/linode/apl-core/issues/1611)) ([04d5dac](https://github.com/linode/apl-core/commit/04d5dacefc8c829eeee61d1b0d3b1f405c696203))
* use linode dockerhub for apl-core and apl-tools ([#1686](https://github.com/linode/apl-core/issues/1686)) ([d979b43](https://github.com/linode/apl-core/commit/d979b43e84e3a2659c68d10366e799e4868dd25c))


### Bug Fixes

* add apl-keycloak-operator namespace ([#1645](https://github.com/linode/apl-core/issues/1645)) ([57e23fd](https://github.com/linode/apl-core/commit/57e23fdbf3939ca7c2d8614736103fc1efc184cc))
* add metricsgenerator resources to schema ([#1592](https://github.com/linode/apl-core/issues/1592)) ([2f83b72](https://github.com/linode/apl-core/commit/2f83b72af629f5a0f72d44dedc65a1312cf31ba8))
* add missing if check in otomi tools image build ([#1621](https://github.com/linode/apl-core/issues/1621)) ([7cbb16c](https://github.com/linode/apl-core/commit/7cbb16c23d40a7a80f4f5659dd6907822256a42f))
* add trusted root certificates to images ([#1620](https://github.com/linode/apl-core/issues/1620)) ([4dbb03e](https://github.com/linode/apl-core/commit/4dbb03e91ab16ac734a5182169a79ee6ad0626a1))
* announcement ([f1dbac1](https://github.com/linode/apl-core/commit/f1dbac1d857b9eebb2a410e71e886d47e5b0145f))
* announcement [ci skip] ([1f734ed](https://github.com/linode/apl-core/commit/1f734ed44c3b6cb82d8f199816306a9cbfd83081))
* announcement akamai [ci skip] ([29e7d51](https://github.com/linode/apl-core/commit/29e7d513cc01ae31915cfec4d9e0b5542fa64337))
* apl deployment via GH actions ([#1643](https://github.com/linode/apl-core/issues/1643)) ([aad6d71](https://github.com/linode/apl-core/commit/aad6d71a6b3930c03059c8580a7b5fecf0f2c2f6))
* apl keycloak operator tls ([#1646](https://github.com/linode/apl-core/issues/1646)) ([7ef335d](https://github.com/linode/apl-core/commit/7ef335d93ebc2ffc6cf5197e631ae2d2e6dc84a7))
* apl readme rebranding ([#1642](https://github.com/linode/apl-core/issues/1642)) ([fb16dcb](https://github.com/linode/apl-core/commit/fb16dcbfb060fefbeaf353604b33ca41571d95d6))
* **apl-146:** validate-templates ([#1672](https://github.com/linode/apl-core/issues/1672)) ([df5d907](https://github.com/linode/apl-core/commit/df5d907544732f6fc96f1f9f2d2a817104e16df5))
* argocd defaults ([#1663](https://github.com/linode/apl-core/issues/1663)) ([c96cd83](https://github.com/linode/apl-core/commit/c96cd838d7bfeacaebb0b9ad2282e90707351eca))
* argocd defaults ([#1666](https://github.com/linode/apl-core/issues/1666)) ([011653d](https://github.com/linode/apl-core/commit/011653dea4fffd7b8adc727f434090aa401c4bac))
* argocd hpa defaults ([#1681](https://github.com/linode/apl-core/issues/1681)) ([582999c](https://github.com/linode/apl-core/commit/582999ca7cea1341677ffe5b87b5c6233d8cd8f4))
* bucket only linode ([#1703](https://github.com/linode/apl-core/issues/1703)) ([6ace30c](https://github.com/linode/apl-core/commit/6ace30c188a1e142b5b3b5fd6fe526abfbb5bb86))
* change repo url for catalog charts ([#1635](https://github.com/linode/apl-core/issues/1635)) ([1a1f632](https://github.com/linode/apl-core/commit/1a1f632138d56523bca97e717771dd07af293e6f))
* clone repo in pipeline ([#1699](https://github.com/linode/apl-core/issues/1699)) ([329bace](https://github.com/linode/apl-core/commit/329bace916ff6021772790a8e62d1d0f4dd2aa18))
* cnpg linode obj location for gitea and keycloak ([#1674](https://github.com/linode/apl-core/issues/1674)) ([183a8b1](https://github.com/linode/apl-core/commit/183a8b1307af2e7639f1ad9b96e69c747e89f250))
* defaults for linode webhook and tempo app ([#1718](https://github.com/linode/apl-core/issues/1718)) ([d012094](https://github.com/linode/apl-core/commit/d012094f021448a3f0e38cbef76122091e229ef4))
* don't exclude pipelinerun in argocd ([#1656](https://github.com/linode/apl-core/issues/1656)) ([15bbc76](https://github.com/linode/apl-core/commit/15bbc764c842aaaa6a6b207c54e509a34017fe4f))
* enable argo metrics ([#1694](https://github.com/linode/apl-core/issues/1694)) ([d49c16c](https://github.com/linode/apl-core/commit/d49c16c7d896dd2050afc77b5d00216a3ee15286))
* enable workflow dispatch for otomi tools build ([#1603](https://github.com/linode/apl-core/issues/1603)) ([7856756](https://github.com/linode/apl-core/commit/78567568e48e9a86e9e6f018ab364351499511be))
* errors in otomi-db chart ([#1627](https://github.com/linode/apl-core/issues/1627)) ([8c8bbda](https://github.com/linode/apl-core/commit/8c8bbda79212c09f27979a74779ab1ba0c39187f))
* ex dns resources and dns apiToken Linode ([#1719](https://github.com/linode/apl-core/issues/1719)) ([233e73e](https://github.com/linode/apl-core/commit/233e73e08cbdb69aa8ef89a547514fff5c9a8a52))
* falco custom rules ([#1715](https://github.com/linode/apl-core/issues/1715)) ([c197173](https://github.com/linode/apl-core/commit/c19717367d434345988f0a85ac2570861aed5453))
* git protocol ([#1700](https://github.com/linode/apl-core/issues/1700)) ([632c127](https://github.com/linode/apl-core/commit/632c127a9f721b634fe040b02aa553072dfb8c20))
* gitea enabled flag ([#1657](https://github.com/linode/apl-core/issues/1657)) ([feb7c65](https://github.com/linode/apl-core/commit/feb7c65b8e509412610a3f0122215a3f07653bd7))
* gitea oauth configuration ([#1673](https://github.com/linode/apl-core/issues/1673)) ([ecfb07a](https://github.com/linode/apl-core/commit/ecfb07ae9e2b9d0cd697fa5b22affac257c1fffe))
* handle version prefix in tools version increment script [TOOLS][MAJOR] ([#1616](https://github.com/linode/apl-core/issues/1616)) ([5eda777](https://github.com/linode/apl-core/commit/5eda777c7c9100d0e7061aafe69b263a3c565a9e))
* ignores in team trivy dashboard ([#1713](https://github.com/linode/apl-core/issues/1713)) ([5b7bbc2](https://github.com/linode/apl-core/commit/5b7bbc2153c05f099d41a1a7daa870888a9781a5))
* increase mem limits of apl-gitea operator ([#1721](https://github.com/linode/apl-core/issues/1721)) ([5511bf4](https://github.com/linode/apl-core/commit/5511bf4445a0dcba3ef9557221ca72d850a541dd))
* keycloak login page and logout link ([#1644](https://github.com/linode/apl-core/issues/1644)) ([d2b9e49](https://github.com/linode/apl-core/commit/d2b9e492bd4bbef2e124a7bcbd5d5829cfc0a90e))
* keycloak tab name ([#1720](https://github.com/linode/apl-core/issues/1720)) ([776b94e](https://github.com/linode/apl-core/commit/776b94e1d763a4b4d11803e28efe631f6acd6a72))
* locations in schedule ([#1717](https://github.com/linode/apl-core/issues/1717)) ([ec0e7de](https://github.com/linode/apl-core/commit/ec0e7deb9000300d7f57e8d929a19652a43c0986))
* loki auth for multi-tenancy ([#1662](https://github.com/linode/apl-core/issues/1662)) ([abb6c81](https://github.com/linode/apl-core/commit/abb6c818f6633646992cc5579136bf1a92135803))
* loki storage config without OBJ ([#1680](https://github.com/linode/apl-core/issues/1680)) ([5c2b76d](https://github.com/linode/apl-core/commit/5c2b76db787545f0c683d5bc117b1136e0272066))
* migrate cnpg storage property ([#1688](https://github.com/linode/apl-core/issues/1688)) ([38c8cf9](https://github.com/linode/apl-core/commit/38c8cf9a9c71c69c3524b2c313c1cd7b70d1ec6f))
* missing cluster.yaml file ([#1668](https://github.com/linode/apl-core/issues/1668)) ([909ddc1](https://github.com/linode/apl-core/commit/909ddc10009ef1e97af6fbb0e7b971a151be296f))
* move hardcoded certificates to the derived templates ([#1667](https://github.com/linode/apl-core/issues/1667)) ([e9cf4ab](https://github.com/linode/apl-core/commit/e9cf4abb1cbbe483a9cf9b8d71b4c3ea5ceae826))
* nginx defaults ([#1693](https://github.com/linode/apl-core/issues/1693)) ([5c1097d](https://github.com/linode/apl-core/commit/5c1097dfff28a30562b652247715e3c37aa03f4a))
* oauth2-proxy dns config go template  ([#1655](https://github.com/linode/apl-core/issues/1655)) ([dc07e16](https://github.com/linode/apl-core/commit/dc07e165ab36adaf9905e9ba4eb0574357c7eb7c))
* readme docs link ([#1697](https://github.com/linode/apl-core/issues/1697)) ([816c9f1](https://github.com/linode/apl-core/commit/816c9f19fb10417a2af02ab956b286b270a3e061))
* remove aws specif charts ([#1638](https://github.com/linode/apl-core/issues/1638)) ([90832ce](https://github.com/linode/apl-core/commit/90832ce83d4c624c1d7bbf32ecf9d4aabaded20e))
* remove providers ingress ([#1651](https://github.com/linode/apl-core/issues/1651)) ([b435c57](https://github.com/linode/apl-core/commit/b435c57c43dc0af1d2d593b28f4d19ed15bdaf2c))
* rename docs links to new domain ([#1698](https://github.com/linode/apl-core/issues/1698)) ([3539829](https://github.com/linode/apl-core/commit/3539829e54805aeca81c79b1d124cbbb097d7a0c))
* rm azure monitor ([#1584](https://github.com/linode/apl-core/issues/1584)) ([056a3cc](https://github.com/linode/apl-core/commit/056a3ccbab1dc060d452e6cce955f7d4d6311eb9))
* rm civo ([#1705](https://github.com/linode/apl-core/issues/1705)) ([9af2bc6](https://github.com/linode/apl-core/commit/9af2bc6f06f183f624ad9580313b78f0bb41bc92))
* rm cloud storage and configure the storage class per app ([#1636](https://github.com/linode/apl-core/issues/1636)) ([5be31fd](https://github.com/linode/apl-core/commit/5be31fd26f0d236d5e6e5359b0c020f9ad2c04cb))
* rm hasCloudLB flag ([#1591](https://github.com/linode/apl-core/issues/1591)) ([7c2a833](https://github.com/linode/apl-core/commit/7c2a83328900de9f0b41ee84616ef9510fd39d66))
* rm home alerts ([#1706](https://github.com/linode/apl-core/issues/1706)) ([318b386](https://github.com/linode/apl-core/commit/318b38647ce1da6c9f7b30260d1cb589846d3866))
* rm opencost ([#1585](https://github.com/linode/apl-core/issues/1585)) ([e9a8b4a](https://github.com/linode/apl-core/commit/e9a8b4ab94b9a6742484b15e0fb4308df51b8cde))
* rm private ingress ([#1712](https://github.com/linode/apl-core/issues/1712)) ([1d475d3](https://github.com/linode/apl-core/commit/1d475d3711bfac864ffb4f200b646e01ff41b978))
* rm thanos ([#1589](https://github.com/linode/apl-core/issues/1589)) ([6c0adc3](https://github.com/linode/apl-core/commit/6c0adc3c8b7c1ccf929e03f0ff789b82979d0f0e))
* set defaults for apps ([#1710](https://github.com/linode/apl-core/issues/1710)) ([00a9d35](https://github.com/linode/apl-core/commit/00a9d354a8c7872bea130d7f0612ff8ba555bb0e))
* set falco default driver ([#1714](https://github.com/linode/apl-core/issues/1714)) ([8c421ed](https://github.com/linode/apl-core/commit/8c421ed8cbb40bfb3cb90049c842660641778840))
* set linode as default for otomi deploy ([#1633](https://github.com/linode/apl-core/issues/1633)) ([cfaad40](https://github.com/linode/apl-core/commit/cfaad40103fd855d8d0bdf71c80d6277515b6532))
* set workflow input to 1.29 ([#1695](https://github.com/linode/apl-core/issues/1695)) ([60e429d](https://github.com/linode/apl-core/commit/60e429d71c33a81cc094acc1edee880de4eb2c4b))
* sni hosts ([#1658](https://github.com/linode/apl-core/issues/1658)) ([1642303](https://github.com/linode/apl-core/commit/1642303d15a8aa26bd32d645b446514815e0270e))
* tagline [ci skip] ([5675458](https://github.com/linode/apl-core/commit/56754588b205bc65311c04eb291c7891df87e4f2))
* tekton pipelines rerun ([#1594](https://github.com/linode/apl-core/issues/1594)) ([8847396](https://github.com/linode/apl-core/commit/8847396b3972d79a87780c75969e5d8efa83ad40))
* trivy resource defaults ([#1682](https://github.com/linode/apl-core/issues/1682)) ([c74deb3](https://github.com/linode/apl-core/commit/c74deb3a8f48c281d1a6ff5d6be074776418cd2d))
* update dns ttl for linode dns provider ([#1654](https://github.com/linode/apl-core/issues/1654)) ([73f5545](https://github.com/linode/apl-core/commit/73f554523d34541ed55f6ca7b7e3e6c206751aa6))
* values changes ([#1652](https://github.com/linode/apl-core/issues/1652)) ([6bedd2a](https://github.com/linode/apl-core/commit/6bedd2a57cc24cec7cce55086149cf3ca0cd20cd))
* velero storage backup location ([#1716](https://github.com/linode/apl-core/issues/1716)) ([643a4bd](https://github.com/linode/apl-core/commit/643a4bd0fa0127412fafcd28cbadad3b5f1efc6a))
* versions.yaml ([#1684](https://github.com/linode/apl-core/issues/1684)) ([4257b36](https://github.com/linode/apl-core/commit/4257b3686279b32dce3d4ca51a9f1d1a20819a37))
* wrong indenting in otomi-db chart ([#1626](https://github.com/linode/apl-core/issues/1626)) ([34a6608](https://github.com/linode/apl-core/commit/34a66082e003f66e86e163980942742724aa455e))


### CI

* add renovate github action ([d6954f1](https://github.com/linode/apl-core/commit/d6954f11c76c9df3a07fd64892e1c2b45f052e3d))
* change bot user ([bfe3510](https://github.com/linode/apl-core/commit/bfe3510323238578ca63ef60028ad342b9bf57ac))
* disable velero for full install profile ([#1685](https://github.com/linode/apl-core/issues/1685)) ([9bf5ed3](https://github.com/linode/apl-core/commit/9bf5ed3e6942e5b83ac404c024b71856764c748d))
* remove marketplace integrations ([#1602](https://github.com/linode/apl-core/issues/1602)) ([c82b047](https://github.com/linode/apl-core/commit/c82b0472d1b4dc2bf29bedac569ff194959ee496))
* rename chart ([#1641](https://github.com/linode/apl-core/issues/1641)) ([c1d9134](https://github.com/linode/apl-core/commit/c1d91346cdfb59df726be39aa4191277d443409e))


### Others

* apl-core transfer ([#1639](https://github.com/linode/apl-core/issues/1639)) ([22eef0f](https://github.com/linode/apl-core/commit/22eef0fab5ad650bcd250836928fc4f9b3dde89b))
* apl-task version ([#1647](https://github.com/linode/apl-core/issues/1647)) ([c317521](https://github.com/linode/apl-core/commit/c317521d3da9ec8cf41e424912f29b6daeb106ba))
* apl-tasks version ([#1707](https://github.com/linode/apl-core/issues/1707)) ([612c9e5](https://github.com/linode/apl-core/commit/612c9e5538b552e56ed0f8ab98e13d7427777bb9))
* bump tools version in otomi core image ([#1617](https://github.com/linode/apl-core/issues/1617)) ([f365a75](https://github.com/linode/apl-core/commit/f365a755396d59b65daa460f79d874178847e4cc))


### Tests

* bootstrap values as part of test suite ([#1669](https://github.com/linode/apl-core/issues/1669)) ([6d5ad13](https://github.com/linode/apl-core/commit/6d5ad13fd5d85e7e87522d1c402240b26647ce54))
* improve the compare.sh script ([#1683](https://github.com/linode/apl-core/issues/1683)) ([ebf7635](https://github.com/linode/apl-core/commit/ebf7635afd9e7d9af5bfea6e71584ec4be51a1e5))
* manifest compare utilities ([#1664](https://github.com/linode/apl-core/issues/1664)) ([3fc50c5](https://github.com/linode/apl-core/commit/3fc50c50e11c7764fc9a6d313b82494acad2460e))
* semver compare for rc releases ([#1704](https://github.com/linode/apl-core/issues/1704)) ([8cdab4f](https://github.com/linode/apl-core/commit/8cdab4f6eba0a67c1d5fd57a23b2c9edc1514b17))

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
