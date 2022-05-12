# Values migration

Maurice:

When changing `otomi.version`, and then calling `otomi migrate`, the values are migrated to the latest schema version. It will perform the actions found in `values-changes.yaml` for the change records found between the old and new version.
The `otomi migrate` command is called from within the Drone pipeline, as that is the right moment to do it from an automation perspective:

- Drone has pulled the new container version and is bootstrapped with the latest values
- api will be redeployed during that run and can then start with the new values

Therefor the Drone pipeline will commit the migrated values with `[ci skip]` to avoid triggering another run.
