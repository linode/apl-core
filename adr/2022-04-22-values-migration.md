Maurice:

It is made possible to upgrade Otomi by changing `otomi.version`, and then calling `otomi pre-upgrade -r $release` on a release to trigger any operations found in `code-changes.yaml` for the upgrade path.
This new `pre-upgrade.ts` script is also called from a helmfile release's `presync` hook, so running `otomi apply|sync` will effectively execute all pre-upgrade operations just in time before a release is upgraded.
