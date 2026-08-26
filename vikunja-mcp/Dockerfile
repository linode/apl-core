# democratize-technology/vikunja-mcp (the most-starred Vikunja MCP server) is npm-only and
# stdio-only, so it's wrapped in supergateway to speak HTTP. supergateway's own README shows
# fronting it with `npx -y ...` at runtime; both packages are installed here at build time instead
# so every pod start uses one pinned, known-good version rather than re-resolving `latest` from
# the npm registry on every restart.
#
# Built from a plain node image, NOT `FROM supercorp/supergateway:latest`: that image ships with
# supergateway's node_modules already baked in from whenever supercorp last published it, and its
# own package.json range for @modelcontextprotocol/sdk (^1.18.2) had resolved to 1.19.1 at that
# bake time -- a version whose bundled StreamableHTTPServerTransport only accepts protocol
# versions up to 2025-06-18. vikunja-mcp's OWN sdk dependency (installed fresh here, always
# resolves to current latest, 1.30.0+) supports 2025-11-25 and echoes back whatever
# protocolVersion the client sent in `initialize` without validating it against its own supported
# list. Turnstone's MCP client requests 2025-11-25 (the current spec version); the stale
# supergateway sdk in the base image would accept that echoed value during `initialize` and then
# reject every subsequent request with 400 "Unsupported protocol version" -- verified live via a
# direct curl probe against the running pod, reproducing the exact 400 body. Installing
# supergateway from npm at OUR build time (not inheriting a pre-baked image) resolves its sdk
# dependency the same way vikunja-mcp's own install does, closing the gap between the two.
FROM node:22-slim

RUN npm install -g \
    supergateway@3.4.3 \
    @democratize-technology/vikunja-mcp@0.2.0

# --stateful is required, not optional: vikunja_auth.connect's session lives in the child
# process's memory (AuthManager, one instance per process). Without --stateful, supergateway's
# default stateless mode spawns a fresh child (and therefore a fresh, unauthenticated
# AuthManager) for every single HTTP request, so a connect() in one request is invisible to the
# very next tool call -- verified live: a separate `status` request came back "Not authenticated"
# right after a successful `connect`. --stateful ties subsequent requests carrying the same
# Mcp-Session-Id to the same child process instead, so one agent session's auth persists across
# its whole tool-call sequence. --sessionTimeout bounds how long an idle session's child process
# (and its Vikunja credential) stays resident.
ENTRYPOINT ["supergateway"]
CMD ["--stdio", "vikunja-mcp", "--outputTransport", "streamableHttp", "--port", "8090", "--healthEndpoint", "/healthz", "--stateful", "--sessionTimeout", "1800000"]
