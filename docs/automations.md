## `binzx/otomi migrate`

### The problem

We break the schema when:

- We delete props;
- We move properties around;
- We mutate (change property type or value shape);

`otomi-core` should have a mechanism that migrates values to conform to the new spec.

### Solution

The versioning in `otomi-values` will be reused (semver; patches are additions; minors are breaking changes). `values-changes.yaml` will contain objects holding information about breaking changes (the order is important):

#### 1. The list of deleted props (deletions go first so we don't have to iterate over the changes more than necessary):

```yaml
changes:
  deletions: 
    # The key at (json)path charts.bla.someProp gets removed from ENV_DIR
    - charts.bla.someProp 
```

#### 2. The new location by mapping old to new:

```yaml
changes:
  locations:
    # move the key (and value, obviously) at charts.bla.someProp to someNewRootProp.someProp
    - charts.bla.someProp: someNewRootProp.someProp 
```

#### 3. The new type by giving a Go(lang) template (`gotmpl` or `tmpl`) for transformation:

```yaml
changes:
  mutations:
    # image tag went from semver to glob
    - charts.bla.image.tag: printf "v%s"
```

##### NOTE 

`mutations` of new `locations` can be introduced, but make sure to specify the RHS as the mutation to execute! 

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

#### Workflow

Every time a developer changes the schema which includes these changes, the `binzx/otomi migrate` command should be performed that will massage the values to migrate to the new structure. 

```yaml
changes:
  - version: 0.23.7
    deletions: []
    locations: []
    mutations: []
  - version: 0.23.8
    deletions: []
    locations: []
    mutations: []
```