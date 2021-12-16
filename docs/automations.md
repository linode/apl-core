## `binzx/otomi migrate`

### The problem

We break the schema (`values-schema.yaml`) in our `otomi-values` when:

- We delete props
- We move properties around
- We mutate/transform (change property type or value shape)

`otomi-core` could have a mechanism that migrates `otomi-values` to conform to a new schema.

### Solution

The versioning in `otomi-values` will be reused (semver; patches are additions; minors are breaking changes). The designated key is `otomi.version` (found in `settings.yaml`). Note that it will only perform migrations on anything >= `otomi.version` . 

After a successful migration, `otomi.version` is replaced with the most recent version. This results in idempotency of the operation, ie., every run of the migration results in the same shape.

### `values-changes.yaml` description

`values-changes.yaml` will contain objects holding information about changes. Note that the order of operations, _in a given change_ is the following: first `deletions`, then `locations`, then `mutations`. Note that it does not matter in which order the object key is written, it always executes it in that order. 

It also needs a corresponding semver to be executed. The _order of changes_ is also important, because e.g. properties could have been deleted in a future version if the properties were actually present at that point in time, just to name a problem if the order is not adhered to. Note that in this case it also does not matter in which order the object is written, it always executes from the earliest semver to the most recent known semver.

#### 1. The list of deleted (json)path keys

```yaml
changes:
  deletions: 
    # The key at (json)path charts.bla.someProp gets removed from ENV_DIR
    - charts.bla.someProp 
```

#### 2. The list of old-to-new (json)path key mappings

```yaml
changes:
  locations:
    # move the key (and value, obviously) at charts.bla.someProp to someNewRootProp.someProp
    - charts.bla.someProp: someNewRootProp.someProp 
```

#### 3. The list of new types by applying a Go(lang) template (`gotmpl` or `tmpl`) to a given (json)path key mapping

```yaml
changes:
  mutations:
    # image tag went from semver to glob
    - charts.bla.image.tag: printf "v%s"
```

##### NOTE 

`mutations` of new `locations` can be introduced, but make sure to specify the RHS (= Right Hand Side, ie. the value for a given key) as the mutation to execute! 

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

#### 4. The corresponding (semver) version



```yaml
changes:
  # ie., these changes happened in v0.23.7, so execute them if we were in e.g. v0.23.6, v0.22.0, etc., but not v0.23.8, v0.24.0, v1.0.0, etc.
  - version: v0.23.7 
    deletions: []
    locations: []
    mutations: []
  - version: v0.23.8
    deletions: []
    locations: []
    mutations: []
```

### Workflow

Every time a developer changes the schema (`values-schema.yaml`) which includes these changes, the `binzx/otomi migrate` command should be performed that will massage the values to migrate to the new structure. For the following example workflow, we assume that the current version of `otomi-core` is `>= v0.23.7` (easy to remember: otomi-core is always higher!), and the `otomi-values` version that the developer *still* has is `< v0.23.7` (easy to remember: developer is always lower and wants to go up!). 

Note that the semver used here is arbitrary, ie., it is not based on the actual version of `otomi-core`. Please always refer to the version found in `package.json` or the most recent release in the `otomi-core` repo for the latest version.

Note:
- ex ante (generally) means "the situation judged before the operation happened"
- ex post (generally) means "the situation judged after the operation happened"

#### Start example workflow

ex ante `otomi-values`:

```yaml
charts:
  bla:
    someProp: someValue
```

ex ante `values-schema.yaml`:

```yaml
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
  - version: v0.23.7
    deletions: 
    # The key at (json)path charts.bla.someProp gets removed from ENV_DIR
    - charts.bla.someProp 
```

ex post `otomi-values` (end result)

```yaml
charts:
  bla: {}
```

This is generalized for `deletions`, `locations` and `mutations`. 
