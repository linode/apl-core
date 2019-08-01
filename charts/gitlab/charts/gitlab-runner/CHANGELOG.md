# CHANGELOG

## v0.7.0 (2019-07-22)
- Fix broken anchor link for gcs cache docs !135
- Allow user to set rbac roles !112
- Bump used Runner version to 12.1.0 !149

## v0.6.0 (2019-06-24)
- Allow to manually build the package for development branches !120
- When configuring cache: if no S3 secret assume IAM role !111
- Allow to define request_concurrency value !121
- Bump used Runner version to 12.0.0 !138

## v0.5.0 (2019-05-22)
- Bump used Runner version to 11.11.0 !126

## v0.4.1 (2019-04-24)
- Bump used Runner version to 11.10.1 !113

## v0.4.0 (2019-04-22)

- Bump used Runner version to 11.10.0-rc2 !108
- Fix a typo in values.yaml !101
- Add pod labels for jobs !98
- add hostAliases for pod assignment !89
- Configurable deployment annotations !44
- Add pod annotations for jobs !97
- Bump used Runner version to 11.10.0-rc1 !107

## v0.3.0 (2019-03-22)

- Change mount of secret with S3 distributed cache credentials !64
- Add environment variables to runner !48
- Replace S3_CACHE_INSECURE with CACHE_S3_INSECURE !90
- Update values.yaml to remove invalid anchor in comments !85
- Bump used Runner version to 11.9.0 !102

## v0.2.0 (2019-02-22)

- Fix the error caused by unset 'locked' value !79
- Create LICENSE file !76
- Add CONTRIBUTING.md file !81
- Add plain MIT text into LICENSE and add NOTICE !80
- Fix incorrect custom secret documentation !71
- Add affinity, nodeSelector and tolerations for pod assignment !56
- Ignore scripts directory when buildin helm chart !83
- Bump used Runner version to 11.8.0-rc1 !87
- Fix year in Changelog  - it's already 2019 !84

## v0.1.45 (2019-01-22)

- Trigger release only for tagged versions !72
- Fixes typos in values.yaml comments !60
- Update chart to bring closer to helm standard template !43
- Add nodeSelector config parameter for CI job pods !19
- Prepare CHANGELOG management !75
- Track app version in Chart.yaml !74
- Fix the error caused by unset 'locked' value !79
- Bump used Runner version to 11.7.0 !82

