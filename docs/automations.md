# Migrating values

Assumptions/conventions used in this document:

- `otomi-values` is a git repo with values bootstrapped by a version of an `otomi-core` container.

### The problem

We break the schema (`values-schema.yaml`) in our `otomi-values` when:

- We delete props
- We move properties around
- We mutate/transform (change property type or value shape)

In order to move to another version of `otomi-core` (which might contain some of these changes), we needed a mechanism that migrates the old `otomi-values` to conform to the new schema. So we came up with a simple approach that serves our simple schema.

### Solution

By comparing the diff between the old and the new schema a developer is able to create change records in `otomi-core` and store them in `values-changes.yaml`. Each record is given a successive number. If a user wants to upgrade the platform to a newer version of `otomi-core`, these change records will have to be applied to the values in successive order. When a dev runs `otomi commit` in an `otomi-values` repo, changes made to `otomi.version` will be detected, and the migration script will run in the newer container. The script only needs to compare the new `version` in `values-schema.yaml` with the `version` found in `otomi-values`.

### Change records

The `values-changes.yaml` file contains records holding information about changes. The order of operations, _in a given change_ is the following:

1. `deletions`
2. `relocations`
3. `mutations`

Note that it does not matter in which order these properties are listed, as it always executes it in that order. This is important to understand, as it implies that any changes made in `locations` need to be reflected in the `mutations` stage. So mutations can't reference values that have been relocated in the previous step!

Let's take a look at an example:

```yaml
changes:
  - version: 3
    deletions:
      # The key at (json)path charts.bla.someProp gets removed from ENV_DIR
      - charts.bla.someProp
    locations:
      # move the key (and value, obviously) at charts.bla.someProp to someNewRootProp.someProp
      - charts.bla.someProp: someNewRootProp.someProp
    mutations:
      # image tag went from semver to glob
      - charts.bla.image.tag: printf "v%s"
```

To repeat once more: `mutations` can not reference previous `deletions` or `relocations`.

E.g. the following migration is incorrect:

```yaml
changes:
  locations:
    - charts.bla.someProp: someNewRootProp.someProp
  mutations:
    - charts.bla.someProp: printf "v%s"
```

... because `charts.bla.someProp` does not exist anymore (since it is now under `someNewRootProp.someProp`). Let's correct the situation:

```yaml
changes:
  locations:
    - charts.bla.someProp: someNewRootProp.someProp
  mutations:
    - someNewRootProp.someProp: printf "v%s"
```

### Workflow

Every time a developer changes the schema (`values-schema.yaml`) and adds change records, the `otomi migrate` command should be performed that will migrate the values to the new structure. For the following example workflow, we assume that the current (new) schema version of `otomi-core` is `4`, and the previous `otomi-values` version is at `3`.

Note:

- ex ante (generally) means "the situation judged before the operation happened"
- ex post (generally) means "the situation judged after the operation happened"

#### Start example workflow

ex ante `otomi-values`:

```yaml
version: 3
charts:
  bla:
    someProp: someValue
```

ex ante `values-schema.yaml`:

```yaml
version: 3
definitions:
  type: object
  charts:
    type: object
    bla:
      type: object
      someProp:
        type: string
```

developer modifies `values-schema.yaml`. In order for automation to take place, developer has to modify `values-changes.yaml`.

ex post `values-schema.yaml`:

```yaml
version: 4
definitions:
  type: object
  charts:
    type: object
    bla:
      type: object
```

`values-changes.yaml`:

```yaml
changes:
  - version: 4
    deletions:
      # The key at (json)path charts.bla.someProp gets removed from ENV_DIR
      - charts.bla.someProp
```

ex post `otomi-values` (end result)

```yaml
charts:
  bla: {}
```

This works the same for `deletions`, `locations` and `mutations`.
