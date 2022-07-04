# A new otomi pre-upgrade command

Maurice:

After changing `otomi.version`, and then calling `otomi apply`, operations found in `upgrades.yaml` will be executed for the upgrade path.
This command is also called from a helmfile release's `presync` and `postsync` hook, so running `otomi apply|sync` will effectively execute all pre-upgrade operations just in time before a release is upgraded, and all post-upgrade operations after.
