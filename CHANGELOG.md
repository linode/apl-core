# Changelog

All notable changes to this project will be documented in this file. See
[standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
