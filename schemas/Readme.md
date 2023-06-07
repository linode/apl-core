# api-versions

**Prerequsits**
Running k8s cluster (e.g.: minikube)

**Steps:**

1. Collect api versions

```
kubectl api-versions > api-versions/<my-version>
```

# schemas/v1.XX-standalone.tar.gz

**Prerequsits**
Install the `openapi2jsonschema` tool:

```
pip3 install openapi2jsonschema
```

**Steps:**

1. Add new version to `schemas/gen-k8s-schemas.sh`

2. Run `schemas/gen-k8s-schemas.sh`

3. Observe new archive created
