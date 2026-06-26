# git-server as the default values repository backend

- Status: accepted

## Context and Problem Statement

APL stores its platform configuration (Helm values, team settings, secrets) in a Git repository — the values repo. Every GitOps reconciliation cycle reads from it; if it is unavailable, ArgoCD cannot pull and the platform cannot self-heal.

Historically, Gitea was the only internal option. Gitea is a full Git forge: it ships with a web UI, user management, pull-request workflows, and a PostgreSQL database. During platform upgrades, Gitea and its database are upgraded in sequence. Either component can fail to restart cleanly, leaving the values repo unreachable and breaking the reconciliation loop until the issue is resolved manually.

For the narrow use case of storing the values repo, APL only needs dumb HTTP git storage — nothing Gitea's forge features provide.

## Considered Options

1. **git-server** (default) — a minimal nginx + `git-http-backend` deployment with no database dependency
2. **Gitea** (optional) — a self-hosted Git forge, enabled via `apps.gitea.enabled: true`
3. **External git repository** (GitHub, GitLab, or any HTTP-accessible git host) — credentials supplied at install time via `otomi.git.*` Helm values

## Decision Outcome

**git-server is the default values repository backend.** Gitea remains available as an optional app (`apps.gitea.enabled: true`) for teams that need a self-hosted Git forge — for example, to host application code repositories via `codeRepo.gitService: gitea`. External git repositories are supported for production environments where teams already operate GitHub, GitLab, or a similar service.

### Why git-server instead of Gitea as the default

git-server has no database. A single stateless nginx process serves `git-http-backend` over HTTP. There is nothing to upgrade independently, no PostgreSQL connection pool to exhaust, and no init container sequence that can leave the pod in a broken state. If the pod is evicted or restarted it comes back immediately from its PVC without manual intervention.

Gitea's database dependency is the specific failure mode this change eliminates. A Gitea upgrade that leaves the database in an inconsistent state, or a database upgrade that Gitea cannot connect to, renders the values repo unreachable. Because ArgoCD pulls continuously, even a brief outage during upgrade propagates into a stalled reconciliation loop.

git-server is also sufficient for evaluation and bootstrap scenarios: a fresh install needs only a place to write the initial values commit; it does not need pull requests, webhooks, or user management.

### Why Gitea is kept as an optional app

Gitea provides features that go beyond storing the values repo — repository browsing, access control, PR workflows, and integration with the `codeRepo` pipeline. Teams that use `codeRepo.gitService: gitea` to build application code depend on it. Making Gitea optional (rather than removing it) preserves those use cases without imposing Gitea's operational cost on installations that do not need it.

### External git for production environments

Teams operating in production typically already have a managed Git service. Pointing APL at an existing GitHub or GitLab repository avoids running any in-cluster git storage. The `otomi.git.repoUrl`, `otomi.git.username`, and `otomi.git.password` (optionally also `branch` and `email`) Helm values configure the external repository at install time. These values are consumed once during bootstrap to populate `apl-git-config` in the `apl-secrets` namespace; they are not persisted in the values repo itself and do not need to be supplied on subsequent upgrades.

### Positive consequences

- Platform upgrades no longer have a git-storage failure mode caused by a database restart
- Minimal installations (evaluation, CI) need fewer cluster resources
- Production teams can use a managed git service they already operate and back up

### Negative consequences

- git-server exposes no web UI; operators cannot browse the values repo in-cluster without external tooling
- Gitea must be explicitly enabled for `codeRepo.gitService: gitea` pipelines; it is no longer available by default

### Cloning the values repository from git-server

The values repo is publicly accessible at:

```
https://git.<domainSuffix>/otomi/values.git
```

Credentials are stored in the `apl-git-credentials` Secret in the operator namespace. Retrieve the hostname and credentials, then clone with:

```sh
HOST=$(kubectl get httproute -n git-server git-server -o jsonpath='{.spec.hostnames[0]}')
PASSWORD=$(kubectl get secret -n apl-secrets apl-git-config -ojsonpath="{.data.password}" | jq -Rr '@base64d|@uri')
git clone https://otomi-admin:${PASSWORD}@${HOST}/otomi/values.git
```

### Recreate update strategy

The git-server Deployment uses `strategy: type: Recreate` rather than the default `RollingUpdate`. The data volume is a `ReadWriteOnce` PVC, which can only be mounted by one node at a time. A rolling update would schedule the new pod before the old pod terminates, causing a multi-attach error that leaves the new pod stuck in `ContainerCreating` until the volume is released. Recreate terminates the old pod first, ensuring the volume is free before the new pod starts.
