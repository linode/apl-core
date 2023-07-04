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

# Generate missing CRD's
When there is a new CRD added and used in different helm-charts it needs to be added to the `generated-crd-schemas.tar.gz` otherwise the tests from `NODE_ENV=test binzx/otomi validate-templates` will fail.

**Prerequsits**

Have a Kubernetes cluster available with the correct CRD's you want to add or want to build a new list with


**Steps for adding new CRD to the list:**

1. On line 21 in `gen-missing-crd-schemas.sh` set the correct shorthand for the CRD you want to add. The CRD is selected by a `kubectl get crd | grep $shorthand`
2. Execute the script `gen-missing-crd-schemas.sh`
3. This wil generate a new directory `generated-crd-schemas` in there are your CRD's. Check if they are correct. If the directory is not generated just unpack the `generated-crd-schemas.tar.gz`. Save this directory.
4. Now restore the old `generated-crd-schemas.tar.gz` with git or download the old one from the main branch. And unpack the tar.gz
5. Add the newly generated CRD's from step 3 to the contents from step 4.
6. Generate a new tar.gz from the diretory with: `tar -zcvf ../generated-crd-schemas.tar.gz .`
7. Run the tests `NODE_ENV=test binzx/otomi validate-templates` they shouldn't fail anymore.


**Steps for generating new CRD list:**

1. On line 21 in `gen-missing-crd-schemas.sh` set the correct shorthand for the CRD's you want in your new list. The CRD is selected by a `kubectl get crd | grep $shorthand`
2. Execute the script `gen-missing-crd-schemas.sh`
3. This wil generate a new directory `generated-crd-schemas` in there are your CRD's. Check if they are correct. Or unpack the new `generated-crd-schemas.tar.gz` and check if the correct CRD's are in there
4. Run the tests `NODE_ENV=test binzx/otomi validate-templates` they shouldn't fail anymore.