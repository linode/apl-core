# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.0.0](https://github.com/linode/apl-core/compare/v5.0.0...v4.15.3) (2026-05-01)

### Features

* use different hf arguments for initial install phase ([#3095](https://github.com/linode/apl-core/issues/3095)) ([73b67c9](https://github.com/linode/apl-core/commit/73b67c9ca30e3d1d2daf1164aa48c3a61541b5b5))
* support kubernetes gateway api ([#2965](https://github.com/linode/apl-core/issues/2965)) ([deb7620](https://github.com/linode/apl-core/commit/deb7620b0ddb126421f9601dd9ccf5d278a08b1e))
* ensure manifest folder in values repo ([#3097](https://github.com/linode/apl-core/issues/3097)) ([defdc2f](https://github.com/linode/apl-core/commit/defdc2f104b96269456453107ad1245a79586f7b))
* add tini to remove zombie git processes ([#3114](https://github.com/linode/apl-core/issues/3114)) ([58a7aa5](https://github.com/linode/apl-core/commit/58a7aa50f4ef4d5b8d2eafcf405b380f5abe1892))
* pass accept header to oauth2-proxy ([#3107](https://github.com/linode/apl-core/issues/3107)) ([3a80536](https://github.com/linode/apl-core/commit/3a80536843a0e2c6d394beeef7f83fb46fca4de5))
* making otomi.git.username optional ([#3046](https://github.com/linode/apl-core/issues/3046)) ([e75b11b](https://github.com/linode/apl-core/commit/e75b11b6e91a4d0c76cd7122a60115ea38a9436a))
* removing app files on deletion migration ([#3028](https://github.com/linode/apl-core/issues/3028)) ([4cb20b8](https://github.com/linode/apl-core/commit/4cb20b803ed4db9254930cba5fc71dc4843d5630))
* generate redis secret for ArgoCD deployment ([#3144](https://github.com/linode/apl-core/issues/3144)) ([6e6eb8f](https://github.com/linode/apl-core/commit/6e6eb8feddae19d4abd2b5fa03df9de315bafba4))
* remove tls passthrough ([#3172](https://github.com/linode/apl-core/issues/3172)) ([63f743f](https://github.com/linode/apl-core/commit/63f743fa0a3292b63be99856309115877a476749))
* make tekton optional ([#3085](https://github.com/linode/apl-core/issues/3085)) ([823e9b2](https://github.com/linode/apl-core/commit/823e9b28d60b04cce2a2f8ecb146284f67d8ff9c))
* knativeserving runtime upgrade script ([#3038](https://github.com/linode/apl-core/issues/3038)) ([b8da4c2](https://github.com/linode/apl-core/commit/b8da4c219f7bf9189ddaee747e18596c67df5668))
* add app label to http route ([#3190](https://github.com/linode/apl-core/issues/3190)) ([51a4367](https://github.com/linode/apl-core/commit/51a4367d4037c5a4628b3f2f32eb63f3c2779529))
* request more memory and cpu for harbor registry ([#3100](https://github.com/linode/apl-core/issues/3100)) ([e917e00](https://github.com/linode/apl-core/commit/e917e0059a3783df6cbd6a2633e08890a4e29757))

### Bug Fixes

* add upper bound for runtime upgrade ([#3057](https://github.com/linode/apl-core/issues/3057)) ([8abad64](https://github.com/linode/apl-core/commit/8abad64e8a149b646d0cefe982680008ca03c32e))
* apps not using desired storageclass in linode ([#3058](https://github.com/linode/apl-core/issues/3058)) ([1e0a51d](https://github.com/linode/apl-core/commit/1e0a51d23fd44bed98e7ac71b93751ab62bb87b5))
* stop enabling auto sync ([#3106](https://github.com/linode/apl-core/issues/3106)) ([66cb297](https://github.com/linode/apl-core/commit/66cb2976e714831824481d965e4161dfbaa2e99c))
* remove gitea access to api ([#3113](https://github.com/linode/apl-core/issues/3113)) ([19c075a](https://github.com/linode/apl-core/commit/19c075aacdec0ea47c20f62e93effc12dba07915))
* manifest folder after upgrade ([#3116](https://github.com/linode/apl-core/issues/3116)) ([2a59456](https://github.com/linode/apl-core/commit/2a59456c268f040562e796f9c6bbd29c647e82f7))
* retry getting installation cm ([#3101](https://github.com/linode/apl-core/issues/3101)) ([4a8d08e](https://github.com/linode/apl-core/commit/4a8d08e0f383d40164224ae124effb929b8e86c9))
* do not use helmfile --reuse-values flag ([#3067](https://github.com/linode/apl-core/issues/3067)) ([5f88ae9](https://github.com/linode/apl-core/commit/5f88ae94abc03049d77f1ba708e6b365cc4ba022))
* remove hardcoded command from apl-operator chart ([#3138](https://github.com/linode/apl-core/issues/3138)) ([8b95f47](https://github.com/linode/apl-core/commit/8b95f475b6874cdab36e3c3281f79fd0e83dece8))
* self-update operator early to ensure consistency ([#3108](https://github.com/linode/apl-core/issues/3108)) ([ad73861](https://github.com/linode/apl-core/commit/ad7386104b864a950751a3e1b4c0a04714186c3f))
* use XListenerSet for Istio compatibility ([#3164](https://github.com/linode/apl-core/issues/3164)) ([2c9a536](https://github.com/linode/apl-core/commit/2c9a53603424785546c41076df0fee787d47c70c))
* run pre- and post-upgrade consistently ([#3043](https://github.com/linode/apl-core/issues/3043)) ([ab04a6f](https://github.com/linode/apl-core/commit/ab04a6f5ba04af92b7156afebe34d4ac3b507487))
* cors filter syntax ([#3189](https://github.com/linode/apl-core/issues/3189)) ([077e237](https://github.com/linode/apl-core/commit/077e237f17bef255cfb2f76cbcb4355bbb82fa01))
* only deploy tekton tasks if tekton is enabled ([#3102](https://github.com/linode/apl-core/issues/3102)) ([21cc0f5](https://github.com/linode/apl-core/commit/21cc0f5bb0b709e5616bd7917fc479fdfef1abe7))
* validate authorization header in oauth2-proxy apps ([#3068](https://github.com/linode/apl-core/issues/3068)) ([12c296d](https://github.com/linode/apl-core/commit/12c296da193aae2e2cfd7830fe04b0e880bf64c4))
* remove auth from console endpoint ([#3150](https://github.com/linode/apl-core/issues/3150)) ([8660798](https://github.com/linode/apl-core/commit/866079889bd09f1f9aec729c2bec24492fb98b01))

### Others

* update argocd-image-updater to version 1.1.5 ([#3118](https://github.com/linode/apl-core/issues/3118)) ([67bbefe](https://github.com/linode/apl-core/commit/67bbefe5d09be6ae25f4a4946a1d5860c611bfaf))
* update argocd to version 9.4.17 ([#3086](https://github.com/linode/apl-core/issues/3086)) ([23a15c5](https://github.com/linode/apl-core/commit/23a15c5d2782d457fa1ce5aff8287bc03f030c4e))
* bump helmfile/helmfile-action from 2.4.0 to 2.4.1 in the github-actions-dependencies group ([#3094](https://github.com/linode/apl-core/issues/3094)) ([531a00d](https://github.com/linode/apl-core/commit/531a00d437799e2227ea551a168a10d37cc338c2))
* post release changelog v4.15.1 ([#3089](https://github.com/linode/apl-core/issues/3089)) ([7d38364](https://github.com/linode/apl-core/commit/7d38364cd862020560f5f45e17e6bc23ddd34f24))
* bump the npm-dependencies group with 9 updates ([#3052](https://github.com/linode/apl-core/issues/3052)) ([4fd402b](https://github.com/linode/apl-core/commit/4fd402ba094ba7c3bc0d9bf63e3574e0cc9c73d3))
* update kube-prometheus-stack to version 83.4.0 ([#3121](https://github.com/linode/apl-core/issues/3121)) ([d488b62](https://github.com/linode/apl-core/commit/d488b62dde42eaaa896aa87a89e8723e88fd34f0))
* bump the npm-dependencies group with 11 updates ([#3110](https://github.com/linode/apl-core/issues/3110)) ([f4b4041](https://github.com/linode/apl-core/commit/f4b40417e619ad6a6ee3b783bafdd2c34cfd4847))
* bump ncipollo/release-action from 1.20.0 to 1.21.0 in the github-actions-dependencies group ([#3051](https://github.com/linode/apl-core/issues/3051)) ([5eec63c](https://github.com/linode/apl-core/commit/5eec63c4c536953a68fe40b5ebf0fb479eb21bc2))
* bump rc version ([#3053](https://github.com/linode/apl-core/issues/3053)) ([8e57c32](https://github.com/linode/apl-core/commit/8e57c32c3dfbbfa23529ec8800c5aa28adc309cf))
* update argocd to version 9.4.15 ([#3062](https://github.com/linode/apl-core/issues/3062)) ([eb21c32](https://github.com/linode/apl-core/commit/eb21c32117082f0a02e844c561273abfee94abf9))
* update sealed-secrets to version 2.18.4 ([#3045](https://github.com/linode/apl-core/issues/3045)) ([dee99e3](https://github.com/linode/apl-core/commit/dee99e3ced661ac1c65379adffc45c1ce85a8bfe))
* update otel-operator to version 0.109.2 ([#3126](https://github.com/linode/apl-core/issues/3126)) ([0cf5601](https://github.com/linode/apl-core/commit/0cf56013feb55fff787db48b57172084a53b099d))
* swap order of migrations according to release ([#3182](https://github.com/linode/apl-core/issues/3182)) ([f2ba8ac](https://github.com/linode/apl-core/commit/f2ba8acb9c2dc50c1f7c2872401700d81e807e6d))
* update argocd to version 9.5.0 ([#3117](https://github.com/linode/apl-core/issues/3117)) ([b2a6004](https://github.com/linode/apl-core/commit/b2a60044e9fa39527b7b2604f040d38b978cdecc))
* update cert-manager to version v1.20.1 ([#3087](https://github.com/linode/apl-core/issues/3087)) ([37c52f4](https://github.com/linode/apl-core/commit/37c52f481a78dcc364c1c9a0562177624f79d0b9))
* update otel-operator to version 0.109.0 ([#3078](https://github.com/linode/apl-core/issues/3078)) ([b1b1461](https://github.com/linode/apl-core/commit/b1b14619c696b906c1cc27c19976a86d9159d856))
* bump the npm-dependencies group with 5 updates ([#3091](https://github.com/linode/apl-core/issues/3091)) ([45d9dd3](https://github.com/linode/apl-core/commit/45d9dd3e463539bc830bb6af1f96ca188790f56f))
* update kube-prometheus-stack to version 83.0.2 ([#3115](https://github.com/linode/apl-core/issues/3115)) ([9c3b45a](https://github.com/linode/apl-core/commit/9c3b45a2ec4b3ee82c4b18ad5a1fd3ea460a475d))
* bump cspell from 9.7.0 to 10.0.0 ([#3112](https://github.com/linode/apl-core/issues/3112)) ([d6fe266](https://github.com/linode/apl-core/commit/d6fe266e8b713a6b8fbdac93ebe089fe45606d3c))
* update prometheus-blackbox-exporter to version 11.9.1 ([#3081](https://github.com/linode/apl-core/issues/3081)) ([6877fb3](https://github.com/linode/apl-core/commit/6877fb3d7858fdb79237af9e77ad2b1843745508))
* bump the npm-dependencies group with 6 updates ([#3073](https://github.com/linode/apl-core/issues/3073)) ([6ef1032](https://github.com/linode/apl-core/commit/6ef10323f95fd478a5e10947f9946d68c91c1519))
* update oauth2-proxy to version 10.4.2 ([#3088](https://github.com/linode/apl-core/issues/3088)) ([bb8a787](https://github.com/linode/apl-core/commit/bb8a787099313b9ae7226e621cbe41e994f16e05))
* update trivy-operator to version 0.32.1 ([#3048](https://github.com/linode/apl-core/issues/3048)) ([51c0c4c](https://github.com/linode/apl-core/commit/51c0c4c434c275fea5c08d01e2bcada7b24e5166))
* update kyverno to 3.7.1 (1.17.1) ([#3010](https://github.com/linode/apl-core/issues/3010)) ([77affb1](https://github.com/linode/apl-core/commit/77affb1b02f5fc473575e3776e1c573e8370870c))
* update harbor to version 1.18.3 ([#3063](https://github.com/linode/apl-core/issues/3063)) ([e56947e](https://github.com/linode/apl-core/commit/e56947e9867e86e51a412b5428bbb5c6ca39f49a))
* update sealed-secrets to version 2.18.5 ([#3122](https://github.com/linode/apl-core/issues/3122)) ([5933d45](https://github.com/linode/apl-core/commit/5933d451d1a3b28ec391aa861909f268ef271243))
* update argocd-image-updater to version 1.1.4 ([#3080](https://github.com/linode/apl-core/issues/3080)) ([615a23c](https://github.com/linode/apl-core/commit/615a23c3bec11e02f01717de2a48444d7b113b72))
* update cloudnative-pg to version 0.28.0 ([#3104](https://github.com/linode/apl-core/issues/3104)) ([d9a48ec](https://github.com/linode/apl-core/commit/d9a48ecd58442fae7c8690021799a012c15386f0))
* bump helmfile/helmfile-action from 2.3.1 to 2.4.0 in the github-actions-dependencies group ([#3074](https://github.com/linode/apl-core/issues/3074)) ([ed513a6](https://github.com/linode/apl-core/commit/ed513a678665b452771b728781fadb9355985a0a))

