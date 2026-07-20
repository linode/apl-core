# Releasing APL Core

APL Core releases are created with two manually triggered GitHub Actions workflows. Both workflows default to `dry_run: true`; run them in dry-run mode before allowing any writes.

## Release model

A release cycle uses one `releases/v<major.minor>` branch, such as `releases/v1.4`. The branch covers all release candidates, the stable release, and subsequent patch releases in that major/minor series. It is created once and is not recreated.

Git tags are the source of truth for versions. `package.json` remains at `0.0.0`; release workflows derive versions from tags, and builds receive the version through the Dockerfile `VERSION` build argument.

## Cut a release branch

Run the **Release cut branch** workflow from the branch that should start the release cycle, normally `main`.

1. Open **Actions > Release cut branch > Run workflow**.
2. Choose a `bump_type` of `minor` or `major`.
3. Set `base_branch`, normally `main`.
4. Keep `release_branch_prefix` set to `releases/`.
5. Run once with `dry_run` enabled.
6. Review the run, then run again with `dry_run` disabled.

The workflow finds the highest stable tag in the repository, applies the requested version bump, runs the release checks, and creates the new release branch. It does not create a release tag or publish artifacts.

## Create a release

Run the **Release create from branch** workflow from an existing `releases/*` branch.

1. Open **Actions > Release create from branch > Run workflow**.
2. Select the release branch in the branch selector.
3. Leave `is_prerelease` enabled to create the next release candidate, or disable it to promote the current release candidate to stable.
4. Run once with `dry_run` enabled.
5. Review the computed tag and validation jobs, then run again with `dry_run` disabled.

For a release candidate, the workflow increments the highest RC tag on the branch. If the branch has no tags, it derives the initial version from the branch name and starts at `rc.1`. For a stable release, it removes the RC suffix from the highest release candidate tag.

The workflow validates dependencies and publishes the Git tag, GitHub release, container image, and Helm chart. The same release branch is used for later patch release candidates and stable patch releases.

## Version examples

| Event                             | Result          |
| --------------------------------- | --------------- |
| Cut a minor branch after `v5.1.0` | `releases/v5.2` |
| First RC on `releases/v5.2`       | `v5.2.0-rc.1`   |
| Next RC                           | `v5.2.0-rc.2`   |
| Stable promotion                  | `v5.2.0`        |
| First patch RC                    | `v5.2.1-rc.1`   |
| Stable patch promotion            | `v5.2.1`        |

## Development versions

Images built from `main` or feature branches use a development version. The build tag follows the branch name and the VERSION build argument is set to next minor version.

## Workflow definitions

- [Release cut branch](.github/workflows/release-cut-branch.yml)
- [Release create from branch](.github/workflows/release-create-from-branch.yml)
