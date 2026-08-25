# Vikunja Helm Chart

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/vikunja)](https://artifacthub.io/packages/search?repo=vikunja)
[![CI](https://github.com/go-vikunja/helm-chart/actions/workflows/ci.yml/badge.svg)](https://github.com/go-vikunja/helm-chart/actions/workflows/ci.yml)

This Helm Chart deploys the [Vikunja](https://hub.docker.com/r/vikunja/vikunja) container based on bjw-s'
[common library](https://github.com/bjw-s/helm-charts/tree/main/charts/library/common).

See https://artifacthub.io/packages/helm/vikunja/vikunja 
for version information and installation instructions.

## Optional Component
A different database. The Vikunja helm chart configures Vikunja with Sqlite by default, but MySql and Postgres are also supported by Vikunja and should work better if there are high performance requirements for this instance.

Postgres is recommended for Vikunja instances with higher performance requirements.
If you do not have a way to provide databases to your applications yet, Cloud Native Postgres (CNPG) is recommended.
An example configuration, after you have installed [CNPG](https://cloudnative-pg.io/):
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: cluster-vikunja
spec:
  instances: 1
  bootstrap:
    initdb:
      database: vikunja
      secret:
        name: vikunja-credentials
      import:
        type: microservice
        databases:
          - vikunja
  storage:
    size: 8Gi
```


## Upgrading to v2
### Backup and Restore (Easiest)
If only a few people are using your Vikunja instance,
export your Vikunja data (and have them do the same) via the "export from Vikunja" feature in settings.

Then if you're ok with Sqlite, just uninstall the old chart and reinstall the new v2 version.

You can then log in and restore your data by importing the Vikunja export.

### Backup and Restore Many Users
For more heavily used installations, you can make a Vikunja dump file and then use that to restore your installation.
#### Make a dump file
In order to use this, you must be on app version 1.0.0 or later. Earlier versions of Vikunja don't allow changing the path to save the dump to, and the Vikunja container security restrictions prevent writing to the default location for a dump in /. Instead, change the path to write to a pvc, like /db
```bash
kubectl exec sandboxvik-vikunja-5b89bc74dc-pd2rw -- /app/vikunja/vikunja dump -p /db
```
#### Exfiltrate the dump
Create a sidecar that contains the necessary binaries for `kubectl cp`
```bash
kubectl run busybox-sidecar --image=busybox --overrides='
{
  "spec": {
    "containers": [
      {
        "name": "busybox",
        "image": "busybox",
        "command": ["sleep", "infinity"],
        "volumeMounts": [
          {
            "name": "pvc-volume",
            "mountPath": "/data"
          }
        ]
      }
    ],
    "volumes": [
      {
        "name": "pvc-volume",
        "persistentVolumeClaim": {
          "claimName": "sandboxvik-vikunja-database"
        }
      }
    ]
  }
}
'
```
Copy it to your  local system
```bash
kubectl cp busybox-sidecar:/data/vikunja-dump_DATE.zip ./vikunjadump.zip
```
#### Install the new chart
Install a clean, fresh Vikunja installation.
#### Provide the dump to the fresh installation
Copy the Vikunja dump into a PVC the fresh Vikunja installation has access to, using the same sidecar pattern used to extract and exfiltrate the dump from the old container.

Create the sidecar

Copy the file in
```bash
kubectl cp ./vikunjadump.zip busybox-sidecar:/data/vikunja-dump.zip
```

Now delete the sidecar.
#### Restore from the dump
Note that you must be on a post 1.0.0 version of vikunja to use the --preserve-config flag, which is necessary for the Vikunja container.
Use the [Vikunja restore cli command](https://vikunja.io/docs/cli/#restore).
```bash
kubectl exec sandboxvik-vikunja-5b89bc74dc-pd2rw -- /app/vikunja/vikunja restore --preserve-config /db/vikunja-dump.zip # or wherever you put the dump
```
Done!

### Find a new Postgres Provider
The Bitnami charts (postgres and redis) are now deprecated.
Please use the CNPG for Postgres or another postgres database and provide your own Redis instance if you are using it (it was turned off by default 
in v1)

If you want to use Cloud Native PostGres (CNPG) this config should work for migration. Make sure your secret contains
keys `username` and `password` matching your current database for the `initdb` section to use.
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: cluster-vikunja
spec:
  instances: 1
  bootstrap:
    initdb:
      database: vikunja
      secret:
        name: vikunja-credentials
      import:
        type: microservice
        databases:
          - vikunja
        source:
          externalCluster: cluster-vikunja-legacy
  storage:
    size: 8Gi
  externalClusters:
    - name: cluster-vikunja-legacy
      connectionParameters:
        host: vikunja-vikunja-postgresql.vikunja.svc.cluster.local
        user: vikunja
        dbname: vikunja
      password:
        name: vikunja-credentials
        key: password
```

## Quickstart

The Helm chart is published to the [GitHub Container Registry](https://github.com/go-vikunja/helm-chart/pkgs/container/helm-chart%2Fvikunja).
To install it:


```bash
helm install vikunja oci://ghcr.io/go-vikunja/helm-chart/vikunja -f values.yaml
```

or, if you want to install it in a namespace:

```bash
helm install \
  --create-namespace \
  --namespace vikunja \
  vikunja \
  oci://ghcr.io/go-vikunja/helm-chart/vikunja \
  -f values.yaml
```

For minimal configuration, your `values.yaml` should at least set up ingress:

```yaml
vikunja:
  ingress:
    main:
      enabled: true
      hosts:
        - host: your-domain.com
          paths:
            - path: /
```

Define ingress settings according to your controller to access the application.

You can setup Vikunja API options as yaml under `vikunja.configMaps.config.data.config.yml`:
https://vikunja.io/docs/config-options

You can disable registration if you do not wish to allow others to register on your Vikunja instance by setting the following values in your `values.yaml`:

```yaml
vikunja:
  configMaps:
    config:
      enabled: true
      data:
        config.yml:
          service:
            enableregistration: false
```

You can still create new users by executing the following command in the `vikunja` container:

```bash
./vikunja user create --email <user@email.com> --user <user1> --password <password123>
```

To upgrade an existing installation:

```bash
helm upgrade vikunja vikunja/vikunja -f values.yaml
```

## Advanced Features

### Replicas

To effectively run multiple replicas of the API, 
make sure to set up the redis cache as well
by setting up Valkey or Redis, and then 
[configuring the proper Vikunja environment variables to point to it](https://vikunja.io/docs/config-options/#redis)

### Use an existing file volume claim

In the `values.yaml` file, 
you can either define your own existing Persistent Volume Claim (PVC) 
or have the chart create one on your behalf.

To use your pre-existing PVC:

```yaml
vikunja:
  persistence:
    data:
      enabled: true
      existingClaim: <your-claim>
```

To have the chart create one on your behalf:

```yaml
# You can find the default values 
vikunja:
  enabled: true
  persistence:
    data:
      enabled: true
      accessMode: ReadWriteOnce
      size: 10Gi
      mountPath: /app/vikunja/files
      storageClass: storage-class
```

### Utilizing environment variables from Kubernetes secrets

Each environment variable that is "injected" into a pod can be sourced from a Kubernetes secret.
This is useful when you wish to add values 
that you would rather keep as secrets in your GitOps repo as environment variables in the pods.

Assuming that you had a Kubernetes secret named `vikunja-env`, 
this is how you would add the value stored at key `VIKUNJA_DATABASE_PASSWORD` 
as the environment variable named `VIKUNJA_DATABASE_PASSWORD`:

```yaml
vikunja:
  env:
    VIKUNJA_DATABASE_PASSWORD:
      valueFrom:
        secretKeyRef:
          name: vikunja-env
          key: VIKUNJA_DATABASE_PASSWORD
    VIKUNJA_DATABASE_USERNAME: "db-user"
```

If the keys within the secret are the names of environment variables,
you can simplify passing multiple values to this:

```yaml
vikunja:
  envFrom:
    - secretRef:
      name: vikunja-secret-env
  env:
    VIKUNJA_DATABASE_USERNAME: "db-user"
```

This will add all keys within the Kubernetes secret named `vikunja-secret-env` as environment variables to the `vikunja` pod. Additionally, if you did not have the key `VIKUNJA_DATABASE_USERNAME` in the `vikunja-secret-env` secret, you could still define it as an environment variable seen above.

How the `envFrom` key works can be seen [here](https://github.com/bjw-s/helm-charts/blob/a081de53024d8328d1ae9ff7e4f6bc500b0f3a29/charts/library/common/values.yaml#L155).

### Utilizing a Kubernetes secret as the `config.yml` file instead of a ConfigMap

If you did not wish to use the ConfigMap provided by the chart, and instead wished to mount your own Kubernetes secret as the `config.yml` file in the `vikunja` pod, you could provide values such as the following (assuming `asdf-my-custom-secret1` was the name of the secret that had the `config.yml` file):

```yaml
vikunja:
  persistence:
    config:
      type: secret
      name: asdf-my-custom-secret1
```

Then your secret should look something like the following so that it will mount properly:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: asdf-my-custom-secret1
  namespace: vikunja
type: Opaque
stringData:
  config.yml: |
    key1: value1
    key2: value2
    key3: value3
```

### Modifying Deployed Resources

Oftentimes, modifications need to be made to a Helm chart to allow it to operate in your Kubernetes cluster.
Anything you see [in bjw-s' `common` library](https://github.com/bjw-s/helm-charts/blob/a081de53024d8328d1ae9ff7e4f6bc500b0f3a29/charts/library/common/values.yaml),
including the top-level keys, can be added and subtracted from this chart's `values.yaml`, 
underneath the `vikunja` key.

For example, if you wished to create a `serviceAccount` as can be seen [here](https://github.com/bjw-s/helm-charts/blob/a081de53024d8328d1ae9ff7e4f6bc500b0f3a29/charts/library/common/values.yaml#L85-L87) for the `vikunja` pod:

```yaml
vikunja:
  serviceAccount: 
    create: true
```

## Publishing

The following steps are automatically performed when a git tag for a new version is pushed to the repository.
They are only listed here for reference.

1. Pull all dependencies before packaging.

  ```shell
  helm dependency update
  ```

2. Package the Helm chart.

  ```shell
  helm package .
  ```

3. Push the package to GitHub Container Registry (OCI).

  ```shell
  echo "$TOKEN" | helm registry login "ghcr.io" --username "$USERNAME" --password-stdin
  helm push vikunja-*.tgz oci://ghcr.io/go-vikunja/helm-chart
  ```

The Helm chart is available at `oci://ghcr.io/go-vikunja/helm-chart`.
