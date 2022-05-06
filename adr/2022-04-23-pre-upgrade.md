# A new otomi pre-upgrade command

Maurice:

After changing `otomi.version`, and then calling `otomi pre-upgrade -r $release`, that will trigger any operations found in `upgrades.yaml` for the upgrade path.
This command is also called from a helmfile release's `presync` hook, so running `otomi apply|sync` will effectively execute all pre-upgrade operations just in time before a release is upgraded.
