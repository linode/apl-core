# democratize-technology/vikunja-mcp (the most-starred Vikunja MCP server) is npm-only and
# stdio-only, so it's wrapped in supergateway to speak HTTP. supergateway's own README shows
# fronting it with `npx -y ...` at runtime; the package is installed here at build time instead
# so every pod start uses one pinned, known-good version rather than re-resolving `latest` from
# the npm registry on every restart.
FROM supercorp/supergateway:latest

RUN npm install -g @democratize-technology/vikunja-mcp@0.2.0

# --stateful is required, not optional: vikunja_auth.connect's session lives in the child
# process's memory (AuthManager, one instance per process). Without --stateful, supergateway's
# default stateless mode spawns a fresh child (and therefore a fresh, unauthenticated
# AuthManager) for every single HTTP request, so a connect() in one request is invisible to the
# very next tool call -- verified live: a separate `status` request came back "Not authenticated"
# right after a successful `connect`. --stateful ties subsequent requests carrying the same
# Mcp-Session-Id to the same child process instead, so one agent session's auth persists across
# its whole tool-call sequence. --sessionTimeout bounds how long an idle session's child process
# (and its Vikunja credential) stays resident.
CMD ["--stdio", "vikunja-mcp", "--outputTransport", "streamableHttp", "--port", "8090", "--healthEndpoint", "/healthz", "--stateful", "--sessionTimeout", "1800000"]
