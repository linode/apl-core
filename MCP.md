# MCP servers for Gitea and Vikunja — what was learned

What was done to deploy MCP (Model Context Protocol) servers alongside Gitea and Vikunja on this
fork, and every trap hit proving they actually work. This is **evidence, not a plan** — the work
is on `main` (commits around `fix(gitea): set command on the gitea-mcp sidecar...` and
`feat(gitea,vikunja): deploy MCP servers alongside both platform apps`). Read this before touching
either server again, or before wiring Turnstone (or any other MCP client) to them.

**Status legend:** ✅ proven by running it · ⬜ not done / next step

**Goal, unchanged from when this started:** let an MCP client — a Turnstone agent — talk to Gitea
and Vikunja. Both are singleton platform apps shared by every team, authenticated via this
platform's single Keycloak OIDC client (`otomi`).

---

## What's deployed ✅

- **Gitea**: the official `docker.gitea.com/gitea-mcp-server` as a sidecar in the existing Gitea
  pod (`values/gitea/gitea.gotmpl`, `extraContainers`), talking to Gitea over `localhost:3000` —
  no CA trust needed for that hop. A new `gitea-mcp` Service exposes its port 8090, since the
  chart's own Service template has no extra-port hook. Gated by the same `apps.gitea.enabled`
  everything else in that pod already depends on.
- **Vikunja**: no official MCP server exists. `democratize-technology/vikunja-mcp` (most-starred
  community option, 106★) runs as a standalone Deployment+Service
  (`values/vikunja/vikunja-raw.gotmpl` — the chart's own `additionalObjects:` hook fails
  `helm lint`, see the comment there), wrapped in `supergateway` to speak HTTP since it's
  npm-only and stdio-only. Image: `vikunja-mcp/Dockerfile` in this repo, built and `kind load`ed
  like `apl-tools-local` — see `SETUP.md`'s "Vikunja MCP" step.
- **NetworkPolicy**: `charts/apl-network-policies/templates/networkpolicies/gitea.yaml` has a new
  ingress block admitting the `turnstone` namespace/pod label. Vikunja has **no NetworkPolicy at
  all** today (confirmed live — `kubectl get networkpolicy -n vikunja` returns nothing), so
  nothing was needed there for reachability; that's a gap worth closing later, not something this
  work introduced.

---

## Neither app's API accepts a raw Keycloak/OIDC token ✅

This is the single most important finding, and it will keep coming up:

**A Keycloak-issued access token (however you mint it — browser SSO, `password` grant, doesn't
matter) is rejected outright by both apps' own APIs.** Confirmed live:

- Gitea: `{"error":"get user info err: invalid username, password or token"}` — this is a real,
  currently-open upstream limitation, not a config gap in this chart. See
  [`go-gitea/gitea#23382`](https://github.com/go-gitea/gitea/issues/23382), "Provide a way to
  access Gitea API through external authentication source" — others hit the identical rejection.
- Vikunja: `vikunja_auth.connect` accepts anything at connect-time (it doesn't validate), but the
  first real API call fails with `"missing, malformed, expired or otherwise invalid token
  provided"` — Vikunja verifies JWT signatures with its own `VIKUNJA_SERVICE_SECRET` (HMAC), not
  Keycloak's key.

**Why**: OIDC/Keycloak here does exactly one job — SSO into each app's own web UI. When Gitea or
Vikunja finishes that login handshake, each mints its *own*, separate credential for everything
after that (a session cookie for the browser; its own token type for API use). For an app's API to
accept a Keycloak token directly, the app has to be built as an OIDC *resource server*
(introspection or JWKS-based verification on every API call) — a different feature from "log into
my web UI via SSO," and neither app is configured for it here. This is the same reason GitHub,
GitLab, Jira etc. all separate SSO-login from API-token: SSO gets you into the web UI, the API
still wants its own, independently-scoped-and-revocable token.

**A platform user only exists as an OIDC-provisioned account** in both apps
(`oauth2_client.ENABLE_AUTO_REGISTRATION: true` in Gitea; the equivalent in Vikunja's `openid`
config) — no usable local password. Confirmed: `POST /api/v1/login` for
`platform-admin@<domain>` against Vikunja returns `"This account is managed by a third-party
authentication provider"`. Basic Auth against Gitea for the same account would fail the same way.
This is unlike the *bootstrap* admin accounts (`otomi-admin` / `apl-vikunja-admin`), which are true
local accounts with real passwords from day one — Basic Auth against those works instantly, no
OIDC anywhere near it.

---

## So: how do you actually get a credential a real platform user can use? ✅

Two different native mechanisms, one per app — both proven live, both starting from a real
Keycloak SSO login (no shortcuts: `platform-admin`'s Keycloak password alone does not get you
here without actually completing the SSO redirect flow, since Basic Auth is refused for that
account in both apps):

**Gitea — Personal Access Token.** Log in via Gitea's "Anmelden mit otomi-idp" button (real SSO
redirect through Keycloak), then Settings → Applications → generate a token with whatever scopes
you need. That PAT is a normal `Authorization: Bearer <token>` credential gitea-mcp passes through
unmodified. Nothing gitea-mcp-specific here; it's exactly how a human would get API access to
their own Gitea account.

**Vikunja — Bot Accounts, not personal API tokens.** Vikunja has a first-class "bot user" concept
(Settings → Bots, `/user/settings/bots`) distinct from a personal API token:

- Created directly by an admin action — no OIDC, no password. Vikunja creates the account with a
  `bot-` prefix.
- The bot "authenticates only with an API token" (Vikunja's own docs) — mint one from the same
  settings page, scoped via the preset buttons ("Nur Leserechte" / "Aufgabenverwaltung" /
  "Projektverwaltung" / "Voller Zugriff") or individual checkboxes.
- Every bot is *owned* by the human who created it, but is its own distinct account — it doesn't
  inherit the owner's project access automatically. **You must explicitly share each project with
  it**, same as sharing with any other user.
- **The project-share UI's search box does not find bot accounts by typed username** — it returned
  `"Der:die Benutzer:in existiert nicht"` even for the bot's exact username. The fix: call the API
  directly. `PUT /api/v1/projects/{id}/users` with `{"username": "bot-name", "right": 2}` — note
  the request body's `right` field is silently ignored on the *initial* share (comes back
  `"permission":0`, i.e. read-only); a **second** call, `POST` to the same
  `/api/v1/projects/{id}/users/{user_id}` path with `{"username": "bot-name", "permission": 2}`,
  is what actually sets write access. Two calls, two different field names (`right` vs
  `permission`), confirmed live — not documented anywhere obvious.
- Attribution is real and separate: an MCP-created task's `created_by` shows the bot
  (`bot_owner_id` points back to the human), not the human directly.

This is the better long-term shape for "an agent's own identity" (matches the "Static headers /
single shared identity" mode in Turnstone's MCP-server registration UI — see below). Gitea has no
equivalent bot-account concept; a PAT tied to a real human account is the only native option there.

---

## Server-specific traps, both found by actually running them ✅

**Gitea MCP server (`docker.gitea.com/gitea-mcp-server:latest`, v1.6.0 as pulled):**
- CLI/env reference (pulled and ran `--help` directly — trust this over the web docs, which
  disagree on at least one point below):
  ```
  -t, -transport <type>   stdio | http   (env: MCP_MODE)
  -H, -host <url>         Gitea host      (env: GITEA_HOST)
  -p, -port <number>      HTTP port, default 8080
  -T, -token <token>      static token    (env: GITEA_ACCESS_TOKEN / GITEA_ACCESS_TOKEN_FILE)
  -r, -read-only / -O, -tools <names> / -S, -scope <names> / -k, -insecure / -d, -debug
  ```
- **No static token is required.** It accepts `/mcp` requests fine with nothing configured, and
  supports per-request `Authorization: Bearer <token>` passthrough — verified live, `initialize`
  succeeds with zero `GITEA_ACCESS_TOKEN` set, and different Bearer tokens on different requests
  each authenticate as that token's own owner.
- **The image has no `ENTRYPOINT`, only `CMD=["/app/gitea-mcp"]`.** Kubernetes' `args:` replaces
  `CMD` wholesale — set `args:` alone and the kubelet tries to `exec` `"-transport=http"` as the
  binary itself. Crash-looped on first deploy (`OCI runtime create failed ... executable file not
  found in $PATH`, exit 128). Fix: always pair `args:` with an explicit
  `command: ["/app/gitea-mcp"]` for this image.
- **It's session-based over HTTP.** `initialize` returns an `Mcp-Session-Id` response header;
  every subsequent call on that session must resend it as a request header, or you get
  `"Invalid session ID"`.
- **`/healthz` does not exist** in v1.6.0, despite upstream docs claiming one — probed
  `/healthz`, `/health`, `/healthy`, `/`, `/ready`, all 404. Use TCP-socket probes, not HTTP,
  for liveness/readiness on this container.
- It wants to write `/tmp/gitea-mcp.log` regardless of transport — logs a (harmless) write-error
  to stdout under a read-only root filesystem otherwise. Mount an `emptyDir` at `/tmp` to keep
  `readOnlyRootFilesystem: true` clean.

**Vikunja MCP (`democratize-technology/vikunja-mcp@0.2.0`, via `supergateway`):**
- Ships no Docker image, stdio-only. `vikunja-mcp/Dockerfile` installs the npm package **at image
  build time** (`npm install -g ...`) rather than the upstream-suggested `npx -y ...` at runtime —
  not because of `POD-EGRESS-INVESTIGATION.md`'s Tekton-specific egress bug (that bug does **not**
  apply to a normal Deployment's own image pulls or a running pod's regular outbound calls — this
  was checked and corrected mid-session, don't re-cite it here), but so every pod restart runs one
  pinned, known-good version instead of re-resolving `latest` from the npm registry each time.
  Verified live with `--network none` that the built image starts cleanly with zero runtime
  network access.
- Exposes a `vikunja_auth` tool (`connect` / `status` / `refresh` / `disconnect`, taking
  `apiUrl`+`apiToken`) that a caller invokes as its first MCP call — no token needs to be baked
  into the server at all. Auth state (`AuthManager`, one instance per running Node process) lives
  entirely in-process.
- **`supergateway --stateful` is required, not optional.** By default supergateway runs
  *stateless*: no `Mcp-Session-Id` is returned at all, and — verified live — a fresh child process
  spawns per HTTP request, so a `connect()` in one request is invisible to the very next call
  (`status` came back `"Not authenticated"` right after a successful `connect` in a separate
  request). `--stateful --sessionTimeout <ms>` ties requests carrying the same `Mcp-Session-Id` to
  the same child process, so one session's auth persists across its whole tool-call sequence — the
  Dockerfile's `CMD` sets this.
- Health endpoint: `--healthEndpoint /healthz` (a supergateway flag, works as documented — unlike
  Gitea's binary above).

---

## Handy: minting a Keycloak token for *testing*, and why it's a dead end for the apps themselves ✅

Keycloak's Direct Access Grants (`password`) flow gets you a real Keycloak JWT in one call, no
browser, no redirect_uri gymnastics:

```bash
curl -sk -X POST https://keycloak.<domain>/realms/otomi/protocol/openid-connect/token \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=otomi" \
  --data-urlencode "client_secret=<from any app's *-oidc-secret Secret, e.g. vikunja-oidc-secret>" \
  --data-urlencode "username=<user>" \
  --data-urlencode "password=<password>" \
  --data-urlencode "scope=openid email profile"
```

Useful for confirming *who* a user is, or for testing Keycloak itself — `expires_in` is ~60s by
default, so use it immediately. **Do not expect this token to work against gitea-mcp or
vikunja-mcp** — see above, both reject it. This was how the rejection was proven in the first
place, not a workaround for it.

Also learned the hard way: **the raw authorization-code + redirect_uri flow, scripted by hand with
curl, is a real rabbit hole.** Vikunja's OIDC callback (`POST /api/v1/auth/openid/{provider}/
callback`) is picky about the exact `redirect_uri` used at both the original Keycloak `/auth`
request and the callback exchange, in a way that wasn't fully diagnosable from outside (two
different exact-match attempts both failed with Keycloak's generic `invalid_grant` /
`"Incorrect redirect_uri"`). If you need a real per-user session token, log in through an actual
browser instead of scripting the OAuth dance — see the `agent-browser` notes below. Don't re-open
this rabbit hole; it's not the credential path either app actually needs anyway (see the Bot
Accounts / PAT section above).

---

## `agent-browser` notes, for the next time a UI login is unavoidable ✅

Used here instead of the `claude-in-chrome` MCP tool specifically to avoid its token cost for a
long back-and-forth session. `npm i -g agent-browser && agent-browser install`; see the tool's own
`agent-browser skills get core` for the full guide. Traps hit:

- Self-signed cert: `agent-browser open <url> --ignore-https-errors`. This flag is only read when
  the daemon *starts* — `agent-browser close` first if you forgot it and the daemon's already
  running, or it's silently ignored.
- **Element refs (`@eN`) go stale fast**, especially on custom checkbox-tree / preset-button
  components built on Vue (exactly what both Gitea's and Vikunja's settings pages use). Several
  `click @eN` calls here silently no-op'd — the ref resolved to *something*, produced `✓ Done`, but
  the target element's state never changed, and only a screenshot revealed nothing had happened.
  Two fixes that actually worked:
  1. Get the ref and click it in the same breath — no intervening `scroll`/`scrollintoview`/other
     action between snapshot and click, which appears to be what invalidates refs on this kind of
     page.
  2. When that still doesn't hold, drop to `agent-browser eval '<js>'` and interact with the DOM
     directly (`[...document.querySelectorAll("button")].find(b => b.textContent.trim() ===
     "...")`.click()`). This was categorically more reliable than the ref system for this app's
     UI. `eval` runs in a shared page-global scope across separate calls — wrap each script in an
     IIFE (`(function(){ ... })()`) or `const`/`let` redeclaration errors kill the call.
  3. Visible button text is not always what's in the DOM — Vikunja's UI renders "TOKEN ERSTELLEN"
     via CSS `text-transform: uppercase`; the actual `textContent` is `"Token erstellen"`. Matching
     visible (rendered) text against DOM text will silently fail to find the element. Check via
     `eval` (`[...document.querySelectorAll("button")].map(b=>b.textContent.trim())`) before
     assuming a `find text "..."` selector is wrong.
- A logged-in Keycloak SSO session persists across apps within the same browser context — logging
  into Vikunja after already having authenticated to Gitea in the same session skipped the
  Keycloak login form entirely (redirected straight back with a valid session). It does **not**
  persist across `agent-browser close` / reopen (fresh browser context = fresh cookies), so budget
  one login per new browser session, not per app.
- An authenticated app's own frontend token is retrievable straight from the page:
  `agent-browser eval '(function(){return localStorage.getItem("token")})()'` for Vikunja (its SPA
  stores its own post-login JWT there). Gitea's web session is an httpOnly cookie instead — nothing
  to read out of `localStorage` for it, which is exactly why the PAT route is the only option for
  Gitea specifically.

---

## Not done — the real next step ⬜

**Wiring Turnstone itself to these servers.** Out of scope for this pass on purpose — no MCP
client/catalog config surface was found anywhere in `charts/turnstone` or `TURNSTONE.md` before
this work started (only an incidental comment noting the agent can spawn local npx-based MCP
subprocesses).

Turnstone's own "Add MCP server" UI (seen directly, not yet explored hands-on) exposes a
**multitenant authorization** setting with three modes — this maps cleanly onto everything learned
above:

- **No authorization** — not useful here; both servers need *some* credential for anything beyond
  `initialize`.
- **Static headers, single shared identity** — exactly the Bot Account / PAT pattern proven in
  this doc. One credential, attributed to one identity (a bot, or a PAT-holding human), used for
  every call regardless of which Turnstone user triggered it.
- **Per-user OAuth 2.1, "sign-in passthrough uses your org login — no separate connect"** — this is
  the interesting one, and likely the actual answer to "log into Turnstone via Keycloak and have
  it act on my behalf." **It would not use Keycloak directly** — we've proven Keycloak tokens don't
  work against either app. It would only work if `gitea-mcp` and/or Vikunja itself expose their
  *own* OAuth 2.1 authorization-server metadata (per the MCP spec's authorization extension) for
  Turnstone to discover and drive automatically. Both apps **can** act as their own OAuth
  providers in principle (Gitea has a documented "OAuth2 Provider" mode for third-party apps;
  Vikunja "can act as an OAuth 2.0 Authorization Server" with mandatory PKCE, S256) — but whether
  `gitea-mcp` surfaces that through MCP's OAuth flow, and whether it's worth enabling on Vikunja's
  side for this, has not been checked. That's the real next investigation, not a config tweak.
