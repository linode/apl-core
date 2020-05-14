# Changelog

All notable changes to this project will be documented in this file. See
[standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.10.10](https://github.com/redkubes/otomi-stack/compare/v0.10.9...v0.10.10) (2020-05-14)

### Bug Fixes

- apiserver ip added to api env
  [ci skip](<[172434c](https://github.com/redkubes/otomi-stack/commit/172434c2f9761a2a61fe3f799fc88a84a15a5c54)>)

### [0.10.9](https://github.com/redkubes/otomi-stack/compare/v0.10.8...v0.10.9) (2020-05-13)

### Bug Fixes

- redis-ha files added
  [ci skip](<[3201533](https://github.com/redkubes/otomi-stack/commit/3201533e2920d0ab7c71a0cb15c1294b99aa0d83)>)

### [0.10.8](https://github.com/redkubes/otomi-stack/compare/v0.10.7...v0.10.8) (2020-05-13)

### Bug Fixes

- redis-ha disabled
  [ci skip](<[ff2b054](https://github.com/redkubes/otomi-stack/commit/ff2b054ff5ee4ffcfc7e91874858f193cef59766)>)

### [0.10.7](https://github.com/redkubes/otomi-stack/compare/v0.10.6...v0.10.7) (2020-05-13)

### Bug Fixes

- added clusterrole admin for api
  [ci skip](<[712583d](https://github.com/redkubes/otomi-stack/commit/712583d54e20fcb2acdb38e70cc92ffd0002e50e)>)

### [0.10.6](https://github.com/redkubes/otomi-stack/compare/v0.10.5...v0.10.6) (2020-05-13)

### Bug Fixes

- api back to using image cmd
  [ci skip](<[fe61deb](https://github.com/redkubes/otomi-stack/commit/fe61deb0e5d5513af6a1f54ba79ce9ed9f324bf4)>)
- loading order cert-manager
  [ci skip](<[a8d6dff](https://github.com/redkubes/otomi-stack/commit/a8d6dff4cfddbe59c2bb2fe172c217b01d7f8e8f)>)

### [0.10.5](https://github.com/redkubes/otomi-stack/compare/v0.10.4...v0.10.5) (2020-05-13)

### Bug Fixes

- gatekeeper setup
  [ci skip](<[42832c8](https://github.com/redkubes/otomi-stack/commit/42832c8164e4b0c88b707217c779b044f507f8a8)>)

### [0.10.4](https://github.com/redkubes/otomi-stack/compare/v0.10.3...v0.10.4) (2020-05-11)

### [0.10.3](https://github.com/redkubes/otomi-stack/compare/v0.10.2...v0.10.3) (2020-05-11)

### Bug Fixes

- crd loading for cert-manager
  ([056ba2c](https://github.com/redkubes/otomi-stack/commit/056ba2c542487dabaf4446614651731401d71ae3))
- many bugfixes and cleanups
  ([3bef9c7](https://github.com/redkubes/otomi-stack/commit/3bef9c70416ef2fdaee0d150a18c69ab49801fbd))
- missing kubelet data, upgraded prometheus-operator
  ([ea98611](https://github.com/redkubes/otomi-stack/commit/ea98611143d548b4711ab65f59ac78bb3ad58740))
- otomi-api value fix
  [ci skip](<[5c70827](https://github.com/redkubes/otomi-stack/commit/5c708275847293ba844605b14b00454e8b376f63)>)

### Feature Improvements

- added disable sync flag for api
  [ci skip](<[95f4a8e](https://github.com/redkubes/otomi-stack/commit/95f4a8efac45a0276e5814ea20c901b4f8ba80f8)>)

### [0.10.2](https://github.com/redkubes/otomi-stack/compare/v0.10.1...v0.10.2) (2020-05-01)

### Bug Fixes

- made package private
  [ci skip](<[1275723](https://github.com/redkubes/otomi-stack/commit/1275723175656296bf17a05f1c866d6e9e001782)>)
- removed faulty stack maintenance task
  [ci skip](<[ea05cea](https://github.com/redkubes/otomi-stack/commit/ea05cea1dc69d92dd476b25d5e2916103542f24c)>)

### [0.10.1](https://github.com/redkubes/otomi-stack/compare/v0.10.0...v0.10.1) (2020-05-01)

### Bug Fixes

- regression, completed upgrade script
  c[ skip](<[346e25f](https://github.com/redkubes/otomi-stack/commit/346e25fa03b7ee808ad229be3367066ab8737cde)>)

## [0.10.0](https://github.com/redkubes/otomi-stack/compare/v0.9.23...v0.10.0) (2020-05-01)

### ⚠ BREAKING CHANGES

- **moved wildcard domains under apps host:** istio upgraded, path mapping added

### Bug Fixes

- missing autoscaler
  ([7b9a936](https://github.com/redkubes/otomi-stack/commit/7b9a936aa81d6a52b590db376377a7369966d346))
- tmp commit ([9ceddae](https://github.com/redkubes/otomi-stack/commit/9ceddaed91d8c5d36670b84114d2c8b245eac3cd))

### Code Refactoring

- **moved wildcard domains under apps host:** apps behind paths
  ([faddf7a](https://github.com/redkubes/otomi-stack/commit/faddf7ae107a3a36fc03523dbe4b91a2819fb910))

### Feature Improvements

- using new helm adoption feature
  ([a021714](https://github.com/redkubes/otomi-stack/commit/a021714dfd6d5aa05652c4d004feb87df865a27f))

### [0.9.23](https://github.com/redkubes/otomi-stack/compare/v0.9.22...v0.9.23) (2020-04-25)

### Bug Fixes

- internal ksvc that is not predeployed now gets deployed
  [ci skip](<[c1aeb01](https://github.com/redkubes/otomi-stack/commit/c1aeb01a4d0a037f3a7f0d5b557bd8fe2e3da7cb)>)

### [0.9.22](https://github.com/redkubes/otomi-stack/compare/v0.9.21...v0.9.22) (2020-04-24)

### Feature Improvements

- nginx upgrade
  [ci skip](<[501885c](https://github.com/redkubes/otomi-stack/commit/501885c76f1cee8b3032808c7a027569c52a56da)>)

### [0.9.21](https://github.com/redkubes/otomi-stack/compare/v0.9.20...v0.9.21) (2020-04-23)

### Bug Fixes

- teamId in team-ns [#3](https://github.com/redkubes/otomi-stack/issues/3)
  [ci skip](<[922eeba](https://github.com/redkubes/otomi-stack/commit/922eeba3f343744b070752abf28b47247cf3bdf3)>)

### [0.9.20](https://github.com/redkubes/otomi-stack/compare/v0.9.19...v0.9.20) (2020-04-23)

### Bug Fixes

- teamId in team-ns [#2](https://github.com/redkubes/otomi-stack/issues/2)
  [ci skip](<[a7f2c8e](https://github.com/redkubes/otomi-stack/commit/a7f2c8ef1841421d6797a89edae6f54536c8c5e6)>)

### [0.9.19](https://github.com/redkubes/otomi-stack/compare/v0.9.18...v0.9.19) (2020-04-23)

### Bug Fixes

- teamId in team-ns
  [ci skip](<[2b77e89](https://github.com/redkubes/otomi-stack/commit/2b77e89f4e3b6d8167173fa5cf809cfa8fe7c94a)>)

### [0.9.18](https://github.com/redkubes/otomi-stack/compare/v0.9.17...v0.9.18) (2020-04-23)

### Bug Fixes

- teamId now used instead of name
  [ci skip](<[aabd54d](https://github.com/redkubes/otomi-stack/commit/aabd54db0d352976bfdc06f0190e40175831b199)>)

### Feature Improvements

- checksum on new config for api
  [ci skip](<[c5315c7](https://github.com/redkubes/otomi-stack/commit/c5315c70f0fd84d2a8e9b10db7c3da9d01475ed8)>)

### [0.9.17](https://github.com/redkubes/otomi-stack/compare/v0.9.16...v0.9.17) (2020-04-23)

### Bug Fixes

- missing teamconfig
  [ci skip](<[59528bd](https://github.com/redkubes/otomi-stack/commit/59528bd9e1e3c08dc735001c806879adf5290db0)>)

### [0.9.16](https://github.com/redkubes/otomi-stack/compare/v0.9.15...v0.9.16) (2020-04-23)

### Bug Fixes

- hiding auth app ([864a7fc](https://github.com/redkubes/otomi-stack/commit/864a7fca69d53a35f2082146aee44691b85ba5f7))

### [0.9.15](https://github.com/redkubes/otomi-stack/compare/v0.9.14...v0.9.15) (2020-04-20)

### Bug Fixes

- added hide flag to some services for api
  [ci skip](<[e1a16c8](https://github.com/redkubes/otomi-stack/commit/e1a16c8b448c0fc8e5c4f3e6f642d91c93c96892)>)

### [0.9.14](https://github.com/redkubes/otomi-stack/compare/v0.9.13...v0.9.14) (2020-04-20)

### Others

- added core.yaml as mount in api deployment
  ([d690cb8](https://github.com/redkubes/otomi-stack/commit/d690cb8d76e6ac8029b0a12db21890170583fe76))
- added core.yaml as mount in api deployment: fix
  [ci skip](<[bdc91d2](https://github.com/redkubes/otomi-stack/commit/bdc91d2cd1b4754518caa8489c54230deeda33a9)>)
- split up core values into secrets as well for api
  [ci skip](<[ee901a8](https://github.com/redkubes/otomi-stack/commit/ee901a8eafbcdcc7afe97df8a4d500468a92b6c6)>)

### [0.9.13](https://github.com/redkubes/otomi-stack/compare/v0.9.12...v0.9.13) (2020-04-19)

### Bug Fixes

- env fix
  [ci skip](<[2aeab5a](https://github.com/redkubes/otomi-stack/commit/2aeab5af6c93edde4ec38835f48aa98d88b963eb)>)

### [0.9.12](https://github.com/redkubes/otomi-stack/compare/v0.9.11...v0.9.12) (2020-04-19)

### Bug Fixes

- env fix for api
  [ci skip](<[a28b6b2](https://github.com/redkubes/otomi-stack/commit/a28b6b25fec8860f7dfd9ed791cad48b12489cd4)>)

### [0.9.11](https://github.com/redkubes/otomi-stack/compare/v0.9.9...v0.9.11) (2020-04-19)

### Bug Fixes

- put back svc name ([d8bca2f](https://github.com/redkubes/otomi-stack/commit/d8bca2fdd7b15ba5feee6983927a59eac03cf85c))

### Code Refactoring

- removed unneeded 'svc' prop
  ([0e20233](https://github.com/redkubes/otomi-stack/commit/0e20233d1627ca5a01fe718fbc7aec82a01e64f0))
- removed unneeded 'svc' prop
  ([584dacf](https://github.com/redkubes/otomi-stack/commit/584dacf7a02ef4cc27e135ac4c2c6b7511188e10))

### [0.9.10](https://github.com/redkubes/otomi-stack/compare/v0.9.9...v0.9.10) (2020-04-19)

### Code Refactoring

- removed unneeded 'svc' prop
  ([584dacf](https://github.com/redkubes/otomi-stack/commit/584dacf7a02ef4cc27e135ac4c2c6b7511188e10))

### [0.9.9](https://github.com/redkubes/otomi-stack/compare/v0.9.8...v0.9.9) (2020-04-14)

### Bug Fixes

- ports to default for api and web
  [ci skip](<[7989faf](https://github.com/redkubes/otomi-stack/commit/7989faf82cf310845a14e633521f3c9052ddcef7)>)

### [0.9.8](https://github.com/redkubes/otomi-stack/compare/v0.9.7...v0.9.8) (2020-04-14)

### Bug Fixes

- team ids
  [ci skip](<[35e749b](https://github.com/redkubes/otomi-stack/commit/35e749b283d80d6222a1b21243b219fc96a8c507)>)

### [0.9.7](https://github.com/redkubes/otomi-stack/compare/v0.9.6...v0.9.7) (2020-04-14)

### Bug Fixes

- corrected version grep
  [ci skip](<[b43f92c](https://github.com/redkubes/otomi-stack/commit/b43f92c7aa316ed0c0af5e75378e4c8ed219132d)>)

### Code Refactoring

- removed teams files to favor default layering
  [ci skip](<[b46857d](https://github.com/redkubes/otomi-stack/commit/b46857dc219a66fd535488656ed81f1b272c4538)>)

### [0.9.6](https://github.com/redkubes/otomi-stack/compare/v0.9.5...v0.9.6) (2020-04-13)

### Features

- added hasKnative flag
  [ci skip](<[b78090f](https://github.com/redkubes/otomi-stack/commit/b78090f4453d16ddbe5a58dbc065e64f555d628c)>)

### [0.9.5](https://github.com/redkubes/otomi-stack/compare/v0.9.4...v0.9.5) (2020-04-10)

### Bug Fixes

- backwards compatibility for missing values
  [ci skip](<[8d720d4](https://github.com/redkubes/otomi-stack/commit/8d720d441b93f0cab4b3ef61449ac19b30c253e3)>)

### Build System

- simplified release
  [ci skip](<[0c2cb8a](https://github.com/redkubes/otomi-stack/commit/0c2cb8a9688404b51b4d97c0e6860f0b7ccaa204)>)

### [0.9.4](https://github.com/redkubes/otomi-stack/compare/v0.9.3...v0.9.4) (2020-04-03)

### Bug Fixes

- azure config missing
  ([7ebcbf5](https://github.com/redkubes/otomi-stack/commit/7ebcbf5e62f64e7109f919f02b8b44526c163969))

### [0.9.3](https://github.com/redkubes/otomi-stack/compare/v0.9.2...v0.9.3) (2020-03-31)

### Bug Fixes

- azure monitor config fixes
  ([a554fdd](https://github.com/redkubes/otomi-stack/commit/a554fdd65d860ea34f5f7d031460391a575720cd))

### [0.9.2](https://github.com/redkubes/otomi-stack/compare/v0.9.1...v0.9.2) (2020-03-31)

### Bug Fixes

- corrected run-if-changed package
  [ci skip](<[eb94611](https://github.com/redkubes/otomi-stack/commit/eb94611c1a9265f7cebd03fc19b683095249cca4)>)
- husky hook removed to avoid circular dep
  [ci skip](<[a4e6624](https://github.com/redkubes/otomi-stack/commit/a4e6624ffe17a866fdadfa3466ea941d9e31f09a)>)
- lint-staged now without git add
  [ci skip](<[4afc276](https://github.com/redkubes/otomi-stack/commit/4afc2769d5a5530c746aa3e5e18e7827c6876bb1)>)
- reenabled loki ([5a8d744](https://github.com/redkubes/otomi-stack/commit/5a8d744f0852b155cc28bb1715cd758d0a976296))
- trying cz hook ([1fbca66](https://github.com/redkubes/otomi-stack/commit/1fbca66e4113117ebfd851af8b5917134042fa70))

### Build System

- adding hook to force cz
  [ci skip](<[815e6ef](https://github.com/redkubes/otomi-stack/commit/815e6ef36e7447dae47077f154f19eb1895e64bc)>)
- automatic prettier formatting
  ([35db7c2](https://github.com/redkubes/otomi-stack/commit/35db7c232e14816bd8dd0b215936a882b79a60ba))
- split up npm run release to have :ok step
  [ci skip](<[842b2cf](https://github.com/redkubes/otomi-stack/commit/842b2cf7c4236cf2a7a73acfb1d27249ef873949)>)

### Others

- removed suggested nginx extension
  [ci skip](<[9cdd56a](https://github.com/redkubes/otomi-stack/commit/9cdd56a67fe0c73c48eb370e957d3d3ec34fdd14)>)

### [0.9.1](https://github.com/redkubes/otomi-stack/compare/v0.9.0...v0.9.1) (2020-03-30)

### Bug Fixes

- added secrets props to azure monitor datasource
  ([5519a27](https://github.com/redkubes/otomi-stack/commit/5519a271cb332b247a8b6d0d4c8bf7c6dd9bd0e8))
- missing react-redux after refactor, removed versions.ini
  ([856ed8c](https://github.com/redkubes/otomi-stack/commit/856ed8c7c8bba46143d4d2e4c575793b62e13a49))

### Build System

- added settings for prettier auto save
  [ci-skip](<[c6f357b](https://github.com/redkubes/otomi-stack/commit/c6f357b2d84938fdf7c9df2a6167b24740110d46)>)

### Others

- **release:** 0.9.1
  ([ba2827d](https://github.com/redkubes/otomi-stack/commit/ba2827d988ab697a5c5098e1794798c4921b5ec5))

## [0.9.0](https://github.com/redkubes/otomi-stack/compare/v0.8.36...v0.9.0) (2020-03-30)

### ⚠ BREAKING CHANGES

- new values structure

### Features

- added azure monitor support to prometheus
  ([8cdd17b](https://github.com/redkubes/otomi-stack/commit/8cdd17b1fc964e84d0823a0fd9063df8051d672e)), closes
  [#73](https://github.com/redkubes/otomi-stack/issues/73)

### Build System

- added settings for prettier auto save
  [ci-skip](<[c6f357b](https://github.com/redkubes/otomi-stack/commit/c6f357b2d84938fdf7c9df2a6167b24740110d46)>)

### Bug Fixes

- added secrets props to azure monitor datasource
  ([5519a27](https://github.com/redkubes/otomi-stack/commit/5519a271cb332b247a8b6d0d4c8bf7c6dd9bd0e8))
- missing react-redux after refactor, removed versions.ini
  ([856ed8c](https://github.com/redkubes/otomi-stack/commit/856ed8c7c8bba46143d4d2e4c575793b62e13a49))
- otomi-web port 80 instead of 5000 since we moved to nginx
  ([4390c5d](https://github.com/redkubes/otomi-stack/commit/4390c5dad3a77eb53058a002f3a35dab4df58df3))

### 0.8.36 (2020-03-25)

### Features

- automated release versioning
  ([65672da](https://github.com/redkubes/otomi-stack/commit/65672da6788fcaa9efdf91e9a169d3d27d7467bd))
