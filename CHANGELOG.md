# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.11.57](https://github.com/redkubes/otomi-core/compare/v0.11.56...v0.11.57) (2021-02-01)


### Features

* drone job ([#298](https://github.com/redkubes/otomi-core/issues/298)) ([ab7402b](https://github.com/redkubes/otomi-core/commit/ab7402baeecb1c3fd0987c4c474f3afee2ad8594))

### [0.11.56](https://github.com/redkubes/otomi-core/compare/v0.11.55...v0.11.56) (2021-02-01)


### Features

* add configurable username claim mapper ([#278](https://github.com/redkubes/otomi-core/issues/278)) ([1d1eae8](https://github.com/redkubes/otomi-core/commit/1d1eae808977b8b7c0731cacf92d5f06648f61dd))
* upgrade helmfile ([#266](https://github.com/redkubes/otomi-core/issues/266)) ([c5667b3](https://github.com/redkubes/otomi-core/commit/c5667b3579c49d291e7b28a8313401da8f799fd4))


### Bug Fixes

* allow bootstrap without target cluster to install from master [ci skip] ([788ad5f](https://github.com/redkubes/otomi-core/commit/788ad5f72f0a35719c2ace03af85d57790b38564))
* ci flag ([4d8f026](https://github.com/redkubes/otomi-core/commit/4d8f026d83c7343ba93ea17332067fc2326d3f4c))
* ci logic drone ([0d619b4](https://github.com/redkubes/otomi-core/commit/0d619b491c945c3512baefef20aa5b640e412d34))
* docker check for pipeline, job name, added google kms key to drone ([9d1976b](https://github.com/redkubes/otomi-core/commit/9d1976bf4c68df877b9bdd6b49c8e61b5868d327))
* harbor issues ([#303](https://github.com/redkubes/otomi-core/issues/303)) ([da1956b](https://github.com/redkubes/otomi-core/commit/da1956b881fea1f5440177912179d9b97352dfba))
* pdb, added destroy subcommand ([21431b5](https://github.com/redkubes/otomi-core/commit/21431b54ca78862b23d4135bd54b430a1a63a42a))
* regexp pattern error - Lone quantifier brackets ([#283](https://github.com/redkubes/otomi-core/issues/283)) ([24a12e3](https://github.com/redkubes/otomi-core/commit/24a12e3bd6be8fcd57276abc34035bb81559a57e))
* removed kubeapps ([e7f714f](https://github.com/redkubes/otomi-core/commit/e7f714fb56ed63f0e8461cdfd6db6be1e3647b3f))
* validate-templates exit code (fixes [#284](https://github.com/redkubes/otomi-core/issues/284)) ([baa4e99](https://github.com/redkubes/otomi-core/commit/baa4e99fcb5828aed65604e8e360f7b50a0bf067))


### CI

* checking without caching ([c6566e7](https://github.com/redkubes/otomi-core/commit/c6566e7789721c0071ebdd15c40645b2bba9c9b0))


### Docs

* license renamed [ci skip] ([02f6b8a](https://github.com/redkubes/otomi-core/commit/02f6b8a554f53101ecbcb1ca3c54237315ab8d8c))
* updated docs, renamed community email address [ci skip] ([d66a86d](https://github.com/redkubes/otomi-core/commit/d66a86dca9420d647dddf3b6950b4b118ba17ab5))


### Code Refactoring

* accomodating managed appgw ([9676588](https://github.com/redkubes/otomi-core/commit/96765885fd9f3c9039e36e9107682aacd80f29e7))
* don't require ppa, but get yq from developer's docker image ([#273](https://github.com/redkubes/otomi-core/issues/273)) ([b7c8026](https://github.com/redkubes/otomi-core/commit/b7c8026ed8b7fd2d5fe189f86f5b9c8148581c8b)), closes [#272](https://github.com/redkubes/otomi-core/issues/272)
* Error echo's to STDERR ([#271](https://github.com/redkubes/otomi-core/issues/271)) ([38758b5](https://github.com/redkubes/otomi-core/commit/38758b5477849066acc965d6104eb1465a72794e))

### [0.11.55](https://github.com/redkubes/otomi-core/compare/v0.11.54...v0.11.55) (2021-01-05)


### Bug Fixes

* downgrade knative-serving ([1b0c684](https://github.com/redkubes/otomi-core/commit/1b0c6848d826c09e2e9114cff7339c18dcc7859c))

### [0.11.54](https://github.com/redkubes/otomi-core/compare/v0.11.53...v0.11.54) (2020-12-19)


### Features

* add bats documentation ([#236](https://github.com/redkubes/otomi-core/issues/236)) ([a11cacf](https://github.com/redkubes/otomi-core/commit/a11cacf473d9b5e80bd3807cfda0c7b5d777cc29))
* added documentation for schema validation ([#240](https://github.com/redkubes/otomi-core/issues/240)) ([4683d58](https://github.com/redkubes/otomi-core/commit/4683d58672e72c2b94c86d1c49892edc17205678))
* downgrade knative-serving ([#257](https://github.com/redkubes/otomi-core/issues/257)) ([ae2f3e9](https://github.com/redkubes/otomi-core/commit/ae2f3e9d7598cff162d852497c3f891e7b54a359))


### CI

* renamed build job name to conform to rest of our repos [ci skip] ([8735c8d](https://github.com/redkubes/otomi-core/commit/8735c8d4a8a8c474920a16abc21b4f9d5f0ead4e))

### [0.11.53](https://github.com/redkubes/otomi-core/compare/v0.11.52...v0.11.53) (2020-12-15)


### Features

* upgrade knative-serving version ([#230](https://github.com/redkubes/otomi-core/issues/230)) ([528eb07](https://github.com/redkubes/otomi-core/commit/528eb07d73a57ee373f661e1ee13c67fa5e5c626))


### Bug Fixes

* format & sort values-schema.yaml ([#242](https://github.com/redkubes/otomi-core/issues/242)) ([bdd6188](https://github.com/redkubes/otomi-core/commit/bdd61888f6a5a837c624d9e8da4353e478b7059b))
* modify check empty parameters ([#247](https://github.com/redkubes/otomi-core/issues/247)) ([02c1687](https://github.com/redkubes/otomi-core/commit/02c1687936c0e4355778c9dc0dcbe84dace4c503))
* removed 403 redirect ([83fffcc](https://github.com/redkubes/otomi-core/commit/83fffcc2110b0db3fbae574a227611c708ddc316))
* without export not available ([#229](https://github.com/redkubes/otomi-core/issues/229)) ([c231527](https://github.com/redkubes/otomi-core/commit/c231527b4fa384529c3a65e5dedb9d3f289146df))


### Others

* **deps:** bump ini from 1.3.5 to 1.3.8 ([#245](https://github.com/redkubes/otomi-core/issues/245)) ([50a877f](https://github.com/redkubes/otomi-core/commit/50a877ff00d6572787269f6f3352df85615fcead))

### [0.11.52](https://github.com/redkubes/otomi-core/compare/v0.11.50...v0.11.52) (2020-12-07)


### Features

* bats test framework ([#216](https://github.com/redkubes/otomi-core/issues/216)) ([19952a6](https://github.com/redkubes/otomi-core/commit/19952a6308806e95200656b3e2db917f4e3ad59b))
* bumped versions, both dockerfiles ([#227](https://github.com/redkubes/otomi-core/issues/227)) ([3ecc99b](https://github.com/redkubes/otomi-core/commit/3ecc99bdb4da5c80c24e7f58df62a3754e438e69))
* support for aws mfa exec ([#225](https://github.com/redkubes/otomi-core/issues/225)) ([bc12727](https://github.com/redkubes/otomi-core/commit/bc12727b369c49f162e6d8e8d81afcf2ced33c2f))


### Bug Fixes

* cluter overprovisioner [ci skip] ([00dfcc1](https://github.com/redkubes/otomi-core/commit/00dfcc12905e4c42c210f343082f55f894e97c14))
* demo values [ci skip] ([17e92ed](https://github.com/redkubes/otomi-core/commit/17e92edc64c95c1e065f111284e10adee37e594d))
* oauth2-proxy redis connect url ([9381c62](https://github.com/redkubes/otomi-core/commit/9381c62728b5ca9d1692c28c04364250ab2d2267))
* set istio sidecar imagepullpolicy to ifnotpresent ([#223](https://github.com/redkubes/otomi-core/issues/223)) ([4372cef](https://github.com/redkubes/otomi-core/commit/4372cef97004e599fadc61e2fdf6254252c46efc))


### Code Refactoring

* resources, egress, gotmpl dry up, fix for grafana istio ([262694c](https://github.com/redkubes/otomi-core/commit/262694c2cd06c8a5de3e60ead0376b7a9e5ec74e))


### Others

* **release:** 0.11.51 ([e54434e](https://github.com/redkubes/otomi-core/commit/e54434e3a8f8df9545ea5ec4c66e95c7eabd4596))

### [0.11.51](https://github.com/redkubes/otomi-core/compare/v0.11.50...v0.11.51) (2020-12-07)


### Features

* support for aws mfa exec ([#225](https://github.com/redkubes/otomi-core/issues/225)) ([bc12727](https://github.com/redkubes/otomi-core/commit/bc12727b369c49f162e6d8e8d81afcf2ced33c2f))


### Bug Fixes

* demo values [ci skip] ([17e92ed](https://github.com/redkubes/otomi-core/commit/17e92edc64c95c1e065f111284e10adee37e594d))
* oauth2-proxy redis connect url ([9381c62](https://github.com/redkubes/otomi-core/commit/9381c62728b5ca9d1692c28c04364250ab2d2267))
* set istio sidecar imagepullpolicy to ifnotpresent ([#223](https://github.com/redkubes/otomi-core/issues/223)) ([4372cef](https://github.com/redkubes/otomi-core/commit/4372cef97004e599fadc61e2fdf6254252c46efc))


### Code Refactoring

* resources, egress, gotmpl dry up, fix for grafana istio ([262694c](https://github.com/redkubes/otomi-core/commit/262694c2cd06c8a5de3e60ead0376b7a9e5ec74e))

### [0.11.50](https://github.com/redkubes/otomi-core/compare/v0.11.48...v0.11.50) (2020-11-30)


### Bug Fixes

* demo values [ci skip] ([5af6dc7](https://github.com/redkubes/otomi-core/commit/5af6dc7c9a733445cbed43926db3f4baa739e8d4))


### Code Refactoring

* smtp on its own [ci skip] ([f1b64b7](https://github.com/redkubes/otomi-core/commit/f1b64b7263a794e23ff2fa7eb6b4bd617e6e0cd0))


### Others

* **release:** 0.11.49 ([136e4be](https://github.com/redkubes/otomi-core/commit/136e4be8ad6671623082ef73a5e956deb159fa74))

### [0.11.49](https://github.com/redkubes/otomi-core/compare/v0.11.48...v0.11.49) (2020-11-30)


### Code Refactoring

* smtp on its own [ci skip] ([f1b64b7](https://github.com/redkubes/otomi-core/commit/f1b64b7263a794e23ff2fa7eb6b4bd617e6e0cd0))

### [0.11.48](https://github.com/redkubes/otomi-core/compare/v0.11.47...v0.11.48) (2020-11-30)


### Bug Fixes

* alertmanager template [ci skip] ([48a4169](https://github.com/redkubes/otomi-core/commit/48a41698dcbee89b621840ef28d1dbd81c870f76))

### [0.11.47](https://github.com/redkubes/otomi-core/compare/v0.11.46...v0.11.47) (2020-11-30)


### Bug Fixes

* alertmanager template [ci skip] ([62683af](https://github.com/redkubes/otomi-core/commit/62683af7e94fb16f89b0dab3a5867b9d5d48e618))

### [0.11.46](https://github.com/redkubes/otomi-core/compare/v0.11.45...v0.11.46) (2020-11-30)


### Features

* added email+home receiver, moved cloud settings to own props ([8392c47](https://github.com/redkubes/otomi-core/commit/8392c4749948330341c93519450a36f11c953427))
* multiple alert endpoints ([b5aa63c](https://github.com/redkubes/otomi-core/commit/b5aa63c86f379b7eb8b4ad078af3b6b3168d3066))


### Bug Fixes

* alertmanager email conf ([36f5558](https://github.com/redkubes/otomi-core/commit/36f5558ad64c9adef5fe396dc851d38a85b760ce))
* alertmanager email conf home fallback ([adbf699](https://github.com/redkubes/otomi-core/commit/adbf69915f5405efdcaf217b5fee333e497171cf))
* dns config, cli invocation for single cluster validation ([36e2a03](https://github.com/redkubes/otomi-core/commit/36e2a0349ccecdd28dc6264fb3beb808e5678fae))
* home email alert config ([85df7ee](https://github.com/redkubes/otomi-core/commit/85df7ee58a96ac496b9900d469ad9dca3ca10a9a))
* msteams pipeline [ci skip] ([f7c2640](https://github.com/redkubes/otomi-core/commit/f7c2640630bf9e097bbad155ceac14c215d7344d))
* non required props ([b6bac19](https://github.com/redkubes/otomi-core/commit/b6bac192b3e9c889ad21c8b0c808ce7061a8c10b))

### [0.11.45](https://github.com/redkubes/otomi-core/compare/v0.11.44...v0.11.45) (2020-11-20)


### Code Refactoring

* simplified oidc, overloading with keycloak if exists [ci skip] ([4519656](https://github.com/redkubes/otomi-core/commit/4519656b490a87d4fc77ce615e37877b2ef84596))

### [0.11.44](https://github.com/redkubes/otomi-core/compare/v0.11.43...v0.11.44) (2020-11-20)


### Code Refactoring

* grafana ini oidc [ci skip] ([165dd1a](https://github.com/redkubes/otomi-core/commit/165dd1a7c2b74fb5dace4cdb5a9b1b148f900b8a))

### [0.11.43](https://github.com/redkubes/otomi-core/compare/v0.11.42...v0.11.43) (2020-11-20)


### Bug Fixes

* azure exposure was missing apps domain [ci skip] ([410ca0f](https://github.com/redkubes/otomi-core/commit/410ca0f7d28ea102e3b2deb9c068330a532b780b))

### [0.11.42](https://github.com/redkubes/otomi-core/compare/v0.11.41...v0.11.42) (2020-11-20)


### Code Refactoring

* **oidc:** moved oidc.idp props to oidc, added home [ci skip] ([e6a2c64](https://github.com/redkubes/otomi-core/commit/e6a2c646d8a35f7e65b5fb0fb2373a36a458b12a))

### [0.11.41](https://github.com/redkubes/otomi-core/compare/v0.11.40...v0.11.41) (2020-11-20)


### Features

* email receiver for alertmanager ([b8b4198](https://github.com/redkubes/otomi-core/commit/b8b41981f2f39c2d751efb46de97f9fcde1ad6e9))


### Bug Fixes

* demo clusters enabled flag [ci skip] ([9276235](https://github.com/redkubes/otomi-core/commit/92762353dd76e11a10501490cd9a9dc93cd814c8))
* docker build tests can be skipped with build arg SKIP_TESTS [ci skip] ([edb31f7](https://github.com/redkubes/otomi-core/commit/edb31f70fe9936c42caa40a9a61f3ad3ea4ca142))


### Others

* **release:** 0.11.40 ([e74b235](https://github.com/redkubes/otomi-core/commit/e74b235346b5ac9f6e9d77b6f808cb82290c3996))

### [0.11.40](https://github.com/redkubes/otomi-core/compare/v0.11.39...v0.11.40) (2020-11-18)

### Bug Fixes

- console docker compose [ci skip] ([866038c](https://github.com/redkubes/otomi-core/commit/866038c533b707e587c5a89c2ffb0a9664f805cc))
- disabling -e for retrieving customer name ([98f3048](https://github.com/redkubes/otomi-core/commit/98f3048527af338db490e1c0c7617cbd7ffc5aff))
- otomi console command ([353bbbc](https://github.com/redkubes/otomi-core/commit/353bbbc550778966e49c5852e0677acde9547aa3))
- otomi script modifies .gitconfig ([#205](https://github.com/redkubes/otomi-core/issues/205)) ([58d98e3](https://github.com/redkubes/otomi-core/commit/58d98e319f9971255ebc21e6f0c9a902936baf7a))
- the README.md refers to dead links ([#206](https://github.com/redkubes/otomi-core/issues/206)) ([ee37ca3](https://github.com/redkubes/otomi-core/commit/ee37ca3efe6148e4df72c86c9e1dd5885b0d084b))

### [0.11.39](https://github.com/redkubes/otomi-core/compare/v0.11.38...v0.11.39) (2020-11-16)

### Bug Fixes

- bootstrap detecting secrets ([7b1f498](https://github.com/redkubes/otomi-core/commit/7b1f49877f453a959e06ac29e499c7d859e0c645))

### Others

- added theme to schema, demo files, silenced output ([90827a9](https://github.com/redkubes/otomi-core/commit/90827a95ffa361e8a369a0cee60cf98f8e180b48))

### [0.11.38](https://github.com/redkubes/otomi-core/compare/v0.11.37...v0.11.38) (2020-11-13)

### Bug Fixes

- bootstrap flag for demo files ([978eb0e](https://github.com/redkubes/otomi-core/commit/978eb0e5f859d74c07f8d7b69beae31124fdf0ff))
- drone gen [ci skip] ([ba29779](https://github.com/redkubes/otomi-core/commit/ba297795212ad0b6961948017721d6807a65384c))

### [0.11.37](https://github.com/redkubes/otomi-core/compare/v0.11.36...v0.11.37) (2020-11-13)

### Features

- otomi branding for Keycloak (PoC) ([#193](https://github.com/redkubes/otomi-core/issues/193)) ([5b25cf8](https://github.com/redkubes/otomi-core/commit/5b25cf8ff48a7600f10636813ddb83d9c728046a))

### Bug Fixes

- avoid unset var triggering -e ([1752385](https://github.com/redkubes/otomi-core/commit/1752385a65870764954e1a235a16d7d2bb5aabba))
- renaming validate-all ([f891d31](https://github.com/redkubes/otomi-core/commit/f891d314c77b6ccc9a56f575900a20506cd16d13))

### Reverts

- aws authenticator needed for kubectl ([ad5ffdf](https://github.com/redkubes/otomi-core/commit/ad5ffdf1a02325714e13f8a6baa9a9a7fb5bcb83))
- skip-cleanup not working as expected, drone re-enabled ([561b235](https://github.com/redkubes/otomi-core/commit/561b23541fce97e96e167123fc7f205b296a10b4))

### Code Refactoring

- common code, validate-templates now also for target cluster ([b858c1e](https://github.com/redkubes/otomi-core/commit/b858c1e46db24cab0ae63397d0202846887b17c3))
- invalid context now asks for implicit switch ([2a9ecb4](https://github.com/redkubes/otomi-core/commit/2a9ecb487bc3c59766edbaeae6d348ba4a8b9652))
- validate script, schema improved ([24d9659](https://github.com/redkubes/otomi-core/commit/24d9659d12fde9bf190160cc18ec3d16a784c481))

### [0.11.36](https://github.com/redkubes/otomi-core/compare/v0.11.35...v0.11.36) (2020-11-10)

### Features

- make drone optional ([#199](https://github.com/redkubes/otomi-core/issues/199)) ([5756c4c](https://github.com/redkubes/otomi-core/commit/5756c4c0c1888b8639bdefe15cf7ab5d51aed86f))
- require pullSecret only for enterprise edition ([#198](https://github.com/redkubes/otomi-core/issues/198)) ([beabc4e](https://github.com/redkubes/otomi-core/commit/beabc4e2c58c2af598b6860f4f801e97adb142f6))
- validate url ([8c9ed1d](https://github.com/redkubes/otomi-core/commit/8c9ed1d7eeaf943d8cddfd68a04a632005eb8195))

### Bug Fixes

- demo gitattributes for sops ([9bf2c6f](https://github.com/redkubes/otomi-core/commit/9bf2c6f28ae0139486f76ba3ccd6ecb005c565de))
- demo sops file to match online docs ([3f005cb](https://github.com/redkubes/otomi-core/commit/3f005cb083d24b38c7dcd1a1bde8c51f54e3546d))
- edge case template validation ([#202](https://github.com/redkubes/otomi-core/issues/202)) ([b3b51db](https://github.com/redkubes/otomi-core/commit/b3b51db10a0d960ebca9b82e299ed2f58e5e6c8c))
- prettier force enabled [ci skip] ([f75a878](https://github.com/redkubes/otomi-core/commit/f75a87893950bb6793fba663ecea0845297b569d))
- remove redundant harbor logLevel ([#182](https://github.com/redkubes/otomi-core/issues/182)) ([917a37d](https://github.com/redkubes/otomi-core/commit/917a37d1d527cfb82960814be0947a053a7d4e7e))

### Docs

- pruned and updated to link to external docs [ci skip] ([2a5e1f0](https://github.com/redkubes/otomi-core/commit/2a5e1f091804a7d47723af45666045be6f9187f6))

### Code Refactoring

- bad naming [ci skip] ([c1748ba](https://github.com/redkubes/otomi-core/commit/c1748bacf8eba48e5bde4dccd3849af49dc26125))

### Others

- **docs:** pruned values readme to link to online docs ([9d22da1](https://github.com/redkubes/otomi-core/commit/9d22da12ec7274df88854302a0923547998c4436))
- **release:** 0.11.35 ([f51a9f8](https://github.com/redkubes/otomi-core/commit/f51a9f8abe322b5f2cf662b9dfc2dc2e24472a14))

### Styling

- **bash:** added decision to start using bash style guide [ci skip] ([e43b4e3](https://github.com/redkubes/otomi-core/commit/e43b4e37d7e214fe9b93fd8e833f7a044357b3d7))

### CI

- release step fix [ci skip] ([8f5eb06](https://github.com/redkubes/otomi-core/commit/8f5eb061d9a3535e315115dc45ef2e3631633c2c))

### [0.11.35](https://github.com/redkubes/otomi-core/compare/v0.11.34...v0.11.35) (2020-10-30)

### Features

- **values:** added cluster.enabled toggle ([4cc3303](https://github.com/redkubes/otomi-core/commit/4cc3303ae076679bc83f053ee4475ea97f822d08))

### Bug Fixes

- **keycloak:** theme config needed for tasks ([6658359](https://github.com/redkubes/otomi-core/commit/665835939380d5553e6f4670ff23131f516d7cb6))
- charts to use new public images ([0b9f2d6](https://github.com/redkubes/otomi-core/commit/0b9f2d6e9bc7a0335665c9bf4cd0de36b4cece65))
- dependabot issues ([9cb9022](https://github.com/redkubes/otomi-core/commit/9cb9022069129f51d96aa5f4e1411d156872102b))
- gen drone for development [ci skip] ([2990c8a](https://github.com/redkubes/otomi-core/commit/2990c8aa952bc975b4dcbd2798be395d6957762c))
- grafana istio token removed, restarting api+web on push ([ddbc003](https://github.com/redkubes/otomi-core/commit/ddbc00348d53beb58aa0d581393923e818c75728))
- removed harbor-init ([f90980c](https://github.com/redkubes/otomi-core/commit/f90980c6704547abcb30ef83f2daa2e5326e5a52))
- workflow ([13b2934](https://github.com/redkubes/otomi-core/commit/13b29349cef1826cddaa7dc4d243dec8c3bf185c))

### [0.11.34](https://github.com/redkubes/otomi-core/compare/v0.11.33...v0.11.34) (2020-10-27)

### Bug Fixes

- exporting core version for api ([21023e5](https://github.com/redkubes/otomi-core/commit/21023e55d0af5ff84ca69d9964bdd2629fdfa931))

### [0.11.33](https://github.com/redkubes/otomi-core/compare/v0.11.32...v0.11.33) (2020-10-26)

### Bug Fixes

- show all errors ([#180](https://github.com/redkubes/otomi-core/issues/180)) ([2e0565e](https://github.com/redkubes/otomi-core/commit/2e0565eaa826885ffbc5c41557edeca271048725))
- weave-scope smaller resources ([56ecceb](https://github.com/redkubes/otomi-core/commit/56ecceb62dc8d3c8fd50eb46e51205c08b3fbc2d))

### Code Refactoring

- cluster id ([501c6fe](https://github.com/redkubes/otomi-core/commit/501c6fe27cd083440587f26f762f7761b0f7ff86))

### Feature Improvements

- exporting core version for web ([3b934a7](https://github.com/redkubes/otomi-core/commit/3b934a7236bda5f5bac270804c7b894b3cf424df))
- exposing all clusters to web ([bb79aa8](https://github.com/redkubes/otomi-core/commit/bb79aa825f4f186f776ca5d05dc7ff34bcee3d18))
- task can have init, used for keycloak to detect if it's up ([ee9d081](https://github.com/redkubes/otomi-core/commit/ee9d081c5a21fe4011841aeb95916aadbe5c81d3))

### [0.11.32](https://github.com/redkubes/otomi-core/compare/v0.11.31...v0.11.32) (2020-10-26)

### Bug Fixes

- hello in team-otomi [ci skip] ([e8ec144](https://github.com/redkubes/otomi-core/commit/e8ec14451df50b92c66d2939ed0fad87e193d008))

### Feature Improvements

- upgraded ca, ingress order for keycloak ([758692c](https://github.com/redkubes/otomi-core/commit/758692c0817b10c86767942b5ce426a4d1d8bfbc))

### [0.11.31](https://github.com/redkubes/otomi-core/compare/v0.11.30...v0.11.31) (2020-10-25)

### Features

- add overprovisioning chart ([#145](https://github.com/redkubes/otomi-core/issues/145)) ([193297f](https://github.com/redkubes/otomi-core/commit/193297f4d34da9a4e8af765e6d3ed9e49f61f382))
- linting of manifests ([#124](https://github.com/redkubes/otomi-core/issues/124)) ([e0434de](https://github.com/redkubes/otomi-core/commit/e0434def4393f27c95801f3b9847110ead478813))
- make otomi-console use public image [#175](https://github.com/redkubes/otomi-core/issues/175) ([1caafd4](https://github.com/redkubes/otomi-core/commit/1caafd44b2cea564f5f09eabd21e513ca3316891))
- upgrade harbor chart ([b23e934](https://github.com/redkubes/otomi-core/commit/b23e93439bd3940e8f99ab07b03540bdffe7978b))

### Bug Fixes

- change permission form postgress filesystem ([0ef05da](https://github.com/redkubes/otomi-core/commit/0ef05da3735c43dfd92047eb914a440fcc151443))
- cluster data, otomi encrypt ([d4debe4](https://github.com/redkubes/otomi-core/commit/d4debe42a563d2dcd46877ed6768f1d12258df4b))
- do not bypass harbor core service ([bbe5a79](https://github.com/redkubes/otomi-core/commit/bbe5a797a346c3f4fd61e57b50dead46c6b2386a))
- do not set relativeUrls ([f71a425](https://github.com/redkubes/otomi-core/commit/f71a4257bfa4f7254eb07553f0ec32f660563fd8))
- enable harbor relitveUrls ([16d0d68](https://github.com/redkubes/otomi-core/commit/16d0d682d2b0d8cebd0c393a7ae7a3c1655eb2d0))
- expose only /service/token from harbor and make internal /service/\* ([194591f](https://github.com/redkubes/otomi-core/commit/194591f8db9ebc8204b2125e6cd252e1def2908c))
- harbor issues ([#170](https://github.com/redkubes/otomi-core/issues/170)) ([f0d6115](https://github.com/redkubes/otomi-core/commit/f0d6115fae3074e105e7835f1879ab92122522f8))
- harbor push [#109](https://github.com/redkubes/otomi-core/issues/109) ([00adb03](https://github.com/redkubes/otomi-core/commit/00adb034a0071d1f1bb47ea949f806e8bba74c7e))
- harbor virtualservice ([3474d56](https://github.com/redkubes/otomi-core/commit/3474d568e1759a29c202f3c89a1e426073d6eb26))
- image tag ([14a7a3c](https://github.com/redkubes/otomi-core/commit/14a7a3cc459fc3bc7824e2da888676ce7423b408))
- make paths to harbor registry public ([d4d35ae](https://github.com/redkubes/otomi-core/commit/d4d35aed5ddb6bfb0a0bacaebb39b7f5486a4850))
- missing 0.17 folder ([049451f](https://github.com/redkubes/otomi-core/commit/049451f89f63e7de8885efe1bca791163767f483))
- missing 0.17 operator knative, output silence ([60c1516](https://github.com/redkubes/otomi-core/commit/60c15163423304a0fd553932d31ce5b3b7c0be9a))
- missing file, fixes [#168](https://github.com/redkubes/otomi-core/issues/168) ([15715be](https://github.com/redkubes/otomi-core/commit/15715be7dc31063e4cfdca9e60475968e36af0c1))
- moved precommit back to own line ([93dcef4](https://github.com/redkubes/otomi-core/commit/93dcef460110d904ba5c45fd5d44e6e1ba52c00e))
- named ports ([0594416](https://github.com/redkubes/otomi-core/commit/0594416150f6b45f50e0c16146a924519126c3d7))
- otomi crypt relative path for files given for terminal completion ([21cf091](https://github.com/redkubes/otomi-core/commit/21cf091ddf14500fbd248a1d2c7c7f86169216a5))
- regression: missing rewrite section, upgraded nginx ([eb3a942](https://github.com/redkubes/otomi-core/commit/eb3a942b080762922ef1a25cedf2037a2356dccb))
- reverting named ports ([459315f](https://github.com/redkubes/otomi-core/commit/459315f2c16a6bd885051263233a3b7d8744bd62))
- spec ([a6c8fa9](https://github.com/redkubes/otomi-core/commit/a6c8fa913af727287010114393ecdbfbf254cdd0))
- template validation issues ([#168](https://github.com/redkubes/otomi-core/issues/168)), overprovisioner defaults, docs ([21fa65b](https://github.com/redkubes/otomi-core/commit/21fa65bfa99324bb5d0418cddbdfc3368afd538a))
- temporary work around for otomi-tasks ([8f37ee5](https://github.com/redkubes/otomi-core/commit/8f37ee529e630f74ebb2cb625ef1501bbe00fceb))
- tools user, resources ([95d3f1e](https://github.com/redkubes/otomi-core/commit/95d3f1e7b5890596c8b519d25501143a812cb4a2))
- update harbor artifacts ([383a5d6](https://github.com/redkubes/otomi-core/commit/383a5d6be5588c12ac23baddf1e5bc488e9f5a18))
- use otomi-tasks beta release as a workaround ([fbda907](https://github.com/redkubes/otomi-core/commit/fbda907b641febe6e54e9436b614e9710bc9209b))
- workflow patch to limit release commands to master only ([3eadc7f](https://github.com/redkubes/otomi-core/commit/3eadc7fbf1a2194fa63569d42f997d59335b1b6b))

### Build System

- update outdated and insecure npm modules ([#159](https://github.com/redkubes/otomi-core/issues/159)) ([538d3e5](https://github.com/redkubes/otomi-core/commit/538d3e54d818335655eda9f33cda83f92c70f9ae))

### Code Refactoring

- change otomi-tasks docker image for jobs charts ([#148](https://github.com/redkubes/otomi-core/issues/148)) ([25e8055](https://github.com/redkubes/otomi-core/commit/25e8055982ddf86e1aeaed0187c0256fe916db0c))

### Tests

- **spellcheck:** spellcheck scope now including docs folder ([b3f55c8](https://github.com/redkubes/otomi-core/commit/b3f55c872c7138c3e810a50525e0e58912644a46))

### Docs

- add note about working with secrets.\*.yaml files ([#163](https://github.com/redkubes/otomi-core/issues/163)) ([bb6b9a3](https://github.com/redkubes/otomi-core/commit/bb6b9a367bdad28a578540a6fd43e9bf4839309f))
- add otomi SRE script ([a04d413](https://github.com/redkubes/otomi-core/commit/a04d4137493a9c9726ce43d26f952bad4d4bd198)), closes [#11](https://github.com/redkubes/otomi-core/issues/11)
- updated with workaround for gcloud refresh error ([672f6d7](https://github.com/redkubes/otomi-core/commit/672f6d769c6f34b8554d9d968b3767b6e2bcb609))

### Feature Improvements

- do not print ajv std output ([231ee8e](https://github.com/redkubes/otomi-core/commit/231ee8ed66f228ba73dbdaa803f74d7e95a9863c))
- expose image properties for each job ([e2a13be](https://github.com/redkubes/otomi-core/commit/e2a13be78027d21c562a566a221643e3cec9c1e9))
- knative version tied to k8s version ([a3e46ab](https://github.com/redkubes/otomi-core/commit/a3e46ab11a046d547bfe80e5804eca275092ad62))
- make explicit that harbors internalTLS is disabled ([ca1e470](https://github.com/redkubes/otomi-core/commit/ca1e470cfc0d63d871c144db19c98354f24bca02))
- make trivy automountServiceAccountToken configurable ([59f048a](https://github.com/redkubes/otomi-core/commit/59f048abfd8bcc857acb589571bfc6654cbf56fe))
- read cluster config from clusters.yaml ([#165](https://github.com/redkubes/otomi-core/issues/165)) ([2787a9a](https://github.com/redkubes/otomi-core/commit/2787a9a564671a5765000c482e2cd1fa747615e7))
- remove harbor .github dir ([c3b7c2e](https://github.com/redkubes/otomi-core/commit/c3b7c2e2c98ac532b5b5698f86740f098a01d03c))
- remove harbor artifacts ([ab84d7a](https://github.com/redkubes/otomi-core/commit/ab84d7adfaf2bb9a37847042d7b038131a4d6d2c))
- remove key-rotation job ([e663914](https://github.com/redkubes/otomi-core/commit/e663914ff45c64d3998cd3d2c1dd0585ebffc46b))

### [0.11.30](https://github.com/redkubes/otomi-core/compare/v0.11.28...v0.11.30) (2020-10-06)

### Bug Fixes

- fix indentation ([0939942](https://github.com/redkubes/otomi-core/commit/0939942d4ceda1320d538d2049b1620501028717))
- otomi-core tag ([6c95240](https://github.com/redkubes/otomi-core/commit/6c95240e11d7b762fff3be18e12264e7a3a4e0f0))
- remove adding v prefix ([81dacf6](https://github.com/redkubes/otomi-core/commit/81dacf659b0293f762cb0326402a308f294ab7e9))

### Docs

- added adr for github workflow [ci skip] ([aa01076](https://github.com/redkubes/otomi-core/commit/aa010764d95d4f9a604f211890fcdd43418b1aca))
- updated with guidelines for contribution and conduct [ci skip] ([82be702](https://github.com/redkubes/otomi-core/commit/82be70227559c4a108eccb8903200066f12ed7c4))

### Feature Improvements

- pipelines now always pulling, atomic always true [ci skip] ([960faff](https://github.com/redkubes/otomi-core/commit/960faff90e250213708640de37ddfbe57849b62c))

### Others

- **release:** 0.11.29 ([79abc32](https://github.com/redkubes/otomi-core/commit/79abc32fc9cc8eb82ce2b35d7748ec84a9fb36fa))

### [0.11.29](https://github.com/redkubes/otomi-core/compare/v0.11.28...v0.11.29) (2020-10-06)

### Bug Fixes

- fix indentation ([0939942](https://github.com/redkubes/otomi-core/commit/0939942d4ceda1320d538d2049b1620501028717))
- otomi-core tag ([6c95240](https://github.com/redkubes/otomi-core/commit/6c95240e11d7b762fff3be18e12264e7a3a4e0f0))

### Docs

- added adr for github workflow [ci skip] ([aa01076](https://github.com/redkubes/otomi-core/commit/aa010764d95d4f9a604f211890fcdd43418b1aca))
- updated with guidelines for contribution and conduct [ci skip] ([82be702](https://github.com/redkubes/otomi-core/commit/82be70227559c4a108eccb8903200066f12ed7c4))

### Feature Improvements

- pipelines now always pulling, atomic always true [ci skip] ([960faff](https://github.com/redkubes/otomi-core/commit/960faff90e250213708640de37ddfbe57849b62c))

### [0.11.28](https://github.com/redkubes/otomi-core/compare/v0.11.27...v0.11.28) (2020-10-03)

### Bug Fixes

- otomi commit [ci skip] ([3a8c0b9](https://github.com/redkubes/otomi-core/commit/3a8c0b9b26d3b6bf9705bbbe3327f2599194f544))

### [0.11.27](https://github.com/redkubes/otomi-core/compare/v0.11.26...v0.11.27) (2020-10-03)

### Bug Fixes

- crypt key for tools server [ci skip] ([fcc0712](https://github.com/redkubes/otomi-core/commit/fcc0712673b12b6c9dbaf40437020a950e29e45c))

### Others

- **release:** 0.11.26 ([655a919](https://github.com/redkubes/otomi-core/commit/655a919fd7714508fb587b227d2b87d40b5d7ab9))
- **release:** 0.11.26 ([1c71ae9](https://github.com/redkubes/otomi-core/commit/1c71ae9da968d044a04b6709f6744ddb83b0052e))
- **release:** 0.11.26 ([6b7ac6e](https://github.com/redkubes/otomi-core/commit/6b7ac6e6d6d6eeb44e84a62126f4816b09e1f5dd))
- **release:** 0.11.26 ([575d67a](https://github.com/redkubes/otomi-core/commit/575d67afa52e6b41c3ff5f6deebed71df6366d57))
- **release:** 0.11.26 ([993b05c](https://github.com/redkubes/otomi-core/commit/993b05c44a04e3e3a2bfd7be8f45ddf4d5558a77))
- **release:** 0.11.26 ([a69da7f](https://github.com/redkubes/otomi-core/commit/a69da7ff19e45f389b939cab056743f957470288))
- **release:** 0.11.26 ([6acc717](https://github.com/redkubes/otomi-core/commit/6acc71715841d5322cd7706b993a5f0ffe35e7fd))
- **release:** 0.11.26 ([47d3a64](https://github.com/redkubes/otomi-core/commit/47d3a64b07587361af3f528901ca1e4ddafeb31a))
- **release:** 0.11.26 ([98668a0](https://github.com/redkubes/otomi-core/commit/98668a035c0be81d3a70d18fe9d6a29dcf58247b))
- **release:** 0.11.26 ([fba9b20](https://github.com/redkubes/otomi-core/commit/fba9b202068b843867dff72d3d3f4c8c577a0167))

### [0.11.26](https://github.com/redkubes/otomi-core/compare/v0.11.25...v0.11.26) (2020-10-02)

### Bug Fixes

- crypt key [ci skip] ([edfd5e0](https://github.com/redkubes/otomi-core/commit/edfd5e074a173a424767f5f89108150b15ccd3b2))
- crypt mechanism [ci skip] ([2177615](https://github.com/redkubes/otomi-core/commit/2177615a31caa3c393e40982fccb3fc7f8a68e34))
- enhanced otomi en-/decrypt [ci skip] ([f8234dc](https://github.com/redkubes/otomi-core/commit/f8234dc0b1fa444b97f0fff4ed93f7fea33a88aa))
- forgot hooks, enhanced otomi en-/decrypt [ci skip] ([ac49c97](https://github.com/redkubes/otomi-core/commit/ac49c97e0ac7876274a85f44f97884bb151190a5))

### Others

- **release:** 0.11.25 ([abded08](https://github.com/redkubes/otomi-core/commit/abded085e8da4aaf1ecaf2e6485850465e07621d))
- **release:** 0.11.25 ([06ed385](https://github.com/redkubes/otomi-core/commit/06ed385d90903dc60bf555d5a503a09f15da716b))
- **release:** 0.11.25 ([a22b4b5](https://github.com/redkubes/otomi-core/commit/a22b4b51e4483812d816dbe629ee306d419434f9))
- **release:** 0.11.25 ([de31ad3](https://github.com/redkubes/otomi-core/commit/de31ad3494fcc12c79c7ed221c32be1cdde1f7f9))

### [0.11.25](https://github.com/redkubes/otomi-core/compare/v0.11.24...v0.11.25) (2020-10-02)

### Others

- **release:** 0.11.24 ([6eabd2b](https://github.com/redkubes/otomi-core/commit/6eabd2bbb4f96c487aac35547127dba458221f58))
- **release:** 0.11.24 ([825f7c7](https://github.com/redkubes/otomi-core/commit/825f7c79fb0e271fe777d4f215418e36c1b48c40))
- **release:** 0.11.24 ([1054c97](https://github.com/redkubes/otomi-core/commit/1054c9785b4169f3831382a34c67eff9fc7c4245))
- **release:** 0.11.24 ([f022e06](https://github.com/redkubes/otomi-core/commit/f022e067ddae973504de2c6960bc23e643981276))

### [0.11.24](https://github.com/redkubes/otomi-core/compare/v0.11.23...v0.11.24) (2020-10-02)

### Features

- docker lint stage, docker-compose for console ([#154](https://github.com/redkubes/otomi-core/issues/154)) ([bd3cbe8](https://github.com/redkubes/otomi-core/commit/bd3cbe8c9f0c15fffd597d4a195df4521162369e))

### Bug Fixes

- cspell.json missing [ci skip] ([c2ef684](https://github.com/redkubes/otomi-core/commit/c2ef6845f6f993e4fb4cdd1fe4f05bdecd8db05d))

### Docs

- added npm install section [ci skip] ([646ef96](https://github.com/redkubes/otomi-core/commit/646ef9669dd225d49307058843b0a443725cbc89))

### [0.11.23](https://github.com/redkubes/otomi-core/compare/v0.11.22...v0.11.23) (2020-09-30)

### Features

- spellcheck enabled, updated schema ([de9cb0d](https://github.com/redkubes/otomi-core/commit/de9cb0d57fd582ea1649f30c761b7406193e2a50))

### Bug Fixes

- ci image ([21ea4a4](https://github.com/redkubes/otomi-core/commit/21ea4a4ec943254cf3dfbf93f724114dc286f2ab))
- ci image ([4857bb6](https://github.com/redkubes/otomi-core/commit/4857bb6bda7822af8d7efade24d8a913f2dff134))
- lint:all ([d882880](https://github.com/redkubes/otomi-core/commit/d882880408fccfb5751ecad9cf58ce938abf8e7e))
- multistage dockerfile needed for tests ([e977bd8](https://github.com/redkubes/otomi-core/commit/e977bd86fb3374febacbabfe6443d51564ff1569))
- spellcheck disabled for now ([500d7f9](https://github.com/redkubes/otomi-core/commit/500d7f96bf79e5e7d17e45840de15b84f0c3cc3e))
- spellcheck disabled for now ([3af4a0f](https://github.com/redkubes/otomi-core/commit/3af4a0f2e23d878633d8e25c54ef3c0966c2d04c))

### Feature Improvements

- spellcheck added to pre-commit ([d7ad1e5](https://github.com/redkubes/otomi-core/commit/d7ad1e59e978360b920e0c5ddc0d968d89151a5a))

### [0.11.22](https://github.com/redkubes/otomi-core/compare/v0.11.21...v0.11.22) (2020-09-30)

### Bug Fixes

- downgrade keycloak replicas to one ([a7999fe](https://github.com/redkubes/otomi-core/commit/a7999fe2ebbf33e88d8f96eeb6b8d359cdba6984))
- remove unexisting command ([298b75f](https://github.com/redkubes/otomi-core/commit/298b75f9607703add4d156aec493bf0e0aecfff5))
- removed env output from drun [ci skip] ([5dd6151](https://github.com/redkubes/otomi-core/commit/5dd6151c0b02a08fe46a207335f74bc6fd57147e))
- vscode sops setting for decryption ([d0adf0b](https://github.com/redkubes/otomi-core/commit/d0adf0bcf4795f9c792ed6860d9900eb5e572a3f))

### [0.11.21](https://github.com/redkubes/otomi-core/compare/v0.11.20...v0.11.21) (2020-09-29)

### Bug Fixes

- incoming webhook to auth ingress [ci skip] ([3e252dc](https://github.com/redkubes/otomi-core/commit/3e252dc05a7eb180356d96010a33b81220f86ffd))

### [0.11.20](https://github.com/redkubes/otomi-core/compare/v0.11.19...v0.11.20) (2020-09-29)

### Features

- jsonschema for values ([#150](https://github.com/redkubes/otomi-core/issues/150)) ([1ea90b7](https://github.com/redkubes/otomi-core/commit/1ea90b72951c12bfc4b471486a484e70cb4bf22e)), closes [#137](https://github.com/redkubes/otomi-core/issues/137)

### Bug Fixes

- missing route ([#147](https://github.com/redkubes/otomi-core/issues/147)) ([df54c60](https://github.com/redkubes/otomi-core/commit/df54c6058d6f1968d3014a5343192dc55a7c8fce))
- sops settings for vscode [ci skip] ([2a76f75](https://github.com/redkubes/otomi-core/commit/2a76f759d87d13b22ed753c0ded1b761ef037a3e))

### [0.11.19](https://github.com/redkubes/otomi-core/compare/v0.11.18...v0.11.19) (2020-09-29)

### Features

- added drone-admit-members [ci skip] ([3131556](https://github.com/redkubes/otomi-core/commit/3131556b731790b0c9bb1806cb43da2b946c1cbc))

### Bug Fixes

- adding owners file [ci skip] ([f5d37d6](https://github.com/redkubes/otomi-core/commit/f5d37d65809ed62dc601464aadf3aceadca19d57))
- cleaned up old charts, fixes version flipping [ci skip] ([52a6680](https://github.com/redkubes/otomi-core/commit/52a6680f846ea6d1d21ec3a3dd3b2535abc76945))
- default to empty dict even if value is null ([ae4c742](https://github.com/redkubes/otomi-core/commit/ae4c7425992563c6a37b710f1baedf607ccc735f))
- deploy an existing k8s service to team-demo ([#136](https://github.com/redkubes/otomi-core/issues/136)) ([9e11c93](https://github.com/redkubes/otomi-core/commit/9e11c938a1ffb25ce7e8059849259344212afe67))
- limit drone concurency to one ([#149](https://github.com/redkubes/otomi-core/issues/149)) ([c6df454](https://github.com/redkubes/otomi-core/commit/c6df454526485d673b5c103db6d1664b74bea2e5))
- missing file coming from bootstrap [ci skip] ([3ff1711](https://github.com/redkubes/otomi-core/commit/3ff1711f6f495b3d7651c6e579a71daa13752d37))
- test output was too sensitive [ci skip] ([94b02ea](https://github.com/redkubes/otomi-core/commit/94b02ea49f4523d946f6022b40ae9e651bc5fc50))

### Reverts

- Revert "Fix to server (#139)" ([fa193fd](https://github.com/redkubes/otomi-core/commit/fa193fd5480673353d088215816e3c7674f05fcd)), closes [#139](https://github.com/redkubes/otomi-core/issues/139)

### Others

- **release:** 0.11.18 ([c1cac4d](https://github.com/redkubes/otomi-core/commit/c1cac4de1cb09ead0a7e36e4a3fb15680ee65069))
- **release:** 0.11.18 ([9e0ae1f](https://github.com/redkubes/otomi-core/commit/9e0ae1fa74ea88bc603319296184aae4323ef95d))

### Feature Improvements

- helmfile output filter [ci skip] ([9ea4dff](https://github.com/redkubes/otomi-core/commit/9ea4dff43b1a015384917a2d5c6af759b1dee5d9))

### Docs

- architecture - ingress overview added [ci skip] ([103b4f0](https://github.com/redkubes/otomi-core/commit/103b4f09734c1ff991ee0b80d1201f87c9a90db3))

### [0.11.18](https://github.com/redkubes/otomi-core/compare/v0.11.17...v0.11.18) (2020-09-22)

### Bug Fixes

- env [ci skip] ([f1e1aba](https://github.com/redkubes/otomi-core/commit/f1e1abaeeba1141519510b4cf5d2cfb44e63b0f5))

### [0.11.17](https://github.com/redkubes/otomi-core/compare/v0.11.16...v0.11.17) (2020-09-22)

### [0.11.16](https://github.com/redkubes/otomi-core/compare/v0.11.15...v0.11.16) (2020-09-22)

### Bug Fixes

- team secrets [ci skip] ([c670d0a](https://github.com/redkubes/otomi-core/commit/c670d0a0512e89b9a3d4750843aabd299f08c5f1))

### Others

- **release:** 0.11.15 ([b097c6d](https://github.com/redkubes/otomi-core/commit/b097c6dd038d152524acc15f2b1c54fc893f0642))
- **release:** 0.11.15 ([132b222](https://github.com/redkubes/otomi-core/commit/132b222a98c92862c8cc59ca281180e8328bbdf8))
- **release:** 0.11.15 ([4cc48f3](https://github.com/redkubes/otomi-core/commit/4cc48f3b1ab5d8ba2e2a70338c9ca023a8fcb9c6))
- **release:** 0.11.15 ([bb6d7bc](https://github.com/redkubes/otomi-core/commit/bb6d7bc53e3e5822fa7a3bbbbf5702cd9acc2514))
- **release:** 0.11.15 ([e015f55](https://github.com/redkubes/otomi-core/commit/e015f550d3d3e09c94272286a4b4f3f040c92390))

### [0.11.15](https://github.com/redkubes/otomi-core/compare/v0.11.14...v0.11.15) (2020-09-22)

### Bug Fixes

- pipeline ([7e73c94](https://github.com/redkubes/otomi-core/commit/7e73c94306605bef1f3119436eaa01634d0aecd7))

### [0.11.14](https://github.com/redkubes/otomi-core/compare/v0.11.13...v0.11.14) (2020-09-22)

### Others

- **release:** 0.11.12 ([4048224](https://github.com/redkubes/otomi-core/commit/404822467c0b76c736844c4f0a345abe166c86a6))
- **release:** 0.11.13 ([4c9fb25](https://github.com/redkubes/otomi-core/commit/4c9fb25ace340fc86cc12cc74ea2185f7d01b279))
- **release:** 0.11.13 ([d84418e](https://github.com/redkubes/otomi-core/commit/d84418e0086eb71ef65973aec192f4de48fcead1))
- **release:** 0.11.13 ([9393bbe](https://github.com/redkubes/otomi-core/commit/9393bbe80984b9334843ae521aa974cbf3c0e81d))
- **release:** 0.11.13 ([69c18a1](https://github.com/redkubes/otomi-core/commit/69c18a130e04fab8571d57b96b11c1372b79937a))
- **release:** 0.11.13 ([7431171](https://github.com/redkubes/otomi-core/commit/74311719b433fea8a8be61e297a07b4cbdeee915))

### [0.11.13](https://github.com/redkubes/otomi-core/compare/v0.11.12...v0.11.13) (2020-09-22)

### Others

- **release:** 0.11.12 ([de1078d](https://github.com/redkubes/otomi-core/commit/de1078d7e99d724bbf2feecfedc8f04ec116f2e4))

### [0.11.12](https://github.com/redkubes/otomi-core/compare/v0.11.11...v0.11.12) (2020-09-22)

### [0.11.11](https://github.com/redkubes/otomi-core/compare/v0.11.10...v0.11.11) (2020-09-22)

### Bug Fixes

- version [ci skip](<[02fe709](https://github.com/redkubes/otomi-core/commit/02fe70931c991493271fff163c639279e8426e16)>)

### [0.11.10](https://github.com/redkubes/otomi-core/compare/v0.11.9...v0.11.10) (2020-09-22)

### Features

- add redirect uri used for user logout ([be2fadd](https://github.com/redkubes/otomi-core/commit/be2fadd3021a18f2871694cfdc63c4022c1ed4f5))

### Bug Fixes

- crypt routine now using helm secrets ([2535a77](https://github.com/redkubes/otomi-core/commit/2535a77a64dd4faf060f06b16907cfef81f34d20))
- docs [ci skip](<[555cc6d](https://github.com/redkubes/otomi-core/commit/555cc6dbe14045cb032546631ee321fb7361cf0a)>)
- docs [ci skip](<[c6680a8](https://github.com/redkubes/otomi-core/commit/c6680a8cd8cc153d160bb1d2a0d3f3962d8bd77e)>)
- gcp key [ci skip](<[d2cfa9b](https://github.com/redkubes/otomi-core/commit/d2cfa9be926b4e41cb5d285bf5b4c53b2733e677)>)

### [0.11.9](https://github.com/redkubes/otomi-core/compare/v0.11.8...v0.11.9) (2020-09-17)

### Features

- enrich drone slack notification ([f8758fc](https://github.com/redkubes/otomi-core/commit/f8758fc87120095712aeb0345db07ca7673eb863))

### Bug Fixes

- drone pipeline ([a7e07d7](https://github.com/redkubes/otomi-core/commit/a7e07d70e01e288f11ddcaf893aca527e0ec5bf6))
- exist if any command in pipe fails ([5c5aeef](https://github.com/redkubes/otomi-core/commit/5c5aeef87bc2174fb0199a43df11bea422e71f38))
- exit with non-zero on test.sh failure ([d99e37b](https://github.com/redkubes/otomi-core/commit/d99e37b1c4e7aeac144f13b744fffb51ac975613))
- image tag for drone pipeline ([c9c71ec](https://github.com/redkubes/otomi-core/commit/c9c71eccd3a02fa8de3e5898b4b50918f6c393c7))
- pipeline regression [ci skip](<[a3713da](https://github.com/redkubes/otomi-core/commit/a3713dae41264b5aaf6442f2b97021af6b24d1c9)>)
- pipeline regression [ci skip](<[90a9ab4](https://github.com/redkubes/otomi-core/commit/90a9ab4519ab0ee3aaf2781c7479b63f9496304a)>)
- pullSecret and team secrets ([173d7eb](https://github.com/redkubes/otomi-core/commit/173d7eb9fb74abfccea3e5221f7f475640a21598))
- read otomi version from clusters.yaml ([bd1724f](https://github.com/redkubes/otomi-core/commit/bd1724f1c5e63c2e1d39c53647541cc90b274e11))
- regression deploy [ci skip](<[ccdc0f7](https://github.com/redkubes/otomi-core/commit/ccdc0f7ffc6224384434a8b5a4d03bb3be1005d4)>)
- regression deploy [ci skip](<[c7a6e62](https://github.com/redkubes/otomi-core/commit/c7a6e62085b6387bc5d1717a6b62758dff382e82)>)
- regression, sorry ([208027c](https://github.com/redkubes/otomi-core/commit/208027cb2f750e306e26d4bff9c18c9f721cccdc))
- remove unnecessary ownership change ([bd5b8e9](https://github.com/redkubes/otomi-core/commit/bd5b8e9708148065e5b0104f44de887e5c3e3924))
- removed refs to otomi in bin scripts [ci skip](<[49e51e5](https://github.com/redkubes/otomi-core/commit/49e51e53b1f1354927760d8e1ea38ee1a0fdf9a0)>)

### [0.11.8](https://github.com/redkubes/otomi-core/compare/v0.11.7...v0.11.8) (2020-09-16)

### Features

- test if helmfile can template provided values ([2ce8b9b](https://github.com/redkubes/otomi-core/commit/2ce8b9b8f668117fae34c4345bb41f5dc3b05996))

### Bug Fixes

- add team values to environments ([8568204](https://github.com/redkubes/otomi-core/commit/8568204231009b5ddf3914bd9ac825c1d6340882))

### [0.11.7](https://github.com/redkubes/otomi-core/compare/v0.11.5...v0.11.7) (2020-09-15)

### Bug Fixes

- failing otomi version check for new users [ci skip](<[8db5dc4](https://github.com/redkubes/otomi-core/commit/8db5dc433f37c44c8711d8c9136ef73588f750b7)>)
- image tag ([c505526](https://github.com/redkubes/otomi-core/commit/c505526b3a7ed9c061ab37ef19164d2911c602b6))
- no more need for docker check in bootstrap [ci skip](<[d2cb322](https://github.com/redkubes/otomi-core/commit/d2cb3224d8b782a1380c00b70e8cd72e2dd8c1e4)>)
- put back functions in aliases [ci skip](<[054ebf8](https://github.com/redkubes/otomi-core/commit/054ebf86dd51146d5c7e143bef0ca02a7aa7abc2)>)
- put back stack_volume to otomi drun [ci skip](<[e271ce8](https://github.com/redkubes/otomi-core/commit/e271ce8a5cde7716d5da6eeb70a547f83c61ce55)>)

### Others

- **release:** 0.11.6 ([92c9130](https://github.com/redkubes/otomi-core/commit/92c9130620664a174c585e0e6d804aeec96e9033))

### [0.11.6](https://github.com/redkubes/otomi-core/compare/v0.11.5...v0.11.6) (2020-09-15)

### Bug Fixes

- failing otomi version check for new users [ci skip](<[8db5dc4](https://github.com/redkubes/otomi-core/commit/8db5dc433f37c44c8711d8c9136ef73588f750b7)>)
- no more need for docker check in bootstrap [ci skip](<[d2cb322](https://github.com/redkubes/otomi-core/commit/d2cb3224d8b782a1380c00b70e8cd72e2dd8c1e4)>)
- put back functions in aliases [ci skip](<[054ebf8](https://github.com/redkubes/otomi-core/commit/054ebf86dd51146d5c7e143bef0ca02a7aa7abc2)>)
- put back stack_volume to otomi drun [ci skip](<[e271ce8](https://github.com/redkubes/otomi-core/commit/e271ce8a5cde7716d5da6eeb70a547f83c61ce55)>)

### [0.11.5](https://github.com/redkubes/otomi-core/compare/v0.11.4...v0.11.5) (2020-09-15)

### Bug Fixes

- working code, some env missing [ci skip](<[cfc64fa](https://github.com/redkubes/otomi-core/commit/cfc64fab328b1c1b522ca76e82e43ab24b732064)>)

### [0.11.4](https://github.com/redkubes/otomi-core/compare/v0.11.3...v0.11.4) (2020-09-15)

### Bug Fixes

- back to env [ci skip](<[940c5a9](https://github.com/redkubes/otomi-core/commit/940c5a98ba0fde67846ac45ec8c1f473cb26bd65)>)

### [0.11.3](https://github.com/redkubes/otomi-core/compare/v0.11.2...v0.11.3) (2020-09-15)

### Bug Fixes

- pipeline [ci skip](<[f4f5e5b](https://github.com/redkubes/otomi-core/commit/f4f5e5b17884a05654137220d16da17a9a5de36e)>)

### [0.11.2](https://github.com/redkubes/otomi-core/compare/v0.11.1...v0.11.2) (2020-09-15)

### [0.11.1](https://github.com/redkubes/otomi-core/compare/v0.11.0...v0.11.1) (2020-09-15)

### Features

- use otomi CLI in docker ([e2aa085](https://github.com/redkubes/otomi-core/commit/e2aa085d35a0d46d0b0100a1d8893b830ec9eea4))

### Bug Fixes

- adjust path to values env dir ([79b4b9d](https://github.com/redkubes/otomi-core/commit/79b4b9d1a4b3cd45e672a6132ce7a7a3a3168899))
- bugs [ci skip](<[3008576](https://github.com/redkubes/otomi-core/commit/3008576eb5aa5153322bc8823f1c14673210630c)>)
- bugs [ci skip](<[f98311f](https://github.com/redkubes/otomi-core/commit/f98311f4618ba874d3aa43196f95eeebf941e353)>)
- docker without -r option ([f0f1b55](https://github.com/redkubes/otomi-core/commit/f0f1b559413787857b9028e2d0257fd75cc6e031))
- gitignore for values [ci skip](<[d0dad19](https://github.com/redkubes/otomi-core/commit/d0dad19527bf76cb26ce1952942745b0e4611cea)>)
- obtain cloudDnsKey value ([c62c1af](https://github.com/redkubes/otomi-core/commit/c62c1af68dfed1487a0b58f9e0258c74c52035ed))
- otomi cli exists with error code on failure ([f979d0c](https://github.com/redkubes/otomi-core/commit/f979d0c7fdd9f21019cf1cb291512e1f76729552))
- otomi template command ([62ea049](https://github.com/redkubes/otomi-core/commit/62ea0496e91b0e5abf90b81188a57ce655cae9e5))
- remove container ([1660c12](https://github.com/redkubes/otomi-core/commit/1660c12b4066f935c49b7d870a9b0adfbca4f97d))
- rework [ci skip](<[2722be7](https://github.com/redkubes/otomi-core/commit/2722be76c46c59c938a30b3e76873e0cf791051c)>)

## [0.11.0](https://github.com/redkubes/otomi-core/compare/v0.10.110...v0.11.0) (2020-09-10)

### Bug Fixes

- evaluate .secrets file ([ede3b1b](https://github.com/redkubes/otomi-core/commit/ede3b1bd06b8208b033306591b96889c16daf040))
- git commit now outside of container [ci skip](<[7bbf067](https://github.com/redkubes/otomi-core/commit/7bbf0672a70450b56915f5b716730e220941f156)>)
- missing demo file [ci skip](<[3272dc3](https://github.com/redkubes/otomi-core/commit/3272dc34e373ef7946e62e2e516557e458c7a293)>)
- typo ([c185215](https://github.com/redkubes/otomi-core/commit/c18521503d225ee558e621cd94d46e9baae92b72))

### [0.10.111](https://github.com/redkubes/otomi-core/compare/v0.10.110...v0.10.111) (2020-09-09)

### Bug Fixes

- evaluate .secrets file ([ede3b1b](https://github.com/redkubes/otomi-core/commit/ede3b1bd06b8208b033306591b96889c16daf040))
- only encode secrets, jobs get rescheduled when changed [ci skip](<[c05c1c9](https://github.com/redkubes/otomi-core/commit/c05c1c9cd62c0fc4231e5a315611da3114974946)>)
- typo ([c185215](https://github.com/redkubes/otomi-core/commit/c18521503d225ee558e621cd94d46e9baae92b72))

### [0.10.110](https://github.com/redkubes/otomi-core/compare/v0.10.109...v0.10.110) (2020-09-01)

### Bug Fixes

- skip tls verify when cert=staging [ci skip](<[2077f06](https://github.com/redkubes/otomi-core/commit/2077f062be9b80846b8c67e7d3444531a60891ee)>)

### [0.10.109](https://github.com/redkubes/otomi-core/compare/v0.10.108...v0.10.109) (2020-09-01)

### Feature Improvements

- added certs-aws task to import letsencrypt certs [ci skip](<[e685c43](https://github.com/redkubes/otomi-core/commit/e685c43ea29135e1a03c26cfdccddaa0dc458f31)>)

### [0.10.108](https://github.com/redkubes/otomi-core/compare/v0.10.107...v0.10.108) (2020-08-27)

### Bug Fixes

- proxy target onprem [ci skip](<[c0b9f74](https://github.com/redkubes/otomi-core/commit/c0b9f7479f10f6fb576ce6d42e20b806d8158902)>)

### [0.10.107](https://github.com/redkubes/otomi-core/compare/v0.10.106...v0.10.107) (2020-08-27)

### Bug Fixes

- oauth-proxy target onprem [ci skip](<[8ad50ea](https://github.com/redkubes/otomi-core/commit/8ad50eaa18cad50c440d98bb2fe54eea79d4de05)>)

### [0.10.106](https://github.com/redkubes/otomi-core/compare/v0.10.105...v0.10.106) (2020-08-27)

### Bug Fixes

- metrics server in kube-system [ci skip](<[77a2cb1](https://github.com/redkubes/otomi-core/commit/77a2cb190da8923487bd6a5100939e8a1ae45b19)>)

### [0.10.105](https://github.com/redkubes/otomi-core/compare/v0.10.104...v0.10.105) (2020-08-27)

### Bug Fixes

- certs regression [ci skip](<[994b142](https://github.com/redkubes/otomi-core/commit/994b1429dc3e25960228e5b503c99d012d467c26)>)

### [0.10.104](https://github.com/redkubes/otomi-core/compare/v0.10.103...v0.10.104) (2020-08-27)

### Bug Fixes

- auth cert [ci skip]C ([74071a9](https://github.com/redkubes/otomi-core/commit/74071a97a4a5389e26f1be4b53b2f4e75e42ee60))

### [0.10.103](https://github.com/redkubes/otomi-core/compare/v0.10.102...v0.10.103) (2020-08-27)

### Bug Fixes

- no metrics server if not onprem [ci skip](<[57bfdf9](https://github.com/redkubes/otomi-core/commit/57bfdf9ee2f43bed9d4a508d089927f2743391da)>)

### [0.10.102](https://github.com/redkubes/otomi-core/compare/v0.10.101...v0.10.102) (2020-08-27)

### [0.10.101](https://github.com/redkubes/otomi-core/compare/v0.10.100...v0.10.101) (2020-08-27)

### Bug Fixes

- chart helper [ci skip](<[acc6f90](https://github.com/redkubes/otomi-core/commit/acc6f90ee1ff4a3cbe411fa69e4eae1b108f53e6)>)
- regression from merge perhaps [ci skip](<[563ea19](https://github.com/redkubes/otomi-core/commit/563ea195544af0a734a1a2df0af4a1ab79a5b0a1)>)

### [0.10.100](https://github.com/redkubes/otomi-core/compare/v0.10.99...v0.10.100) (2020-08-27)

### Bug Fixes

- certs [ci skip](<[c6f5215](https://github.com/redkubes/otomi-core/commit/c6f5215a88bdf18841f66a05f1f9f249442819ac)>)
- dnsprovider [ci skip](<[0b217e8](https://github.com/redkubes/otomi-core/commit/0b217e8fae22ad4d6badcb4066337426c77a9ede)>)

### [0.10.99](https://github.com/redkubes/otomi-core/compare/v0.10.98...v0.10.99) (2020-08-27)

### Bug Fixes

- alerts channel [ci skip](<[9bdff35](https://github.com/redkubes/otomi-core/commit/9bdff3501dcd4f83085d5fb4ce739bb7ebfa7bba)>)
- harbod charts permissions issue [ci skip](<[1435610](https://github.com/redkubes/otomi-core/commit/143561081f5b03082e7a93dcd7c6ccc43d664c58)>)
- labels gone [ci skip](<[2d5cb32](https://github.com/redkubes/otomi-core/commit/2d5cb32b8216bd290d8b0188cc23ab8ce5ab860e)>)
- labels gone [ci skip](<[f66cdf9](https://github.com/redkubes/otomi-core/commit/f66cdf90789cb90ea7d4439dca0d7e7f9713c6cf)>)

### Code Refactoring

- all certs now in artifacts [ci skip](<[41b84a9](https://github.com/redkubes/otomi-core/commit/41b84a97e8091e3279642c66249b784327a80fad)>)
- **oidc:** keycloak=no falls back to oidc idp ([fbc7aea](https://github.com/redkubes/otomi-core/commit/fbc7aea03341024670520ab536e03e092c251172))

### [0.10.98](https://github.com/redkubes/otomi-core/compare/v0.10.97...v0.10.98) (2020-08-24)

### Bug Fixes

- missing redirect url [ci skip](<[7ca53f0](https://github.com/redkubes/otomi-core/commit/7ca53f0adc4367a393f333215aac7822843cea15)>)

### [0.10.97](https://github.com/redkubes/otomi-core/compare/v0.10.96...v0.10.97) (2020-08-24)

### Bug Fixes

- missing team-admin value for keycloak [ci skip](<[2513b58](https://github.com/redkubes/otomi-core/commit/2513b58b5508ec7644241e3e3a7403f76d48624e)>)

### [0.10.96](https://github.com/redkubes/otomi-core/compare/v0.10.95...v0.10.96) (2020-08-23)

### Bug Fixes

- oidc groups, keycloak values, pullserets [ci skip](<[aef874e](https://github.com/redkubes/otomi-core/commit/aef874e4afc0ab5328d2a642037bc994924a6c87)>)

### Others

- **release:** 0.10.95 ([04fcde9](https://github.com/redkubes/otomi-core/commit/04fcde95a31ecf3ea26b5686e3c9115c3382f0d8))

### [0.10.95](https://github.com/redkubes/otomi-core/compare/v0.10.94...v0.10.95) (2020-08-23)

### Others

- **release:** 0.10.94 ([4bc7cdd](https://github.com/redkubes/otomi-core/commit/4bc7cdd9d1507af44e04d4c9c098474a9760eb15))

### [0.10.94](https://github.com/redkubes/otomi-core/compare/v0.10.93...v0.10.94) (2020-08-23)

### Bug Fixes

- oidc defaults [ci skip](<[6c665b7](https://github.com/redkubes/otomi-core/commit/6c665b70e4d49b50278f9458e656bafc3253bbcc)>)

### [0.10.93](https://github.com/redkubes/otomi-core/compare/v0.10.91...v0.10.93) (2020-08-23)

### Bug Fixes

- values ([564985f](https://github.com/redkubes/otomi-core/commit/564985f76c31feca914a5b051708910de323a163))

### Others

- **release:** 0.10.92 ([4bbb4a1](https://github.com/redkubes/otomi-core/commit/4bbb4a157348ae9a86e6ee2a4cdaef1d4322736d))

### [0.10.92](https://github.com/redkubes/otomi-core/compare/v0.10.91...v0.10.92) (2020-08-23)

### Bug Fixes

- values ([564985f](https://github.com/redkubes/otomi-core/commit/564985f76c31feca914a5b051708910de323a163))

### [0.10.91](https://github.com/redkubes/otomi-core/compare/v0.10.90...v0.10.91) (2020-08-22)

### Features

- **service:** knative service can have secretKeyRef [ci skip](<[e59f38c](https://github.com/redkubes/otomi-core/commit/e59f38cb7e2a26e944b7c264849900c3bacd729c)>)

### [0.10.90](https://github.com/redkubes/otomi-core/compare/v0.10.89...v0.10.90) (2020-08-19)

### Bug Fixes

- probes [ci skip](<[86a5f96](https://github.com/redkubes/otomi-core/commit/86a5f9657754cac921b62dbb72eef446f555f58c)>)

### [0.10.89](https://github.com/redkubes/otomi-core/compare/v0.10.88...v0.10.89) (2020-08-18)

### Bug Fixes

- team svc probes [ci skip](<[97c05d4](https://github.com/redkubes/otomi-core/commit/97c05d46ac4d385c516e7a2faf1c885542520dd4)>)

### [0.10.88](https://github.com/redkubes/otomi-core/compare/v0.10.87...v0.10.88) (2020-08-18)

### Bug Fixes

- docker secrets attached to sa [ci skip](<[66aab07](https://github.com/redkubes/otomi-core/commit/66aab075e3559ffe4288ad3f9c635df617a9cc12)>)

### [0.10.87](https://github.com/redkubes/otomi-core/compare/v0.10.86...v0.10.87) (2020-08-18)

### Bug Fixes

- docker secret [ci skip](<[4a27cd0](https://github.com/redkubes/otomi-core/commit/4a27cd00486e3cccd5d1424fead11cb7a8c13833)>)

### [0.10.86](https://github.com/redkubes/otomi-core/compare/v0.10.85...v0.10.86) (2020-08-18)

### Bug Fixes

- disabling probe for scaleToZero [ci skip](<[ff89dcf](https://github.com/redkubes/otomi-core/commit/ff89dcfee4c6d4fff30c374a66538a74b0edec3c)>)

### [0.10.85](https://github.com/redkubes/otomi-core/compare/v0.10.84...v0.10.85) (2020-08-18)

### Bug Fixes

- harbor team names ordering [ci skip](<[5e7c7af](https://github.com/redkubes/otomi-core/commit/5e7c7af00119efb2e661b002f2804def96f7b76d)>)

### [0.10.84](https://github.com/redkubes/otomi-core/compare/v0.10.83...v0.10.84) (2020-08-18)

### Bug Fixes

- generic secret entries [ci skip](<[95afbc9](https://github.com/redkubes/otomi-core/commit/95afbc972621f7f2d7c03cf3aec80f7f7bf3a6c3)>)

### Others

- **release:** 0.10.83 ([8ae0c0a](https://github.com/redkubes/otomi-core/commit/8ae0c0a227cf808c94952ebf28c824737be30b4a))

### [0.10.83](https://github.com/redkubes/otomi-core/compare/v0.10.82...v0.10.83) (2020-08-18)

### Bug Fixes

- create service account for jobs and cronjobs ([b481a3b](https://github.com/redkubes/otomi-core/commit/b481a3ba4d522cf7ce8a7f49ea8fb610ba7f5d9c))
- envoy crd, secrets [ci skip](<[f4634d2](https://github.com/redkubes/otomi-core/commit/f4634d2aa62f31b6d8f49e35273c881e0e4f883b)>)
- provide env to cronjob ([53a8315](https://github.com/redkubes/otomi-core/commit/53a831510522a409b7bda6882e468c66b027e287))
- typos and add spell checker config ([18f5f20](https://github.com/redkubes/otomi-core/commit/18f5f2099b6271b0d424c0bcb844e77c89e1ddf1))

### [0.10.82](https://github.com/redkubes/otomi-core/compare/v0.10.81...v0.10.82) (2020-08-18)

### Bug Fixes

- add condition for creating public ingress ([e33f871](https://github.com/redkubes/otomi-core/commit/e33f871d10bdd77b4bbecc2bf4a16ca4ae7d64e6))

### [0.10.81](https://github.com/redkubes/otomi-core/compare/v0.10.80...v0.10.81) (2020-08-16)

### Bug Fixes

- nginx hpa, prom metrics [ci skip](<[a148172](https://github.com/redkubes/otomi-core/commit/a148172211d42c085fca6339fb8f77367c7cba78)>)
- upgraded+fixed prom op, fixed nginx replicas ([5553329](https://github.com/redkubes/otomi-core/commit/555332938c470bc7baab9b0b0728be7a5a7d0488))

### [0.10.80](https://github.com/redkubes/otomi-core/compare/v0.10.79...v0.10.80) (2020-08-07)

### Bug Fixes

- blackbox exporter for teams [ci skip](<[4243a6c](https://github.com/redkubes/otomi-core/commit/4243a6ccdac02b956763b601b2746ac702ff9469)>)
- metrics for teams [ci skip](<[fed3992](https://github.com/redkubes/otomi-core/commit/fed39923a37f6eee4b6a63434af8ce009aa782b6)>)

### [0.10.79](https://github.com/redkubes/otomi-core/compare/v0.10.78...v0.10.79) (2020-08-07)

### Bug Fixes

- auth ingress [ci skip](<[553e262](https://github.com/redkubes/otomi-core/commit/553e2624659f15fcd6b65043baccf96987acb3c2)>)

### [0.10.78](https://github.com/redkubes/otomi-core/compare/v0.10.77...v0.10.78) (2020-08-07)

### Bug Fixes

- httpbin path [ci skip](<[0769236](https://github.com/redkubes/otomi-core/commit/076923670dd33bedc4a908c7bb31db4ceae502df)>)

### [0.10.77](https://github.com/redkubes/otomi-core/compare/v0.10.76...v0.10.77) (2020-08-07)

### Bug Fixes

- redirect to otomi [ci skip](<[edbfa72](https://github.com/redkubes/otomi-core/commit/edbfa726980633db4fc28073edb2957e662f017f)>)

### [0.10.76](https://github.com/redkubes/otomi-core/compare/v0.10.75...v0.10.76) (2020-08-07)

### Bug Fixes

- harbor logo for teams c[ skip](<[6b69a2f](https://github.com/redkubes/otomi-core/commit/6b69a2f996ec577af5ef91ae00d3977c06c6d99a)>)

### [0.10.75](https://github.com/redkubes/otomi-core/compare/v0.10.74...v0.10.75) (2020-08-07)

### Bug Fixes

- httpbin on own domain [ci skip](<[bf51d73](https://github.com/redkubes/otomi-core/commit/bf51d73c04f2ed2ee03cbe2ce4f492119b70e6a9)>)

### [0.10.74](https://github.com/redkubes/otomi-core/compare/v0.10.73...v0.10.74) (2020-08-07)

### Bug Fixes

- core apps on shared domain [ci skip](<[ce8fdf3](https://github.com/redkubes/otomi-core/commit/ce8fdf303683f43d4fbdaad6d3e84a2dc88b8881)>)

### [0.10.73](https://github.com/redkubes/otomi-core/compare/v0.10.72...v0.10.73) (2020-08-06)

### Bug Fixes

- harbor values [ci skip](<[a36204f](https://github.com/redkubes/otomi-core/commit/a36204ff20c78289a5495d54e482cf6d0aafb801)>)

### [0.10.72](https://github.com/redkubes/otomi-core/compare/v0.10.71...v0.10.72) (2020-07-29)

### Bug Fixes

- missing httpbin chart [ci skip](<[2b58a9c](https://github.com/redkubes/otomi-core/commit/2b58a9cc89d3760c9d2925696442858ab5eb1c44)>)
- missing httpbin chart [ci skip](<[c2a778b](https://github.com/redkubes/otomi-core/commit/c2a778b0120537230789845ff563655781b0891d)>)

### Feature Improvements

- added OIDC_CLIENT_SECRET for api [ci skip](<[25d932a](https://github.com/redkubes/otomi-core/commit/25d932a286f3fa858d42e21889f1097f36086cdc)>)

### [0.10.71](https://github.com/redkubes/otomi-core/compare/v0.10.70...v0.10.71) (2020-07-29)

### Bug Fixes

- team workloads [ci skip](<[c299ce5](https://github.com/redkubes/otomi-core/commit/c299ce57a121b9ce8f24faed95d6db342431e370)>)
- token forward for api [ci skip](<[98f709b](https://github.com/redkubes/otomi-core/commit/98f709b7e64ee58aafdda24a6943f404c84a0d17)>)

### [0.10.70](https://github.com/redkubes/otomi-core/compare/v0.10.69...v0.10.70) (2020-07-29)

### Bug Fixes

- gave admin group access to everything [ci skip](<[368cc77](https://github.com/redkubes/otomi-core/commit/368cc7761e686d01a232555d2609d5d892182727)>)

### [0.10.69](https://github.com/redkubes/otomi-core/compare/v0.10.68...v0.10.69) (2020-07-29)

### Bug Fixes

- logout link [ci skip](<[9558f7e](https://github.com/redkubes/otomi-core/commit/9558f7e52f9d6e6f586e4f9f5b0c564537148d23)>)

### [0.10.68](https://github.com/redkubes/otomi-core/compare/v0.10.67...v0.10.68) (2020-07-28)

### Bug Fixes

- logout link [ci skip](<[5600c20](https://github.com/redkubes/otomi-core/commit/5600c205e2459e39ca2e9d9ce1311a677af97249)>)

### [0.10.67](https://github.com/redkubes/otomi-core/compare/v0.10.65...v0.10.67) (2020-07-28)

### [0.10.66](https://github.com/redkubes/otomi-core/compare/v0.10.65...v0.10.66) (2020-07-28)

### Features

- **(add keycloak chart):** keycloak chart stack service ([7e4355b](https://github.com/redkubes/otomi-core/commit/7e4355bef7a00d2b7c411c5bb4dc80af8700b988))

### Bug Fixes

- auth proxy [ci skip](<[27e4828](https://github.com/redkubes/otomi-core/commit/27e4828874b964ff37e9de67f836757dffa7d120)>)
- gateway domains ([c57df11](https://github.com/redkubes/otomi-core/commit/c57df11e11fd53bd43aabc1242a17e25f684a59c))
- harbor secret ([a71d925](https://github.com/redkubes/otomi-core/commit/a71d925d4ddd79ac539851d07762efcf532933b6))
- keycloak, groups, logout [ci skip](<[61e4422](https://github.com/redkubes/otomi-core/commit/61e4422a5ae5702fd8c9c9098da989830f95d20e)>)
- oauth proxy ([d778198](https://github.com/redkubes/otomi-core/commit/d7781986b0e385cd009bd830a6eb843293dbae9f))

### Code Refactoring

- merge master ([3ea5f78](https://github.com/redkubes/otomi-core/commit/3ea5f78db51309b6fab5c465dd70bc607c8a54e0))
- **add kk alias:** add kk alias for keycloak ns commands ([ee50c44](https://github.com/redkubes/otomi-core/commit/ee50c445fedc27d12e0415569a18485006c99661))
- **expose keycloak through public ingress:** add isShared:true ([9b75288](https://github.com/redkubes/otomi-core/commit/9b75288c51cde58565afe161a3d53297f15238c7))
- **keycloak-http svc:** keycloak http service exposed on port 80 ([adeac7d](https://github.com/redkubes/otomi-core/commit/adeac7de235661954ea04f95f0fd57987ae7ecd8))

### Feature Improvements

- upgraded prometheus-operator, knative ([42a6feb](https://github.com/redkubes/otomi-core/commit/42a6feb420660601d891d1ff1b3ff04447ffe458))

### [0.10.65](https://github.com/redkubes/otomi-core/compare/v0.10.64...v0.10.65) (2020-07-22)

### Bug Fixes

- helmfile regression still exists [ci skip](<[795072d](https://github.com/redkubes/otomi-core/commit/795072dbb7ded3b3f6d4ffb5d2e96b75703b5503)>)

### [0.10.64](https://github.com/redkubes/otomi-core/compare/v0.10.61...v0.10.64) (2020-07-22)

### Bug Fixes

- istio-operator chart missing ns, worklfow latest only on release [ci skip](<[743af75](https://github.com/redkubes/otomi-core/commit/743af7511c6463ded83c6dd7471ec1d9453fd393)>)
- minAvailable now 2 for nginx [ci skip](<[f2ed6c4](https://github.com/redkubes/otomi-core/commit/f2ed6c4a227ec747c6bf879488cdd5295cc1e41d)>)
- missing files [ci skip](<[e07b7e7](https://github.com/redkubes/otomi-core/commit/e07b7e7416e0ef882b006e83ae56dd1d3cef0bd4)>)

### Others

- **release:** 0.10.62 ([8cde246](https://github.com/redkubes/otomi-core/commit/8cde246ce81214036bf8275ed9921f509fb14ca6))

### CI

- workflow simplification [ci skip](<[74e78b7](https://github.com/redkubes/otomi-core/commit/74e78b797bf88854213dab9bca0a7867e1f40bec)>)

### [0.10.62](https://github.com/redkubes/otomi-core/compare/v0.10.61...v0.10.62) (2020-07-20)

### Bug Fixes

- istio-operator chart missing ns, worklfow latest only on release [ci skip](<[743af75](https://github.com/redkubes/otomi-core/commit/743af7511c6463ded83c6dd7471ec1d9453fd393)>)

### [0.10.61](https://github.com/redkubes/otomi-core/compare/v0.10.60...v0.10.61) (2020-07-16)

### Bug Fixes

- maintenance error [ci skip](<[9309eb6](https://github.com/redkubes/otomi-core/commit/9309eb631818941720c82c2c32dca9cc614a612c)>)

### [0.10.60](https://github.com/redkubes/otomi-core/compare/v0.10.59...v0.10.60) (2020-07-16)

### Bug Fixes

- filtered out internal services from ingress [ci skip](<[773bfe4](https://github.com/redkubes/otomi-core/commit/773bfe4e548a45b7c8e1acba142af5f94588e028)>)
- upgrade issues, istio upgrade [ci skip](<[2e94275](https://github.com/redkubes/otomi-core/commit/2e94275ea52279ee9d58721d3f1bf91d15b462d3)>)

### [0.10.59](https://github.com/redkubes/otomi-core/compare/v0.10.58...v0.10.59) (2020-07-14)

### Bug Fixes

- proxy ingress bug [ci skip](<[057b81e](https://github.com/redkubes/otomi-core/commit/057b81e73fe19305d86d1ca40ca5bcf46196c8a0)>)

### [0.10.58](https://github.com/redkubes/otomi-core/compare/v0.10.57...v0.10.58) (2020-07-14)

### Bug Fixes

- exclusion for hasCloudLB [ci skip](<[5c6c32c](https://github.com/redkubes/otomi-core/commit/5c6c32c4cf54bfc15d80e59e3b3963bcfbd219ee)>)

### [0.10.57](https://github.com/redkubes/otomi-core/compare/v0.10.56...v0.10.57) (2020-07-14)

### Bug Fixes

- added dns label to proxy [ci skip](<[f7a30e3](https://github.com/redkubes/otomi-core/commit/f7a30e302ee56e228d9d97da12029a4ea8b95210)>)
- readme [ci skip](<[d1c2ba0](https://github.com/redkubes/otomi-core/commit/d1c2ba09fe04bbe344aa116516e62a256b5d66aa)>)
- service probes per team ([2db7f40](https://github.com/redkubes/otomi-core/commit/2db7f4027f32eddf4ad39de4b4e0bc40f3eecc4c))

### Feature Improvements

- upgraded prom operator [ci skip](<[976263a](https://github.com/redkubes/otomi-core/commit/976263af5afc733c1f93544d657c1b1a755027c6)>)

### [0.10.56](https://github.com/redkubes/otomi-core/compare/v0.10.55...v0.10.56) (2020-07-09)

### Bug Fixes

- harbor host [ci skip](<[ff8a0c0](https://github.com/redkubes/otomi-core/commit/ff8a0c0823452a33630b9af6ef7f2590998890e4)>)

### [0.10.55](https://github.com/redkubes/otomi-core/compare/v0.10.54...v0.10.55) (2020-07-09)

### Bug Fixes

- alias [ci skip](<[7470946](https://github.com/redkubes/otomi-core/commit/74709464c33a13139b778d851bd269e594b63e8f)>)
- charts upgraded for k8s 1.16 [ci skip](<[6018f60](https://github.com/redkubes/otomi-core/commit/6018f602e5f755ec94a3fbe6ea85bd4a3c68f375)>)

### [0.10.54](https://github.com/redkubes/otomi-core/compare/v0.10.53...v0.10.54) (2020-07-07)

### Bug Fixes

- paths [ci skip](<[b2be66c](https://github.com/redkubes/otomi-core/commit/b2be66c4e9ca354fa6f42847b39da367d77fd550)>)

### [0.10.53](https://github.com/redkubes/otomi-core/compare/v0.10.52...v0.10.53) (2020-07-07)

### Bug Fixes

- paths [ci skip](<[bbaab7f](https://github.com/redkubes/otomi-core/commit/bbaab7fc9df6399829b22c569e9eb755bdf3c49c)>)

### [0.10.52](https://github.com/redkubes/otomi-core/compare/v0.10.51...v0.10.52) (2020-07-07)

### Bug Fixes

- paths easier [ci skip](<[1321d47](https://github.com/redkubes/otomi-core/commit/1321d474729e693f15beb33eef1197aa375c5750)>)

### [0.10.51](https://github.com/redkubes/otomi-core/compare/v0.10.50...v0.10.51) (2020-07-07)

### Bug Fixes

- defaults for missing values [ci skip](<[6e5455b](https://github.com/redkubes/otomi-core/commit/6e5455b9d1ab7cbb9a483dcb0b756b895d2e4d08)>)

### [0.10.50](https://github.com/redkubes/otomi-core/compare/v0.10.49...v0.10.50) (2020-07-07)

### Bug Fixes

- core loki path [ci skip](<[5b10522](https://github.com/redkubes/otomi-core/commit/5b10522f5ca2ed2348162397e27d86898cc261fe)>)

### [0.10.49](https://github.com/redkubes/otomi-core/compare/v0.10.48...v0.10.49) (2020-07-07)

### Bug Fixes

- disablesync [ci skip](<[8d401c5](https://github.com/redkubes/otomi-core/commit/8d401c52145db90db9efc7413c56087f1134640e)>)
- health check ([9465e9e](https://github.com/redkubes/otomi-core/commit/9465e9e25d7ebdbcf2c3c2b42b3f0f7afb164d21))
- missing files ([e1ec9fb](https://github.com/redkubes/otomi-core/commit/e1ec9fb9b5fa47436a9bc5e73eb56fd06d6401a4))

### Feature Improvements

- added tools server for enc/dec ([3d55eff](https://github.com/redkubes/otomi-core/commit/3d55eff98101f4ebac5ffb7a632e956e1f7ba376))

### [0.10.48](https://github.com/redkubes/otomi-core/compare/v0.10.47...v0.10.48) (2020-07-01)

### Bug Fixes

- removed vs appendHeaders as it is deprecated [ci skip](<[827b48e](https://github.com/redkubes/otomi-core/commit/827b48e57a25932a00b4aa06c8a44b86f2744711)>)

### [0.10.47](https://github.com/redkubes/otomi-core/compare/v0.10.44...v0.10.47) (2020-06-30)

### Bug Fixes

- helmfile regression, removed crypt step [ci skip](<[b87c885](https://github.com/redkubes/otomi-core/commit/b87c885a4e4745259de3fa96829f6b8f54ae6d70)>)
- helmfile regression, removed crypt step [ci skip](<[a4c15de](https://github.com/redkubes/otomi-core/commit/a4c15de36934a025ecb45631fa8948b524255622)>)

### Others

- **release:** 0.10.46 ([39ad769](https://github.com/redkubes/otomi-core/commit/39ad769b99275dc63df9cc9f28fcad583e4984be))
- **release:** 0.10.46 ([b4c4b83](https://github.com/redkubes/otomi-core/commit/b4c4b8351e74dbfae42ff6fce06a3f61ca626eef))

### [0.10.46](https://github.com/redkubes/otomi-core/compare/v0.10.44...v0.10.46) (2020-06-30)

### Bug Fixes

- helmfile regression, removed crypt step [ci skip](<[b87c885](https://github.com/redkubes/otomi-core/commit/b87c885a4e4745259de3fa96829f6b8f54ae6d70)>)
- helmfile regression, removed crypt step [ci skip](<[a4c15de](https://github.com/redkubes/otomi-core/commit/a4c15de36934a025ecb45631fa8948b524255622)>)

### Others

- **release:** 0.10.46 ([b4c4b83](https://github.com/redkubes/otomi-core/commit/b4c4b8351e74dbfae42ff6fce06a3f61ca626eef))

### [0.10.46](https://github.com/redkubes/otomi-core/compare/v0.10.44...v0.10.46) (2020-06-30)

### Bug Fixes

- helmfile regression, removed crypt step [ci skip](<[a4c15de](https://github.com/redkubes/otomi-core/commit/a4c15de36934a025ecb45631fa8948b524255622)>)

### [0.10.44](https://github.com/redkubes/otomi-core/compare/v0.10.43...v0.10.44) (2020-06-29)

### Build System

- added sops [ci skip](<[4361598](https://github.com/redkubes/otomi-core/commit/4361598a2d3ca3f48807c00d6422c06da03ff7fb)>)

### [0.10.43](https://github.com/redkubes/otomi-core/compare/v0.10.42...v0.10.43) (2020-06-26)

### Bug Fixes

- redis chart ref [ci skip](<[ae8f7e7](https://github.com/redkubes/otomi-core/commit/ae8f7e7b9fad800bed9c438fbf5ae69640cd0eeb)>)

### [0.10.42](https://github.com/redkubes/otomi-core/compare/v0.10.41...v0.10.42) (2020-06-26)

### Bug Fixes

- added flags for harbor,redis,gatekeeper, revert harbor [ci skip](<[5005080](https://github.com/redkubes/otomi-core/commit/5005080bf5c33fe074cf9d548f459717a8751872)>)
- added redis for oauth2 sessions [ci skip](<[b9d0a0b](https://github.com/redkubes/otomi-core/commit/b9d0a0bed817e3289467058ad9d35089af9b2970)>)
- cleanup [ci skip](<[2951a53](https://github.com/redkubes/otomi-core/commit/2951a536e56688d2278c6348dd5cc986a3751c4c)>)
- external ingress [ci skip](<[db16e71](https://github.com/redkubes/otomi-core/commit/db16e71f45b274fbd02251350c02f13f9355825f)>)
- external ingress [ci skip](<[88ec1d0](https://github.com/redkubes/otomi-core/commit/88ec1d0976b72c5ccad36cd2567d138940b6aa9d)>)

### Others

- **release:** 0.10.41 ([3e0509e](https://github.com/redkubes/otomi-core/commit/3e0509e6c1374d90188830b5a2752d3026a2c096))

### [0.10.41](https://github.com/redkubes/otomi-core/compare/v0.10.40...v0.10.41) (2020-06-24)

### Bug Fixes

- notary port [ci skip](<[7653588](https://github.com/redkubes/otomi-core/commit/76535882c9ffdf936eaef103abd35ef82c2f20e4)>)
- scanning [ci skip](<[226048c](https://github.com/redkubes/otomi-core/commit/226048c1d40e0311c817e2869de1e609d704fb2e)>)

### [0.10.40](https://github.com/redkubes/otomi-core/compare/v0.10.39...v0.10.40) (2020-06-24)

### Bug Fixes

- teams path for api [ci skip](<[7023036](https://github.com/redkubes/otomi-core/commit/702303639a3d77e985d07bd9c4149780a48951ae)>)

### [0.10.39](https://github.com/redkubes/otomi-core/compare/v0.10.38...v0.10.39) (2020-06-24)

### Bug Fixes

- order of things, dns registration [ci skip](<[3e967d0](https://github.com/redkubes/otomi-core/commit/3e967d0e67eba77db625d688e7029cbd414795c2)>)

### [0.10.38](https://github.com/redkubes/otomi-core/compare/v0.10.37...v0.10.38) (2020-06-22)

### Bug Fixes

- missing proxy cert ([56578ef](https://github.com/redkubes/otomi-core/commit/56578efbbfa2c8d7f3ec2efdee086c8253a92066))

### [0.10.37](https://github.com/redkubes/otomi-core/compare/v0.10.36...v0.10.37) (2020-06-22)

### Features

- add harbor chart ([2dc4c3b](https://github.com/redkubes/otomi-core/commit/2dc4c3b487484317430fc56aae1ea877e7ba3943))
- add harbor raw template ([2d455e5](https://github.com/redkubes/otomi-core/commit/2d455e54df998d99126c1203492e919c1e5d05b2))
- expose harbor ([2166db7](https://github.com/redkubes/otomi-core/commit/2166db7ecb527ae1d252cdb5ebe2ba723c104a90))
- install harbor chart ([057362b](https://github.com/redkubes/otomi-core/commit/057362b5af91a317622ed2fe694d7657340f79f0))
- remove nginx form harbor chart ([2664dca](https://github.com/redkubes/otomi-core/commit/2664dca6b7cce91420625fb58d2efe63a2deefe6))
- use GCS bucket as a harbor registry stroge ([0c703c1](https://github.com/redkubes/otomi-core/commit/0c703c1bca272d36c534b966c9f3fdb4e57098b9))

### Bug Fixes

- certs, took harbor out of normal routing setup ([29e1090](https://github.com/redkubes/otomi-core/commit/29e1090de50d7269f5a65730301f16fb46f9900f))
- harbor now bypassing external LB, istio creates LB for harbor ([14227e8](https://github.com/redkubes/otomi-core/commit/14227e8c237fd36ef7c42a15fde715ad322722d0))
- harbor now on it's own [ci skip](<[50647c9](https://github.com/redkubes/otomi-core/commit/50647c9a5447d4bedd0bbaffb8ded14105c9d5a4)>)
- harbor vs ([ce8c6dd](https://github.com/redkubes/otomi-core/commit/ce8c6ddb729f85b6f915883c73b8656d91880881))
- put back commented code ([da7bf95](https://github.com/redkubes/otomi-core/commit/da7bf953b1f5e38e3fad730ac8e50e7fcb444922))
- remove old template ([b3b19de](https://github.com/redkubes/otomi-core/commit/b3b19de57d74eaa727a01979e11b821ef8e7e2fc))
- stashing [ci skip](<[cfaf1f4](https://github.com/redkubes/otomi-core/commit/cfaf1f46435309a0e47b45983d420f40ec6bbf9e)>)

### Code Refactoring

- **ingress:** rewrote the ingress, certs generation ([6b266e4](https://github.com/redkubes/otomi-core/commit/6b266e44a05f429c8fde06c0034319c4b1878c78))

### [0.10.36](https://github.com/redkubes/otomi-core/compare/v0.10.35...v0.10.36) (2020-06-21)

### Bug Fixes

- certs missing/overlap [ci skip](<[6e74e33](https://github.com/redkubes/otomi-core/commit/6e74e331720b44e92db575e94716e01a66bea686)>)

### [0.10.35](https://github.com/redkubes/otomi-core/compare/v0.10.34...v0.10.35) (2020-06-21)

### Bug Fixes

- harbor raw [ci skip](<[92173bc](https://github.com/redkubes/otomi-core/commit/92173bc3e52d1e7aac949faa976e47395c17cb68)>)

### [0.10.34](https://github.com/redkubes/otomi-core/compare/v0.10.33...v0.10.34) (2020-06-21)

### Bug Fixes

- proxy cert [ci skip](<[7616603](https://github.com/redkubes/otomi-core/commit/7616603abd49814a25d435b105d44c24c6ff15c0)>)

### [0.10.33](https://github.com/redkubes/otomi-core/compare/v0.10.32...v0.10.33) (2020-06-21)

### Bug Fixes

- proxy cert ([3a0b706](https://github.com/redkubes/otomi-core/commit/3a0b706d874bb4a50841de913242c7c6595f5e43))

### [0.10.32](https://github.com/redkubes/otomi-core/compare/v0.10.31...v0.10.32) (2020-06-20)

### [0.10.31](https://github.com/redkubes/otomi-core/compare/v0.10.30...v0.10.31) (2020-06-17)

### Bug Fixes

- removed missing chart release ref for team index [ci skip](<[8795adb](https://github.com/redkubes/otomi-core/commit/8795adb7110a80fd7d2f4730073d99aa17a30c60)>)

### [0.10.30](https://github.com/redkubes/otomi-core/compare/v0.10.29...v0.10.30) (2020-06-17)

### Bug Fixes

- removed missing chart release ref for dashboard + harbor [ci skip](<[cd389ff](https://github.com/redkubes/otomi-core/commit/cd389ff7480135cfd5a3e206bbae106d40168d20)>)

### [0.10.29](https://github.com/redkubes/otomi-core/compare/v0.10.28...v0.10.29) (2020-06-17)

### Bug Fixes

- removed missing chart release ref for index [ci skip](<[2ca0004](https://github.com/redkubes/otomi-core/commit/2ca0004f8913389c60dc205169013e283680f31f)>)

### [0.10.28](https://github.com/redkubes/otomi-core/compare/v0.10.27...v0.10.28) (2020-06-17)

### Bug Fixes

- change missingFileHandler name
  ([117e90a](https://github.com/redkubes/otomi-core/commit/117e90a76eb385fa928d9bb11bfbc12d1ede40f4))
- missing files ([c987497](https://github.com/redkubes/otomi-core/commit/c98749721736dd311b21ef9b9e51c5f1cd1b598b))

### Feature Improvements

- added helm secrets to tools, added missing file
  ([0c3ce44](https://github.com/redkubes/otomi-core/commit/0c3ce44b84f6bd248527cd4e4137cc4c6a4d9531))

### [0.10.27](https://github.com/redkubes/otomi-core/compare/v0.10.26...v0.10.27) (2020-06-15)

### Bug Fixes

- skipping tag building on release
  [ci skip](<[b0fdcb4](https://github.com/redkubes/otomi-core/commit/b0fdcb46b075a69299e07e64b8c85e951af54210)>)
- templating issues ([571b36d](https://github.com/redkubes/otomi-core/commit/571b36de9efb27c27767f240754ab85f906fe649))

### Code Refactoring

- moved alb ingress to raw
  ([f5b3e67](https://github.com/redkubes/otomi-core/commit/f5b3e677f59ca715816d5cbeeb41ed5e38e56cf2))

### [0.10.26](https://github.com/redkubes/otomi-core/compare/v0.10.25...v0.10.26) (2020-06-02)

### Features

- **prometheus:** added blackbox-exporter
  [ci skip](<[88e7bde](https://github.com/redkubes/otomi-core/commit/88e7bdef1b05f50d9d2faa3648b70150f8fa409b)>)

### [0.10.25](https://github.com/redkubes/otomi-core/compare/v0.10.24...v0.10.25) (2020-05-28)

### Feature Improvements

- added existing service hello
  [ci skip](<[3bdea4e](https://github.com/redkubes/otomi-core/commit/3bdea4ee7ef45009ec9571a62674a3859d3b799b)>)

### [0.10.24](https://github.com/redkubes/otomi-core/compare/v0.10.23...v0.10.24) (2020-05-28)

### Bug Fixes

- istio gw fix
  [ci skip](<[6f2cad8](https://github.com/redkubes/otomi-core/commit/6f2cad8f0ad364387161736e90d3740ccc8fc973)>)

### [0.10.23](https://github.com/redkubes/otomi-core/compare/v0.10.22...v0.10.23) (2020-05-28)

### Bug Fixes

- public domain certs now created outside of team charts
  [ci skip](<[c0a6845](https://github.com/redkubes/otomi-core/commit/c0a68458c80c6a61cd2bd81be7faf61dc4e81eaf)>)

### [0.10.21](https://github.com/redkubes/otomi-core/compare/v0.10.20...v0.10.21) (2020-05-27)

### [0.10.20](https://github.com/redkubes/otomi-core/compare/v0.10.19...v0.10.20) (2020-05-18)

### Bug Fixes

- tls secret naming ([bee81a8](https://github.com/redkubes/otomi-core/commit/bee81a852b14fd918391d74199f7930b1f654f01))

### [0.10.19](https://github.com/redkubes/otomi-core/compare/v0.10.18...v0.10.19) (2020-05-18)

### Bug Fixes

- cert name ([0cd3156](https://github.com/redkubes/otomi-core/commit/0cd3156d99483b2fa122e0f8ca39bbf908db2836))

### [0.10.18](https://github.com/redkubes/otomi-core/compare/v0.10.17...v0.10.18) (2020-05-18)

### Bug Fixes

- scaleToZero booolean check
  [ci skip](<[1a8d07f](https://github.com/redkubes/otomi-core/commit/1a8d07f8aa348ca2a63d143f64eb25665f643bb5)>)

### [0.10.17](https://github.com/redkubes/otomi-core/compare/v0.10.16...v0.10.17) (2020-05-18)

### Bug Fixes

- path fix for api
  [ci skip](<[56a5233](https://github.com/redkubes/otomi-core/commit/56a523377c7847b01930b827e70710c073d10c4c)>)

### [0.10.16](https://github.com/redkubes/otomi-core/compare/v0.10.15...v0.10.16) (2020-05-18)

### Feature Improvements

- scaleToZero, path validation, internal ksvc
  [ci skip](<[c74bce9](https://github.com/redkubes/otomi-core/commit/c74bce930dbd74e67f54c5e6187cff2668c2c421)>)

### [0.10.16](https://github.com/redkubes/otomi-core/compare/v0.10.15...v0.10.16) (2020-05-18)

### Bug Fixes

- downgraded istio to 1.5.4, added scaleToZero
  [ci skip](<[86ec011](https://github.com/redkubes/otomi-core/commit/86ec011da155893be80bda181e3a693ba17a4d2b)>)

### [0.10.15](https://github.com/redkubes/otomi-core/compare/v0.10.14...v0.10.15) (2020-05-17)

### Bug Fixes

- microsvc approach with path working
  [ci skip](<[8f3d3c8](https://github.com/redkubes/otomi-core/commit/8f3d3c8ed78e3e1d3ae3fd4842511a4073c4fbb4)>)

### [0.10.14](https://github.com/redkubes/otomi-core/compare/v0.10.13...v0.10.14) (2020-05-14)

### Bug Fixes

- gave team-admin clusterrole cluster-admin
  [ci skip](<[7e9daf8](https://github.com/redkubes/otomi-core/commit/7e9daf889b92f3869380a2d182ccaa8943a5dd9d)>)

### [0.10.13](https://github.com/redkubes/otomi-core/compare/v0.10.12...v0.10.13) (2020-05-14)

### Bug Fixes

- changed name to apiName [ci skip][#2](https://github.com/redkubes/otomi-core/issues/2)
  ([80667ba](https://github.com/redkubes/otomi-core/commit/80667ba450b75a6e711ca5c246c5e8cbfe497b46))

### [0.10.12](https://github.com/redkubes/otomi-core/compare/v0.10.11...v0.10.12) (2020-05-14)

### Bug Fixes

- changed name to apiName
  [ci skip](<[1b378d0](https://github.com/redkubes/otomi-core/commit/1b378d001fd0ef5658186ebecb93c6c297b25bce)>)

### [0.10.11](https://github.com/redkubes/otomi-core/compare/v0.10.10...v0.10.11) (2020-05-14)

### Bug Fixes

- added needed cluster info for kubecfg
  [ci skip](<[5db3cca](https://github.com/redkubes/otomi-core/commit/5db3cca3f6aa130bd47fa4bb02c1a5c6d440185a)>)

### [0.10.10](https://github.com/redkubes/otomi-core/compare/v0.10.9...v0.10.10) (2020-05-14)

### Bug Fixes

- apiserver ip added to api env
  [ci skip](<[172434c](https://github.com/redkubes/otomi-core/commit/172434c2f9761a2a61fe3f799fc88a84a15a5c54)>)

### [0.10.9](https://github.com/redkubes/otomi-core/compare/v0.10.8...v0.10.9) (2020-05-13)

### Bug Fixes

- redis-ha files added
  [ci skip](<[3201533](https://github.com/redkubes/otomi-core/commit/3201533e2920d0ab7c71a0cb15c1294b99aa0d83)>)

### [0.10.8](https://github.com/redkubes/otomi-core/compare/v0.10.7...v0.10.8) (2020-05-13)

### Bug Fixes

- redis-ha disabled
  [ci skip](<[ff2b054](https://github.com/redkubes/otomi-core/commit/ff2b054ff5ee4ffcfc7e91874858f193cef59766)>)

### [0.10.7](https://github.com/redkubes/otomi-core/compare/v0.10.6...v0.10.7) (2020-05-13)

### Bug Fixes

- added clusterrole admin for api
  [ci skip](<[712583d](https://github.com/redkubes/otomi-core/commit/712583d54e20fcb2acdb38e70cc92ffd0002e50e)>)

### [0.10.6](https://github.com/redkubes/otomi-core/compare/v0.10.5...v0.10.6) (2020-05-13)

### Bug Fixes

- api back to using image cmd
  [ci skip](<[fe61deb](https://github.com/redkubes/otomi-core/commit/fe61deb0e5d5513af6a1f54ba79ce9ed9f324bf4)>)
- loading order cert-manager
  [ci skip](<[a8d6dff](https://github.com/redkubes/otomi-core/commit/a8d6dff4cfddbe59c2bb2fe172c217b01d7f8e8f)>)

### [0.10.5](https://github.com/redkubes/otomi-core/compare/v0.10.4...v0.10.5) (2020-05-13)

### Bug Fixes

- gatekeeper setup
  [ci skip](<[42832c8](https://github.com/redkubes/otomi-core/commit/42832c8164e4b0c88b707217c779b044f507f8a8)>)

### [0.10.4](https://github.com/redkubes/otomi-core/compare/v0.10.3...v0.10.4) (2020-05-11)

### [0.10.3](https://github.com/redkubes/otomi-core/compare/v0.10.2...v0.10.3) (2020-05-11)

### Bug Fixes

- crd loading for cert-manager
  ([056ba2c](https://github.com/redkubes/otomi-core/commit/056ba2c542487dabaf4446614651731401d71ae3))
- many bugfixes and cleanups
  ([3bef9c7](https://github.com/redkubes/otomi-core/commit/3bef9c70416ef2fdaee0d150a18c69ab49801fbd))
- missing kubelet data, upgraded prometheus-operator
  ([ea98611](https://github.com/redkubes/otomi-core/commit/ea98611143d548b4711ab65f59ac78bb3ad58740))
- otomi-api value fix
  [ci skip](<[5c70827](https://github.com/redkubes/otomi-core/commit/5c708275847293ba844605b14b00454e8b376f63)>)

### Feature Improvements

- added disable sync flag for api
  [ci skip](<[95f4a8e](https://github.com/redkubes/otomi-core/commit/95f4a8efac45a0276e5814ea20c901b4f8ba80f8)>)

### [0.10.2](https://github.com/redkubes/otomi-core/compare/v0.10.1...v0.10.2) (2020-05-01)

### Bug Fixes

- made package private
  [ci skip](<[1275723](https://github.com/redkubes/otomi-core/commit/1275723175656296bf17a05f1c866d6e9e001782)>)
- removed faulty stack maintenance task
  [ci skip](<[ea05cea](https://github.com/redkubes/otomi-core/commit/ea05cea1dc69d92dd476b25d5e2916103542f24c)>)

### [0.10.1](https://github.com/redkubes/otomi-core/compare/v0.10.0...v0.10.1) (2020-05-01)

### Bug Fixes

- regression, completed upgrade script
  c[ skip](<[346e25f](https://github.com/redkubes/otomi-core/commit/346e25fa03b7ee808ad229be3367066ab8737cde)>)

## [0.10.0](https://github.com/redkubes/otomi-core/compare/v0.9.23...v0.10.0) (2020-05-01)

### ⚠ BREAKING CHANGES

- **moved wildcard domains under apps host:** istio upgraded, path mapping added

### Bug Fixes

- missing autoscaler
  ([7b9a936](https://github.com/redkubes/otomi-core/commit/7b9a936aa81d6a52b590db376377a7369966d346))
- tmp commit ([9ceddae](https://github.com/redkubes/otomi-core/commit/9ceddaed91d8c5d36670b84114d2c8b245eac3cd))

### Code Refactoring

- **moved wildcard domains under apps host:** apps behind paths
  ([faddf7a](https://github.com/redkubes/otomi-core/commit/faddf7ae107a3a36fc03523dbe4b91a2819fb910))

### Feature Improvements

- using new helm adoption feature
  ([a021714](https://github.com/redkubes/otomi-core/commit/a021714dfd6d5aa05652c4d004feb87df865a27f))

### [0.9.23](https://github.com/redkubes/otomi-core/compare/v0.9.22...v0.9.23) (2020-04-25)

### Bug Fixes

- internal ksvc that is not predeployed now gets deployed
  [ci skip](<[c1aeb01](https://github.com/redkubes/otomi-core/commit/c1aeb01a4d0a037f3a7f0d5b557bd8fe2e3da7cb)>)

### [0.9.22](https://github.com/redkubes/otomi-core/compare/v0.9.21...v0.9.22) (2020-04-24)

### Feature Improvements

- nginx upgrade
  [ci skip](<[501885c](https://github.com/redkubes/otomi-core/commit/501885c76f1cee8b3032808c7a027569c52a56da)>)

### [0.9.21](https://github.com/redkubes/otomi-core/compare/v0.9.20...v0.9.21) (2020-04-23)

### Bug Fixes

- teamId in team-ns [#3](https://github.com/redkubes/otomi-core/issues/3)
  [ci skip](<[922eeba](https://github.com/redkubes/otomi-core/commit/922eeba3f343744b070752abf28b47247cf3bdf3)>)

### [0.9.20](https://github.com/redkubes/otomi-core/compare/v0.9.19...v0.9.20) (2020-04-23)

### Bug Fixes

- teamId in team-ns [#2](https://github.com/redkubes/otomi-core/issues/2)
  [ci skip](<[a7f2c8e](https://github.com/redkubes/otomi-core/commit/a7f2c8ef1841421d6797a89edae6f54536c8c5e6)>)

### [0.9.19](https://github.com/redkubes/otomi-core/compare/v0.9.18...v0.9.19) (2020-04-23)

### Bug Fixes

- teamId in team-ns
  [ci skip](<[2b77e89](https://github.com/redkubes/otomi-core/commit/2b77e89f4e3b6d8167173fa5cf809cfa8fe7c94a)>)

### [0.9.18](https://github.com/redkubes/otomi-core/compare/v0.9.17...v0.9.18) (2020-04-23)

### Bug Fixes

- teamId now used instead of name
  [ci skip](<[aabd54d](https://github.com/redkubes/otomi-core/commit/aabd54db0d352976bfdc06f0190e40175831b199)>)

### Feature Improvements

- checksum on new config for api
  [ci skip](<[c5315c7](https://github.com/redkubes/otomi-core/commit/c5315c70f0fd84d2a8e9b10db7c3da9d01475ed8)>)

### [0.9.17](https://github.com/redkubes/otomi-core/compare/v0.9.16...v0.9.17) (2020-04-23)

### Bug Fixes

- missing teamconfig
  [ci skip](<[59528bd](https://github.com/redkubes/otomi-core/commit/59528bd9e1e3c08dc735001c806879adf5290db0)>)

### [0.9.16](https://github.com/redkubes/otomi-core/compare/v0.9.15...v0.9.16) (2020-04-23)

### Bug Fixes

- hiding auth app ([864a7fc](https://github.com/redkubes/otomi-core/commit/864a7fca69d53a35f2082146aee44691b85ba5f7))

### [0.9.15](https://github.com/redkubes/otomi-core/compare/v0.9.14...v0.9.15) (2020-04-20)

### Bug Fixes

- added hide flag to some services for api
  [ci skip](<[e1a16c8](https://github.com/redkubes/otomi-core/commit/e1a16c8b448c0fc8e5c4f3e6f642d91c93c96892)>)

### [0.9.14](https://github.com/redkubes/otomi-core/compare/v0.9.13...v0.9.14) (2020-04-20)

### Others

- added core.yaml as mount in api deployment
  ([d690cb8](https://github.com/redkubes/otomi-core/commit/d690cb8d76e6ac8029b0a12db21890170583fe76))
- added core.yaml as mount in api deployment: fix
  [ci skip](<[bdc91d2](https://github.com/redkubes/otomi-core/commit/bdc91d2cd1b4754518caa8489c54230deeda33a9)>)
- split up core values into secrets as well for api
  [ci skip](<[ee901a8](https://github.com/redkubes/otomi-core/commit/ee901a8eafbcdcc7afe97df8a4d500468a92b6c6)>)

### [0.9.13](https://github.com/redkubes/otomi-core/compare/v0.9.12...v0.9.13) (2020-04-19)

### Bug Fixes

- env fix
  [ci skip](<[2aeab5a](https://github.com/redkubes/otomi-core/commit/2aeab5af6c93edde4ec38835f48aa98d88b963eb)>)

### [0.9.12](https://github.com/redkubes/otomi-core/compare/v0.9.11...v0.9.12) (2020-04-19)

### Bug Fixes

- env fix for api
  [ci skip](<[a28b6b2](https://github.com/redkubes/otomi-core/commit/a28b6b25fec8860f7dfd9ed791cad48b12489cd4)>)

### [0.9.11](https://github.com/redkubes/otomi-core/compare/v0.9.9...v0.9.11) (2020-04-19)

### Bug Fixes

- put back svc name ([d8bca2f](https://github.com/redkubes/otomi-core/commit/d8bca2fdd7b15ba5feee6983927a59eac03cf85c))

### Code Refactoring

- removed unneeded 'svc' prop
  ([0e20233](https://github.com/redkubes/otomi-core/commit/0e20233d1627ca5a01fe718fbc7aec82a01e64f0))
- removed unneeded 'svc' prop
  ([584dacf](https://github.com/redkubes/otomi-core/commit/584dacf7a02ef4cc27e135ac4c2c6b7511188e10))

### [0.9.10](https://github.com/redkubes/otomi-core/compare/v0.9.9...v0.9.10) (2020-04-19)

### Code Refactoring

- removed unneeded 'svc' prop
  ([584dacf](https://github.com/redkubes/otomi-core/commit/584dacf7a02ef4cc27e135ac4c2c6b7511188e10))

### [0.9.9](https://github.com/redkubes/otomi-core/compare/v0.9.8...v0.9.9) (2020-04-14)

### Bug Fixes

- ports to default for api and web
  [ci skip](<[7989faf](https://github.com/redkubes/otomi-core/commit/7989faf82cf310845a14e633521f3c9052ddcef7)>)

### [0.9.8](https://github.com/redkubes/otomi-core/compare/v0.9.7...v0.9.8) (2020-04-14)

### Bug Fixes

- team ids
  [ci skip](<[35e749b](https://github.com/redkubes/otomi-core/commit/35e749b283d80d6222a1b21243b219fc96a8c507)>)

### [0.9.7](https://github.com/redkubes/otomi-core/compare/v0.9.6...v0.9.7) (2020-04-14)

### Bug Fixes

- corrected version grep
  [ci skip](<[b43f92c](https://github.com/redkubes/otomi-core/commit/b43f92c7aa316ed0c0af5e75378e4c8ed219132d)>)

### Code Refactoring

- removed teams files to favor default layering
  [ci skip](<[b46857d](https://github.com/redkubes/otomi-core/commit/b46857dc219a66fd535488656ed81f1b272c4538)>)

### [0.9.6](https://github.com/redkubes/otomi-core/compare/v0.9.5...v0.9.6) (2020-04-13)

### Features

- added hasKnative flag
  [ci skip](<[b78090f](https://github.com/redkubes/otomi-core/commit/b78090f4453d16ddbe5a58dbc065e64f555d628c)>)

### [0.9.5](https://github.com/redkubes/otomi-core/compare/v0.9.4...v0.9.5) (2020-04-10)

### Bug Fixes

- backwards compatibility for missing values
  [ci skip](<[8d720d4](https://github.com/redkubes/otomi-core/commit/8d720d441b93f0cab4b3ef61449ac19b30c253e3)>)

### Build System

- simplified release
  [ci skip](<[0c2cb8a](https://github.com/redkubes/otomi-core/commit/0c2cb8a9688404b51b4d97c0e6860f0b7ccaa204)>)

### [0.9.4](https://github.com/redkubes/otomi-core/compare/v0.9.3...v0.9.4) (2020-04-03)

### Bug Fixes

- azure config missing
  ([7ebcbf5](https://github.com/redkubes/otomi-core/commit/7ebcbf5e62f64e7109f919f02b8b44526c163969))

### [0.9.3](https://github.com/redkubes/otomi-core/compare/v0.9.2...v0.9.3) (2020-03-31)

### Bug Fixes

- azure monitor config fixes
  ([a554fdd](https://github.com/redkubes/otomi-core/commit/a554fdd65d860ea34f5f7d031460391a575720cd))

### [0.9.2](https://github.com/redkubes/otomi-core/compare/v0.9.1...v0.9.2) (2020-03-31)

### Bug Fixes

- corrected run-if-changed package
  [ci skip](<[eb94611](https://github.com/redkubes/otomi-core/commit/eb94611c1a9265f7cebd03fc19b683095249cca4)>)
- husky hook removed to avoid circular dep
  [ci skip](<[a4e6624](https://github.com/redkubes/otomi-core/commit/a4e6624ffe17a866fdadfa3466ea941d9e31f09a)>)
- lint-staged now without git add
  [ci skip](<[4afc276](https://github.com/redkubes/otomi-core/commit/4afc2769d5a5530c746aa3e5e18e7827c6876bb1)>)
- reenabled loki ([5a8d744](https://github.com/redkubes/otomi-core/commit/5a8d744f0852b155cc28bb1715cd758d0a976296))
- trying cz hook ([1fbca66](https://github.com/redkubes/otomi-core/commit/1fbca66e4113117ebfd851af8b5917134042fa70))

### Build System

- adding hook to force cz
  [ci skip](<[815e6ef](https://github.com/redkubes/otomi-core/commit/815e6ef36e7447dae47077f154f19eb1895e64bc)>)
- automatic prettier formatting
  ([35db7c2](https://github.com/redkubes/otomi-core/commit/35db7c232e14816bd8dd0b215936a882b79a60ba))
- split up npm run release to have :ok step
  [ci skip](<[842b2cf](https://github.com/redkubes/otomi-core/commit/842b2cf7c4236cf2a7a73acfb1d27249ef873949)>)

### Others

- removed suggested nginx extension
  [ci skip](<[9cdd56a](https://github.com/redkubes/otomi-core/commit/9cdd56a67fe0c73c48eb370e957d3d3ec34fdd14)>)

### [0.9.1](https://github.com/redkubes/otomi-core/compare/v0.9.0...v0.9.1) (2020-03-30)

### Bug Fixes

- added secrets props to azure monitor datasource
  ([5519a27](https://github.com/redkubes/otomi-core/commit/5519a271cb332b247a8b6d0d4c8bf7c6dd9bd0e8))
- missing react-redux after refactor, removed versions.ini
  ([856ed8c](https://github.com/redkubes/otomi-core/commit/856ed8c7c8bba46143d4d2e4c575793b62e13a49))

### Build System

- added settings for prettier auto save
  [ci-skip](<[c6f357b](https://github.com/redkubes/otomi-core/commit/c6f357b2d84938fdf7c9df2a6167b24740110d46)>)

### Others

- **release:** 0.9.1
  ([ba2827d](https://github.com/redkubes/otomi-core/commit/ba2827d988ab697a5c5098e1794798c4921b5ec5))

## [0.9.0](https://github.com/redkubes/otomi-core/compare/v0.8.36...v0.9.0) (2020-03-30)

### ⚠ BREAKING CHANGES

- new values structure

### Features

- added azure monitor support to prometheus
  ([8cdd17b](https://github.com/redkubes/otomi-core/commit/8cdd17b1fc964e84d0823a0fd9063df8051d672e)), closes
  [#73](https://github.com/redkubes/otomi-core/issues/73)

### Build System

- added settings for prettier auto save
  [ci-skip](<[c6f357b](https://github.com/redkubes/otomi-core/commit/c6f357b2d84938fdf7c9df2a6167b24740110d46)>)

### Bug Fixes

- added secrets props to azure monitor datasource
  ([5519a27](https://github.com/redkubes/otomi-core/commit/5519a271cb332b247a8b6d0d4c8bf7c6dd9bd0e8))
- missing react-redux after refactor, removed versions.ini
  ([856ed8c](https://github.com/redkubes/otomi-core/commit/856ed8c7c8bba46143d4d2e4c575793b62e13a49))
- otomi-console port 80 instead of 5000 since we moved to nginx
  ([4390c5d](https://github.com/redkubes/otomi-core/commit/4390c5dad3a77eb53058a002f3a35dab4df58df3))

### 0.8.36 (2020-03-25)

### Features

- automated release versioning
  ([65672da](https://github.com/redkubes/otomi-core/commit/65672da6788fcaa9efdf91e9a169d3d27d7467bd))
