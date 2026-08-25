# Turnstone integration — the record

What was done to add Turnstone to this fork, and why each decision went the way it did. This is
**evidence, not a plan**: the work is on `feat/turnstone-integration`. For a *new* integration start
from `INTEGRATING-AN-APP.md` and come here for specifics, exactly as `VIKUNJA.md` serves that file.

**Status legend:** ✅ proven by running it · ⚠ built but not run end to end · ⛔ a bug found the
expensive way · ⬜ not done

Turnstone is `github.com/turnstonelabs/turnstone` at **v1.8.1**, Apache-2.0: self-hosted
orchestration for tool-using AI agents — a browser UI and REST API that give a language model real
tools (shell, files, search, web) with role-based access control, per-tool approval policies and an
audit log, over its own Postgres.

---

## Scope decided up front

| Question | Answer |
|---|---|
| Persist relational data? | yes — CNPG, `turnstone-otomi-db` |
| Log in with platform identity? | yes — OIDC against the shared `otomi` client |
| Console tile? | yes |
| Platform teams inside it? | **no operator** — delegated to the app's own OIDC role mapping |
| Fork Turnstone itself? | no — see "Rejected" |

Three repos, not four: `apl-core`, plus patches for `apl-api` and `apl-console` in
`turnstone-patches/`. **No `apl-tasks` change.**

---

## 1. What Phase 0 bought

Running the container before writing any Helm produced every decision below in about an hour. ✅

| Fact | Consequence |
|---|---|
| `python:3.14-slim`, `/bin/sh` and `/bin/bash` both present | **not** distroless, unlike `vikunja/vikunja` — the bootstrap Job may exec a shell |
| uid/gid **1000** (`useradd` with no `--uid`, then `USER turnstone`) | `runAsUser: 1000` |
| `/data`, `/workspace`, `/tmp`, `/home/turnstone` writable; `/etc/ssl/certs` and `/app` not | `readOnlyRootFilesystem` is off; `/data` and `/workspace` are emptyDirs |
| entry points live in `/app/.venv/bin`, not `/usr/local/bin` | matters when exec'ing them |
| image CA bundle holds **150** certificates | the trap in §3 |
| `psql` absent from the image | database checks go through the CNPG pod |
| entrypoint runs migrations with `|| true` | a migration failure does not stop the container |
| image tag `1.8.1` exists; the chart defaults to `0.3.0` | pin `image.tag` explicitly |

---

## 2. The model is a file, not an API call ✅

Turnstone's container command is fixed by the chart, so `--provider anthropic --model …` cannot be
passed; there is no seed file and no `turnstone-admin model` subcommand. The obvious route is the
console admin API, which needs a scoped token, the `admin.models` permission, and — easy to miss — a
follow-up fan-out `reload`, because creating a definition refreshes only the console's own
in-process registry and the server node would never see the alias.

None of that is necessary. `[models.*]` in `config.toml` is read **directly** by both processes and
takes precedence over database rows, and the API key field is `${VAR}`-expanded from the process
environment at registry-load time. So the ConfigMap carries a placeholder and the real key stays in
a Secret:

```toml
[models.claude-sonnet-5]
provider = "anthropic"
model = "claude-sonnet-5"
api_key = "${ANTHROPIC_API_KEY}"

[model]
default = "claude-sonnet-5"
```

Proven against 1.8.1 before any Helm was written — loading the registry with that file and
`ANTHROPIC_API_KEY=sk-ant-SENTINEL-12345` in the environment returned:

```
count: 1  alias: claude-sonnet-5  provider: 'anthropic'  base_url: ''  source: 'config'
api_key: 'sk-ant-SENTINEL-12345'   <- expanded from env, never in the file
default: claude-sonnet-5
```

⛔ **The key is `model =`, not `name =`.** Turnstone's own `turnstone.example.toml` uses `name =` in
its `[models.*]` example. The loader reads `entry.get("model", "")` and *skips the entry*. Observed
directly:

```
Model entry 'claude-sonnet-5' has no model name, skipping
No model definitions found — starting with an empty registry.
```

A healthy pod, a working UI, and no model. Upstream bug worth a pull request; `docs/architecture.md`
has it right while the example file does not.

⛔ Do **not** leave `api_key` empty hoping the Anthropic SDK reads the environment itself. On the
server the fallback is `OPENAI_API_KEY or "dummy"`, so it sends the literal `"dummy"` and gets a 401.

`base_url` is deliberately absent — set it and you must match the SDK default exactly.

---

## 3. ⛔ The certificate blocker — the expensive one

This cost the most and is the finding most likely to bite the next app. Mounting the platform CA is
**necessary but not sufficient**, and the failure is nothing like the Vikunja one.

### Why the issuer must be the browser-facing URL

Three independent hard blocks rule out the in-cluster Keycloak address: the `iss` claim is
exact-string-compared against the configured issuer; the browser is redirected to the *discovered*
`authorization_endpoint`; and a non-HTTPS issuer is refused unless the host is literally loopback.
A same-origin check then forbids mixing an internal issuer with a public authorize endpoint. So
Turnstone must validate the platform's own certificate — there is no backchannel escape, unlike the
operators that talk to `keycloak-keycloakx-http.keycloak.svc`.

### Trap one: `SSL_CERT_FILE` replaces the trust store

`httpx` 0.28.1 is the only client on the OIDC path, and it honours `SSL_CERT_FILE` / `SSL_CERT_DIR`
before falling back to `certifi`. `REQUESTS_CA_BUNDLE` is *not* honoured. There is no
Turnstone-native CA or insecure-skip setting for OIDC.

But `SSL_CERT_FILE` **replaces** the trust store rather than adding to it, so the Gitea and Vikunja
pattern — mounting the CA over `/etc/ssl/certs/ca-certificates.crt` — would leave the pod trusting
exactly one certificate. Measured against the live lab:

| `SSL_CERT_FILE` | Keycloak | `api.anthropic.com` |
|---|---|---|
| unset | fail, self-signed | **401** (TLS fine) |
| platform CA only | fail | **fail**, *unable to get local issuer* ⛔ 150 public roots lost |
| concatenated, 151 certs | fail (see trap two) | **401** ✅ |

Gitea and Vikunja have already made this trade; it is invisible only because neither calls a public
endpoint. Turnstone must reach `api.anthropic.com`, so it concatenates instead, in an initContainer
running as the same uid 1000:

```sh
cat /etc/ssl/certs/ca-certificates.crt /platform-ca/ca-certificates.crt > /trust/ca-bundle.crt
```

### Trap two: Python rejects the platform's certificates outright

Even with the CA correctly trusted, verification failed:

```
[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed:
Missing Authority Key Identifier (_ssl.c:1082)
```

Isolated to certainty rather than guessed. Clearing one flag makes the live handshake succeed:

| Test | Result |
|---|---|
| concatenated bundle, default context | fail |
| same bundle, `VERIFY_X509_STRICT` cleared | **OK**, TLSv1.3 |
| hand-made CA with a subject key identifier → leaf with an authority key identifier, strict **on** | **OK**, real handshake |
| `openssl verify` CLI, same chain | `OK` |

Python 3.13+ sets `VERIFY_X509_STRICT` on every default context, and OpenSSL 3.5 then enforces
RFC 5280's requirement that a non-self-signed certificate carry an **Authority Key Identifier**.

⚠ **That last row is why this hides.** The `openssl` command line does not apply the strict flag, so
every CLI check says the chain is fine. Vikunja never hit it because Go does not enforce it.

Root cause is one missing extension in the platform's **auto-generated** root CA. `createCustomCA`
in `src/cmd/bootstrap.ts` produces RSA-2048, SHA-1 (node-forge's default when `sign()` is called
with no digest), no common name, and extensions limited to `basicConstraints` and `keyUsage` — **no
subject key identifier**. Go's `x509.CreateCertificate` derives a leaf's authority key identifier
from the *parent's* subject key identifier, so a root without one yields leaves without one.
Confirmed: **not one** cert-manager-issued certificate in the cluster had an authority key
identifier.

Fix, in-band and platform-wide — the platform already exposes `apps.cert-manager.customRootCA` plus
`customRootCAKey` (a blank `x-secret`), described as *"Leave it empty to generate one
automatically"*, which is how the weak CA arose:

```bash
openssl req -x509 -newkey rsa:4096 -nodes -keyout ca.key -out ca.crt -days 3650 -sha256 \
  -subj "/C=NL/ST=Utrecht/L=Utrecht/O=Otomi/OU=Development" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,digitalSignature,keyCertSign,cRLSign" \
  -addext "subjectKeyIdentifier=hash"
openssl rsa -traditional -in ca.key -out ca.pkcs1.key   # match the PKCS#1 the platform emits
```

✅ Verified in-cluster: an Issuer backed by a CA carrying `subjectKeyIdentifier=hash` made
cert-manager v1.21.1 issue a leaf **with** `X509v3 Authority Key Identifier`. Tested in a disposable
namespace, since deleted.

⛔ **Do this on a fresh cluster; never retrofit it.** `customRootCAKey` is an `x-secret` but
`customRootCA` is not. On an already-bootstrapped cluster the new key wins through `generateSecrets`
while the *old* certificate survives in `storedSecrets` (read back from `otomi-generated-passwords`)
and overrides yours on disk — a mismatched pair, a dead `ClusterIssuer`, and the wrong CA
distributed everywhere. Also `bootstrap.ts` requires **both** values to be truthy; supply one and it
silently regenerates and discards yours.

Blast radius checked before changing it: all 14 consumers of `_derived.caCert` treat it as opaque
PEM, nothing pins or fingerprints it, no keystore imports it, `_derived.untrustedCA` depends only on
`issuer` so the insecure-skip-verify behavior elsewhere is unchanged, nothing depends on the CA's
subject, and no fixture encodes its shape. Keep it RSA — nothing in-tree exercises an elliptic-curve
CA.

---

## 4. Identity without an operator ✅

Turnstone has no team object at all — only orgs and roles (`builtin-admin`, `builtin-operator`,
`builtin-viewer`). So `INTEGRATING-AN-APP.md` 4.1's *first* membership model applies, the one it
tells you to prefer, and Phase 4 disappears: no `apl-tasks` patch, no operator chart, no ConfigMap
channel, no reconcile timer.

`apply_role_mapping` does a **flat** `claims.get(role_claim)` — no dotted-path traversal — which is
exactly the shape of this platform's `groups` claim, carrying realm roles plus built-in noise it
ignores because it maps to nothing:

```
TURNSTONE_OIDC_ROLE_CLAIM=groups
TURNSTONE_OIDC_ROLE_MAP=platform-admin:builtin-admin,team-<id>:builtin-operator
```

The map is rendered from `teamConfig`, so adding a team re-renders it through the normal GitOps
path. Roles are re-evaluated on every login and `replace_oidc_roles` revokes any no longer claimed,
so removing someone from a Keycloak group demotes them at next sign-in. Manual grants and the
`oidc-default` fallback are untouched.

⚠ Turnstone's own `docs/oidc.md` recommends `realm_access.roles` for this. That **cannot work** —
the code looks for a literal top-level key of that name. The claim must also be in the **ID token**,
not just the access token.

---

## 5. Things that shaped the deployment

**One hostname, pointed at the console.** ✅ Server and console share every top-level path prefix
(`/`, `/v1/*`, `/static/*`, `/shared/*`) and neither UI supports a base path, so path-splitting is
impossible. The console already reverse-proxies each node at `/node/{id}/` with HTML and JavaScript
prefix rewriting — the topology upstream's own Caddyfile uses. The server Service stays
ClusterIP-only.

**`/metrics` is unauthenticated** on both services, so the HTTPRoute redirects it with an Exact match
(more specific than the catch-all `PathPrefix`). Core Gateway API has no "return 403"; the redirect
filter shape comes from `snippets/routes.gotmpl`.

**The bootstrap Job is required, not optional.** OIDC login returns 403 *"Initial setup required
before OIDC login"* while the user count is zero, so SSO cannot bootstrap itself. It does one thing —
`turnstone-admin create-admin` — inside the console pod, which already has `TURNSTONE_DB_URL`.
✅ Verified idempotent: a second run reports *"is already an admin … no change"* and leaves exactly
one user.

⛔ **Gate it on readiness.** Without the `kubectl wait` init container every attempt dies with
`unable to upgrade connection: container not found`, spending a retry budget meant for real failures
on a predictable wait — and once spent, the admin user is never created and OIDC then fails with a
403 that reads like a Keycloak problem.

**No AuthorizationPolicy.** Turnstone does OIDC in-app, like Vikunja. Putting oauth2-proxy
ext-authz in front would double-authenticate and break the callback.

**SSE needs nothing special.** Every stream emits a 5-second keepalive, `X-Accel-Buffering: no` is
set, uvicorn is HTTP/1.1-only, and this repo configures no route or idle timeout. Do not strip
`Last-Event-ID` — the console forwards it upstream for replay.

**A ConfigMap name collision**, caught by rendering the chart before installing it: the chart emits
`turnstone-config` from its own fullname helper, so the `config.toml` one is
`turnstone-model-config`. Two releases owning one object name is a fight, not a merge.

---

## 6. Security posture — stated, not skipped ⚠

The server executes model-authored shell commands as plain subprocesses **in its own pod**, with
`git`, `curl`, `npm`/`npx` and `ripgrep` in the image. `workspace_dir` is documented as
informational only — it does not confine tool paths.

Defaults are sane: tool approval is required and waits indefinitely rather than auto-denying,
private-network fetches are blocked, and the child environment is scrubbed of `*_KEY` / `*_SECRET` /
`*_TOKEN` including `ANTHROPIC_API_KEY` and `TURNSTONE_DB_URL`. But `skip_permissions` is a single
database setting reachable from the console Settings tab, and flipping it grants unattended shell.

Applied here: `automountServiceAccountToken: false` (Turnstone reads nothing from
`/var/run/secrets/kubernetes.io` — verified, zero references), non-root uid 1000, `drop: ALL`,
`seccompProfile: RuntimeDefault`.

⬜ **Not done: a NetworkPolicy** restricting the namespace to Postgres, Keycloak and
`api.anthropic.com`. `definitions/appNetworkPolicyConfig` exists and `apps.turnstone.networkPolicies`
is already in the schema, but only three apps use the mechanism today. This is the residual risk and
the obvious next step.

---

## Rejected

- **Forking Turnstone.** The chart's missing hooks would be fixed in the fork and then still
  vendored here; the CA concatenation is a deployment concern, not a code one; and model
  configuration — the only real candidate — dissolved once the chart had a `volumes` hook. Every
  third-party app here vendors its upstream chart and overrides through values without touching the
  app.
- **Patching Turnstone to clear `VERIFY_X509_STRICT`.** Would have left the platform CA broken for
  the next Python app, and weakened certificate validation on the OIDC path.
- **A team-sync operator.** Turnstone has no team object; orgs are a near-empty tenancy concept here.
- **Splitting one hostname across server and console by path.** Their path namespaces are identical
  and neither frontend supports a base path.
- **Mounting the CA over `ca-certificates.crt`.** Works for Go apps; costs 150 public roots, which
  Turnstone needs.

## Upstream bugs found

Worth pull requests rather than local patches:

1. `turnstone.example.toml` uses `name =` in `[models.*]`; the loader reads `model =` and silently
   skips the entry.
2. `docs/oidc.md` recommends `TURNSTONE_OIDC_ROLE_CLAIM=realm_access.roles`, which cannot work
   against a flat `claims.get()`.
3. `docs/security.md` says the redirect URI defaults to the request Host header; it is required, and
   the fallback was removed as a redirect-spoofing hole.
4. The chart's `appVersion` is `0.3.0` against an app at 1.8.1, and `turnstone.image` falls back to
   it — so the default image tag may not exist.
5. `llm.apiKey` can only ever produce `OPENAI_API_KEY`, so an Anthropic deployment must use
   `llm.existingSecret` (or, as here, a chart patch).
