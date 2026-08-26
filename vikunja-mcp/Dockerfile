# democratize-technology/vikunja-mcp (the most-starred Vikunja MCP server) is npm-only and
# stdio-only, so it's wrapped in supergateway to speak HTTP. supergateway's own README shows
# fronting it with `npx -y ...` at runtime; the package is installed here at build time instead
# so every pod start uses one pinned, known-good version rather than re-resolving `latest` from
# the npm registry on every restart.
FROM supercorp/supergateway:latest

RUN npm install -g @democratize-technology/vikunja-mcp@0.2.0

CMD ["--stdio", "vikunja-mcp", "--outputTransport", "streamableHttp", "--port", "8090", "--healthEndpoint", "/healthz"]
