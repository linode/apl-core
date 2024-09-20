# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
