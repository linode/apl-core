# Gitea Actions

In order to use the Gitea Actions act-runner you must either:

- enable persistence (used for automatic deployment to be able to store the token in a place accessible for the Job)
- create a secret containing the act runner token and reference it as a `existingSecret`

In order to use Gitea Actions, you must log on the server that's running Gitea and run the command:
    `gitea actions generate-runner-token`

This command will out a token that is needed by the act-runner to register with the Gitea backend.

Because this is a manual operation, we automated this using a Kubernetes Job using the following containers:

1) `actions-token-create`: it uses the current `gitea-rootless` image, mounts the persistent directory to `/data/` then it saves the output from `gitea actions generate-runner-token` to `/data/actions/token`
2) `actions-token-upload`: it uses a `bitnami/kubectl` image, mounts the scripts directory (`/scripts`) and
the persistent directory (`/data/`), and using the script from `/scripts/token.sh` stores the token in a Kubernetes secret

After the token is stored in a Kubernetes secret we can create the statefulset that contains the following containers:

1) `act-runner`: authenticates with Gitea using the token that was stored in the secret
2) `dind`: DockerInDocker image that is used to run the actions

If you are not using persistent volumes, you cannot use the Job to automatically generate the token.
In this case, you can use either the Web UI to generate the token or run a shell into a Gitea pod and invoke
the command `gitea actions generate-runner-token`. After generating the token, you must create a secret and use it via:

```yaml
actions:
  provisioning:
    enabled: false
  existingSecret: "secret-name"
  existingSecretKey: "secret-key"
```
