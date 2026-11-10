{{/*
gateway fullname
*/}}
{{- define "loki.gatewayFullname" -}}
{{ include "loki.fullname" . }}-gateway
{{- end }}

{{/*
gateway common labels
*/}}
{{- define "loki.gatewayLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: gateway
{{- end }}

{{/*
gateway selector labels
*/}}
{{- define "loki.gatewaySelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: gateway
{{- end }}

{{/*
gateway auth secret name
*/}}
{{- define "loki.gatewayAuthSecret" -}}
{{ .Values.gateway.basicAuth.existingSecret | default (include "loki.gatewayFullname" . ) }}
{{- end }}

{{/*
gateway priority class name
*/}}
{{- define "loki.gatewayPriorityClassName" -}}
{{- $pcn := coalesce .Values.gateway.priorityClassName .Values.defaults.priorityClassName .Values.global.priorityClassName -}}
{{- if $pcn }}
priorityClassName: {{ $pcn }}
{{- end }}
{{- end }}

{{/* Resolve the upstream URL for a logical gateway target in every deployment mode. */}}
{{- define "loki.gatewayBackendUrl" -}}
{{- $ctx := .ctx -}}
{{- $target := .target -}}
{{- $namespace := include "loki.namespace" $ctx -}}
{{- $schema := $ctx.Values.gateway.nginxConfig.schema -}}
{{- $port := $ctx.Values.loki.server.http_listen_port | toString -}}
{{- $host := include "loki.resourceName" (dict "ctx" $ctx "component" $target) -}}
{{- $url := printf "%s://%s.%s.svc.%s:%s" $schema $host $namespace $ctx.Values.global.clusterDomain $port -}}
{{- if eq (include "loki.deployment.isMonolithic" $ctx) "true" -}}
  {{- $host = include "loki.fullname" $ctx -}}
  {{- $url = printf "%s://%s.%s.svc.%s:%s" $schema $host $namespace $ctx.Values.global.clusterDomain $port -}}
{{- else if eq (include "loki.deployment.isScalable" $ctx) "true" -}}
  {{- if has $target (list "distributor" "ingester") -}}
    {{- $host = include "loki.resourceName" (dict "ctx" $ctx "component" "write") -}}
    {{- $url = printf "%s://%s.%s.svc.%s:%s" $schema $host $namespace $ctx.Values.global.clusterDomain $port -}}
    {{- with $ctx.Values.gateway.nginxConfig.customWriteUrl -}}
      {{- $url = . -}}
    {{- end -}}
  {{- else if has $target (list "query-frontend" "querier") -}}
    {{- $host = include "loki.resourceName" (dict "ctx" $ctx "component" "read") -}}
    {{- $url = printf "%s://%s.%s.svc.%s:%s" $schema $host $namespace $ctx.Values.global.clusterDomain $port -}}
    {{- with $ctx.Values.gateway.nginxConfig.customReadUrl -}}
      {{- $url = . -}}
    {{- end -}}
  {{- else -}}
    {{- $host = include "loki.resourceName" (dict "ctx" $ctx "component" "backend") -}}
    {{- $url = printf "%s://%s.%s.svc.%s:%s" $schema $host $namespace $ctx.Values.global.clusterDomain $port -}}
    {{- with $ctx.Values.gateway.nginxConfig.customBackendUrl -}}
      {{- $url = . -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- $url -}}
{{- end }}

{{/* Render one Envoy identity-to-tenant Lua table body. */}}
{{- define "loki.gatewayEnvoyLuaMap" -}}
{{- $ctx := .ctx -}}
{{- $attribute := .attribute -}}
{{- $seen := dict -}}
{{- range $tenant := $ctx.Values.loki.tenants -}}
  {{- $tenantName := required "All tenants must have a 'name' set" $tenant.name -}}
  {{- if regexMatch "[\r\n]" $tenantName -}}
    {{- fail "Tenant names must not contain newlines" -}}
  {{- end -}}
  {{- $configured := get $tenant $attribute | default (list) -}}
  {{- $identities := list -}}
  {{- if kindIs "slice" $configured -}}
    {{- $identities = $configured -}}
  {{- else if $configured -}}
    {{- $identities = list $configured -}}
  {{- end -}}
  {{- range $identity := $identities -}}
    {{- if not (kindIs "string" $identity) -}}
      {{- fail (printf "Tenant identity %s must be a string" $attribute) -}}
    {{- end -}}
    {{- if eq $attribute "jwtSubClaim" -}}
      {{- $identity = tpl $identity $ctx -}}
    {{- end -}}
    {{- if not $identity -}}
      {{- fail (printf "Tenant identity %s must not be empty" $attribute) -}}
    {{- end -}}
    {{- if regexMatch "[\r\n]" $identity -}}
      {{- fail (printf "Tenant identity %s must not contain newlines" $attribute) -}}
    {{- end -}}
    {{- if hasKey $seen $identity -}}
      {{- if ne (get $seen $identity) $tenantName -}}
        {{- fail (printf "Tenant identity %q from %s maps to more than one tenant" $identity $attribute) -}}
      {{- end -}}
    {{- else -}}
      {{- $_ := set $seen $identity $tenantName -}}
{{ printf "[%s] = %s,\n" (quote $identity) (quote $tenantName) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- end }}

{{/* Render Envoy Basic Auth username-to-tenant Lua table entries. */}}
{{- define "loki.gatewayEnvoyBasicAuthLuaMap" -}}
{{- $seen := dict -}}
{{- range $tenant := .Values.loki.tenants -}}
  {{- $tenantName := required "All tenants must have a 'name' set" $tenant.name -}}
  {{- /* A tenant with another Envoy identity is reachable through Basic Auth only when it also carries a Basic credential. */ -}}
  {{- if or $tenant.password $tenant.passwordHash (not (or $tenant.jwtSubClaim $tenant.clientCertificateCN)) -}}
  {{- $identity := $tenant.basicAuthUsername | default $tenantName -}}
  {{- if regexMatch "[:\r\n]" $identity -}}
    {{- fail (printf "Envoy Basic Auth username %q must not contain colons or newlines" $identity) -}}
  {{- end -}}
  {{- if regexMatch "[\r\n]" $tenantName -}}
    {{- fail "Envoy Basic Auth tenant names must not contain newlines" -}}
  {{- end -}}
  {{- if hasKey $seen $identity -}}
    {{- if ne (get $seen $identity) $tenantName -}}
      {{- fail (printf "Tenant identity %q from basicAuthUsername maps to more than one tenant" $identity) -}}
    {{- end -}}
  {{- else -}}
    {{- $_ := set $seen $identity $tenantName -}}
{{ printf "[%s] = %s,\n" (quote $identity) (quote $tenantName) -}}
  {{- end -}}
  {{- end -}}
{{- end -}}
{{- end }}

{{/*
Render Envoy's {SHA} htpasswd value from a plaintext password.

Sprig's sha1sum returns a hexadecimal digest, while Envoy expects the Base64
encoding of the raw 20-byte SHA-1 digest. Helm does not expose a hex-decoding
function, so encode the digest with the template arithmetic primitives.
*/}}
{{- define "loki.gatewayEnvoySHA1" -}}
{{- $hexDigest := sha1sum . -}}
{{- $nibbles := dict "0" 0 "1" 1 "2" 2 "3" 3 "4" 4 "5" 5 "6" 6 "7" 7 "8" 8 "9" 9 "a" 10 "b" 11 "c" 12 "d" 13 "e" 14 "f" 15 -}}
{{- $base64 := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/" -}}
{{- $encoded := "" -}}
{{- range $byteOffset := untilStep 0 18 3 -}}
  {{- $hexOffset := mul $byteOffset 2 -}}
  {{- $byte1 := add (mul 16 (get $nibbles (printf "%c" (index $hexDigest $hexOffset)))) (get $nibbles (printf "%c" (index $hexDigest (add $hexOffset 1)))) -}}
  {{- $byte2Offset := add $hexOffset 2 -}}
  {{- $byte2 := add (mul 16 (get $nibbles (printf "%c" (index $hexDigest $byte2Offset)))) (get $nibbles (printf "%c" (index $hexDigest (add $byte2Offset 1)))) -}}
  {{- $byte3Offset := add $hexOffset 4 -}}
  {{- $byte3 := add (mul 16 (get $nibbles (printf "%c" (index $hexDigest $byte3Offset)))) (get $nibbles (printf "%c" (index $hexDigest (add $byte3Offset 1)))) -}}
  {{- $encoded = printf "%s%c%c%c%c" $encoded (index $base64 (div $byte1 4)) (index $base64 (add (mul (mod $byte1 4) 16) (div $byte2 16))) (index $base64 (add (mul (mod $byte2 16) 4) (div $byte3 64))) (index $base64 (mod $byte3 64)) -}}
{{- end -}}
{{- $byte1 := add (mul 16 (get $nibbles (printf "%c" (index $hexDigest 36)))) (get $nibbles (printf "%c" (index $hexDigest 37))) -}}
{{- $byte2 := add (mul 16 (get $nibbles (printf "%c" (index $hexDigest 38)))) (get $nibbles (printf "%c" (index $hexDigest 39))) -}}
{{- $encoded = printf "%s%c%c%c=" $encoded (index $base64 (div $byte1 4)) (index $base64 (add (mul (mod $byte1 4) 16) (div $byte2 16))) (index $base64 (mul (mod $byte2 16) 4)) -}}
{{- printf "{SHA}%s" $encoded -}}
{{- end }}

{{/* Render one Envoy Loki upstream cluster from a URL. */}}
{{- define "loki.gatewayEnvoyCluster" -}}
{{- $ctx := .ctx -}}
{{- $name := .name -}}
{{- $parsedUrl := urlParse .url -}}
{{- if not (has (get $parsedUrl "path") (list "" "/")) -}}
  {{- fail (printf "Envoy gateway upstream URL %q must not contain a path" .url) -}}
{{- end -}}
{{- $scheme := get $parsedUrl "scheme" -}}
{{- $authority := get $parsedUrl "host" -}}
{{- $hostname := get $parsedUrl "hostname" -}}
{{- $sanType := ternary "IP_ADDRESS" "DNS" (or (regexMatch "^[0-9]+(\\.[0-9]+){3}$" $hostname) (contains ":" $hostname)) -}}
{{- if not (has $scheme (list "http" "https")) -}}
  {{- fail (printf "Envoy gateway upstream URL %q must use http or https" .url) -}}
{{- end -}}
{{- $port := ternary 443 80 (eq $scheme "https") -}}
{{- with regexFind ":[0-9]+$" $authority -}}
  {{- $port = trimPrefix ":" . | int -}}
{{- end -}}
{{ printf "  - name: %s" $name }}
    type: STRICT_DNS
    connect_timeout: {{ $ctx.Values.gateway.envoyConfig.connectTimeout }}
    dns_lookup_family: AUTO
    load_assignment:
      cluster_name: {{ $name }}
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: {{ $hostname | quote }}
                    port_value: {{ $port }}
    {{- if $ctx.Values.gateway.envoyConfig.tcpKeepAlive }}
    upstream_connection_options:
      tcp_keepalive: {}
    {{- end }}
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        common_http_protocol_options:
          idle_timeout: {{ $ctx.Values.gateway.envoyConfig.streamIdleTimeout }}
        explicit_http_config:
          {{- if and $ctx.Values.gateway.envoyConfig.upstreamHTTP2 (not .websocket) }}
          http2_protocol_options: {}
          {{- else }}
          http_protocol_options: {}
          {{- end }}
    {{- if eq $scheme "https" }}
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        sni: {{ $hostname | quote }}
        common_tls_context:
          validation_context:
            {{- if $ctx.Values.gateway.envoyConfig.upstreamTLS.insecureSkipVerify }}
            trust_chain_verification: ACCEPT_UNTRUSTED
            {{- else }}
            trusted_ca:
              filename: {{ required "gateway.envoyConfig.upstreamTLS.caCertificateFile is required for HTTPS Loki upstreams" $ctx.Values.gateway.envoyConfig.upstreamTLS.caCertificateFile | quote }}
            match_typed_subject_alt_names:
              - san_type: {{ $sanType }}
                matcher:
                  exact: {{ $hostname | quote }}
            {{- end }}
    {{- end }}
{{- end }}

{{/* Render the remote JWKS URI; the value is passed through tpl. */}}
{{- define "loki.gatewayEnvoyJwksUri" -}}
{{- tpl (required "gateway.envoyConfig.jwt.remoteJwks.uri is required when Envoy JWT verification is enabled" .Values.gateway.envoyConfig.jwt.remoteJwks.uri) . -}}
{{- end }}

{{/* Resolve the port used by the remote JWKS endpoint. */}}
{{- define "loki.gatewayEnvoyJwksPort" -}}
{{- $uri := include "loki.gatewayEnvoyJwksUri" . -}}
{{- $parsedUrl := urlParse $uri -}}
{{- $scheme := get $parsedUrl "scheme" -}}
{{- if not (has $scheme (list "http" "https")) -}}
  {{- fail "gateway.envoyConfig.jwt.remoteJwks.uri must use http or https" -}}
{{- end -}}
{{- $port := ternary 443 80 (eq $scheme "https") -}}
{{- with regexFind ":[0-9]+$" (get $parsedUrl "host") -}}
  {{- $port = trimPrefix ":" . | int -}}
{{- end -}}
{{- $port -}}
{{- end }}

{{/* Render the remote JWKS cluster. JWT signing keys are never read from a mounted file. */}}
{{- define "loki.gatewayEnvoyJwksCluster" -}}
{{- $uri := include "loki.gatewayEnvoyJwksUri" . -}}
{{- $parsedUrl := urlParse $uri -}}
{{- $scheme := get $parsedUrl "scheme" -}}
{{- $hostname := get $parsedUrl "hostname" -}}
{{- /* TLS names never carry the trailing dot of an absolute DNS name. */ -}}
{{- $tlsHostname := trimSuffix "." $hostname -}}
{{- $port := include "loki.gatewayEnvoyJwksPort" . -}}
{{ printf "  - name: jwt_jwks" }}
    type: STRICT_DNS
    connect_timeout: {{ .Values.gateway.envoyConfig.connectTimeout }}
    dns_lookup_family: AUTO
    load_assignment:
      cluster_name: jwt_jwks
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: {{ $hostname | quote }}
                    port_value: {{ $port }}
    {{- if eq $scheme "https" }}
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        sni: {{ $tlsHostname | quote }}
        common_tls_context:
          validation_context:
            trusted_ca:
              filename: {{ .Values.gateway.envoyConfig.jwt.remoteJwks.caCertificateFile | quote }}
            match_typed_subject_alt_names:
              - san_type: {{ ternary "IP_ADDRESS" "DNS" (or (regexMatch "^[0-9]+(\\.[0-9]+){3}$" $tlsHostname) (contains ":" $tlsHostname)) }}
                matcher:
                  exact: {{ $tlsHostname | quote }}
    {{- end }}
{{- end }}

{{/*
Bearer token file used to authenticate remote JWKS requests. Empty when JWT verification is
disabled or gateway.envoyConfig.jwt.remoteJwks.bearerTokenFile is unset.
*/}}
{{- define "loki.gatewayEnvoyJwksBearerTokenFile" -}}
{{- if .Values.gateway.envoyConfig.jwt.enabled -}}
{{- .Values.gateway.envoyConfig.jwt.remoteJwks.bearerTokenFile | default "" -}}
{{- end -}}
{{- end }}

{{/* Chart-managed projected ServiceAccount token path for remote JWKS requests. */}}
{{- define "loki.gatewayEnvoyJwksProjectedTokenFile" -}}
/etc/envoy/kubernetes/token
{{- end }}

{{/* ConfigMap key holding the SDS resource that exposes the JWKS bearer token to Envoy. */}}
{{- define "loki.gatewayEnvoyJwksCredentialSdsFile" -}}
jwks-credential-sds.yaml
{{- end }}

{{/*
Render the loopback listener that injects the bearer token into remote JWKS requests.
jwt_authn cannot attach credentials itself, so its requests are routed through this listener,
where the credential injector adds the Authorization header read from the SDS generic secret
before the request leaves through the jwt_jwks cluster. A loopback TCP listener is used instead
of an Envoy internal listener because the asynchronous JWKS fetch runs on the main thread, which
cannot reach internal listeners.
*/}}
{{- define "loki.gatewayEnvoyJwksCredentialListener" -}}
{{- $port := include "loki.gatewayEnvoyJwksCredentialInjectorPort" . -}}
{{ printf "    - name: jwt_jwks_credential_injector" }}
      address:
        socket_address:
          address: 127.0.0.1
          port_value: {{ $port }}
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: jwt_jwks_credential_injector
                codec_type: AUTO
                route_config:
                  name: jwt_jwks_credential_injector
                  virtual_hosts:
                    - name: jwt_jwks
                      domains: ["*"]
                      routes:
                        - match:
                            path: {{ (urlParse (include "loki.gatewayEnvoyJwksUri" .)).path | quote }}
                          route:
                            cluster: jwt_jwks
                            timeout: {{ .Values.gateway.envoyConfig.jwt.remoteJwks.requestTimeout }}
                http_filters:
                  - name: envoy.filters.http.credential_injector
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.credential_injector.v3.CredentialInjector
                      overwrite: true
                      credential:
                        name: envoy.http.injected_credentials.generic
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.http.injected_credentials.generic.v3.Generic
                          header: Authorization
                          header_value_prefix: "Bearer "
                          credential:
                            name: jwt_jwks_bearer_token
                            sds_config:
                              resource_api_version: V3
                              path_config_source:
                                path: /etc/envoy/{{ include "loki.gatewayEnvoyJwksCredentialSdsFile" . }}
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
{{- end }}

{{/* Loopback port of the credential-injecting listener; must not clash with the other listeners. */}}
{{- define "loki.gatewayEnvoyJwksCredentialInjectorPort" -}}
{{- $port := int .Values.gateway.envoyConfig.jwt.remoteJwks.credentialInjectorPort -}}
{{- if has $port (list (int .Values.gateway.containerPort) (int .Values.gateway.envoyConfig.adminPort)) -}}
  {{- fail "gateway.envoyConfig.jwt.remoteJwks.credentialInjectorPort must differ from gateway.containerPort and gateway.envoyConfig.adminPort" -}}
{{- end -}}
{{- $port -}}
{{- end }}

{{/* Render the cluster that jwt_authn uses to reach the credential-injecting loopback listener. */}}
{{- define "loki.gatewayEnvoyJwksCredentialCluster" -}}
{{ printf "  - name: jwt_jwks_credential_injector" }}
    type: STATIC
    connect_timeout: {{ .Values.gateway.envoyConfig.connectTimeout }}
    load_assignment:
      cluster_name: jwt_jwks_credential_injector
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: {{ include "loki.gatewayEnvoyJwksCredentialInjectorPort" . }}
{{- end }}

{{/* SDS resource file that exposes the JWKS bearer token file as a generic secret. */}}
{{- define "loki.gatewayEnvoyJwksCredentialSds" -}}
resources:
  - "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.Secret
    name: jwt_jwks_bearer_token
    generic_secret:
      secret:
        filename: {{ include "loki.gatewayEnvoyJwksBearerTokenFile" . | quote }}
{{- end }}

{{/* Generated Envoy configuration used by the opt-in gateway implementation. */}}
{{- define "loki.envoyFile" -}}
{{- $hasClientCertificateTenant := false -}}
{{- $hasJWTTenant := false -}}
{{- range $tenant := .Values.loki.tenants -}}
  {{- if $tenant.clientCertificateCN -}}
    {{- $hasClientCertificateTenant = true -}}
  {{- end -}}
  {{- if $tenant.jwtSubClaim -}}
    {{- $hasJWTTenant = true -}}
  {{- end -}}
{{- end -}}
{{- if and $hasClientCertificateTenant (not .Values.gateway.envoyConfig.tls.enabled) -}}
  {{- fail "gateway.envoyConfig.tls.enabled must be true when a tenant defines clientCertificateCN" -}}
{{- end -}}
{{- if and $hasJWTTenant (not .Values.gateway.envoyConfig.jwt.enabled) -}}
  {{- fail "gateway.envoyConfig.jwt.enabled must be true when a tenant defines jwtSubClaim" -}}
{{- end -}}
{{- if .Values.gateway.envoyConfig.tls.enabled -}}
  {{- $_ := required "gateway.envoyConfig.tls.existingSecret is required when Envoy TLS is enabled" .Values.gateway.envoyConfig.tls.existingSecret -}}
{{- end -}}
{{- if .Values.gateway.envoyConfig.jwt.enabled -}}
  {{- $_ := required "gateway.envoyConfig.jwt.issuer is required when Envoy JWT verification is enabled" .Values.gateway.envoyConfig.jwt.issuer -}}
  {{- $_ := include "loki.gatewayEnvoyJwksUri" . -}}
{{- end -}}
{{- if and .Values.gateway.basicAuth.enabled .Values.loki.tenants (not .Values.gateway.basicAuth.existingSecret) -}}
  {{- $hasBasicCredential := false -}}
  {{- range $tenant := .Values.loki.tenants -}}
    {{- if or $tenant.password $tenant.passwordHash -}}
      {{- $hasBasicCredential = true -}}
    {{- end -}}
  {{- end -}}
  {{- if not $hasBasicCredential -}}
    {{- fail "gateway.basicAuth.enabled is true but no tenant in loki.tenants sets password or passwordHash; the Envoy Basic Auth filter cannot start with an empty htpasswd file. Disable gateway.basicAuth or give a tenant a Basic credential." -}}
  {{- end -}}
{{- end -}}
{{- $authActive := or .Values.gateway.basicAuth.enabled (or $hasClientCertificateTenant $hasJWTTenant) -}}
{{- /* Tenant mapping overwrites X-Scope-OrgID only when loki.tenants is configured; a single Basic Auth user leaves the client header alone like NGINX. */ -}}
{{- $tenantMappingActive := and $authActive (not (empty .Values.loki.tenants)) -}}
{{- $jwksBearerTokenFile := include "loki.gatewayEnvoyJwksBearerTokenFile" . -}}
{{- $distributorUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "distributor") -}}
{{- $ingesterUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "ingester") -}}
{{- $rulerUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "ruler") -}}
{{- $compactorUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "compactor") -}}
{{- $indexGatewayUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "index-gateway") -}}
{{- $querySchedulerUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "query-scheduler") -}}
{{- $queryFrontendUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "query-frontend") -}}
{{- $querierUrl := include "loki.gatewayBackendUrl" (dict "ctx" . "target" "querier") -}}
{{- if $jwksBearerTokenFile }}
# SDS requires a node identity even when the secret is read from a local file.
node:
  id: {{ include "loki.gatewayFullname" . }}
  cluster: {{ include "loki.gatewayFullname" . }}
{{- end }}
overload_manager:
  resource_monitors:
    - name: envoy.resource_monitors.global_downstream_max_connections
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.resource_monitors.downstream_connections.v3.DownstreamConnectionsConfig
        # Envoy recommends an effectively unlimited value to suppress the no-limit startup warning.
        max_active_downstream_connections: 2000000000
static_resources:
  listeners:
    - name: loki
      address:
        socket_address:
          address: {{ ternary "::" "0.0.0.0" .Values.gateway.envoyConfig.enableIPv6 | quote }}
          port_value: {{ .Values.gateway.containerPort }}
          {{- if .Values.gateway.envoyConfig.enableIPv6 }}
          ipv4_compat: true
          {{- end }}
      {{- if .Values.gateway.envoyConfig.tcpKeepAlive }}
      socket_options:
        - description: Enable TCP keep-alive
          level: 1
          name: 9
          int_value: 1
          state: STATE_PREBIND
      {{- end }}
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: loki_gateway
                codec_type: AUTO
                {{- if $tenantMappingActive }}
                early_header_mutation_extensions:
                  - name: envoy.http.early_header_mutation.header_mutation
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.http.early_header_mutation.header_mutation.v3.HeaderMutation
                      mutations:
                        - remove: x-scope-orgid
                {{- end }}
                stream_idle_timeout: {{ .Values.gateway.envoyConfig.streamIdleTimeout }}
                use_remote_address: true
                normalize_path: true
                merge_slashes: true
                path_with_escaped_slashes_action: KEEP_UNCHANGED
                upgrade_configs:
                  - upgrade_type: websocket
                access_log:
                  - name: envoy.access_loggers.stdout
                    filter:
                      {{- if .Values.gateway.verboseLogging }}
                      header_filter:
                        header:
                          name: ":path"
                          string_match:
                            safe_regex:
                              regex: ^/livez(?:\?.*)?$
                          invert_match: true
                      {{- else }}
                      status_code_filter:
                        comparison:
                          op: GE
                          value:
                            default_value: 400
                            runtime_key: access_log_min_status
                      {{- end }}
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
                      log_format:
                        text_format_source:
                          inline_string: {{ .Values.gateway.envoyConfig.logFormat | quote }}
                route_config:
                  name: loki_routes
                  request_headers_to_remove:
                    - authorization
                  request_headers_to_add:
                    - header:
                        key: x-query-tags
                        value: "%DYNAMIC_METADATA(loki.query_tags:base)%,user=%REQ(x-grafana-user)%,dashboard_id=%REQ(x-dashboard-uid)%,dashboard_title=%REQ(x-dashboard-title)%,panel_id=%REQ(x-panel-id)%,panel_title=%REQ(x-panel-title)%,source_rule_uid=%REQ(x-rule-uid)%,rule_name=%REQ(x-rule-name)%,rule_folder=%REQ(x-rule-folder)%,rule_version=%REQ(x-rule-version)%,rule_source=%REQ(x-rule-source)%,rule_type=%REQ(x-rule-type)%"
                      append_action: OVERWRITE_IF_EXISTS_OR_ADD
                  response_headers_to_remove:
                    - server
                  virtual_hosts:
                    - name: loki
                      domains: ["*"]
                      routes:
                        {{- /* "/" and "/livez" answer 200 without authentication, like the NGINX gateway. */}}
                        {{- range $unauthenticatedPath := list "/livez" "/" }}
                        - match:
                            path: {{ $unauthenticatedPath }}
                          direct_response:
                            status: 200
                            body:
                              inline_string: OK
                          typed_per_filter_config:
                            {{- if $.Values.gateway.envoyConfig.jwt.enabled }}
                            envoy.filters.http.jwt_authn:
                              "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.PerRouteConfig
                              disabled: true
                            {{- end }}
                            {{- if $.Values.gateway.basicAuth.enabled }}
                            envoy.filters.http.basic_auth:
                              "@type": type.googleapis.com/envoy.config.route.v3.FilterConfig
                              disabled: true
                            {{- end }}
                            envoy.filters.http.lua.tenant:
                              "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.LuaPerRoute
                              disabled: true
                        {{- end }}
                        {{- if .Values.loki.ui.gateway.enabled }}
                        - match:
                            prefix: /ui
                          route:
                            cluster: querier
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        {{- end }}
                        - match:
                            safe_regex:
                              regex: ^/(api/prom/push|loki/api/v1/push|distributor/ring|otlp/v1/logs)$
                          route:
                            cluster: distributor
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            safe_regex:
                              regex: ^/(flush|ring|memberlist|config)$
                          route:
                            cluster: ingester
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            prefix: /ingester/
                          route:
                            cluster: ingester
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            safe_regex:
                              regex: ^/(ruler/ring|api/prom/rules|loki/api/v1/rules|prometheus/api/v1/alerts|prometheus/api/v1/rules)$
                          route:
                            cluster: ruler
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            safe_regex:
                              regex: ^/(api/prom/rules/|loki/api/v1/rules/).*$
                          route:
                            cluster: ruler
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            safe_regex:
                              regex: ^/(compactor/ring|loki/api/v1/delete|loki/api/v1/cache/generation_numbers)$
                          route:
                            cluster: compactor
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            path: /indexgateway/ring
                          route:
                            cluster: index_gateway
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            path: /scheduler/ring
                          route:
                            cluster: query_scheduler
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            safe_regex:
                              regex: ^/(api/prom/tail|loki/api/v1/tail)$
                          route:
                            cluster: query_frontend_websocket
                            timeout: 0s
                        - match:
                            safe_regex:
                              regex: ^/(api/prom/|loki/api/v1/).*$
                          route:
                            cluster: query_frontend
                            timeout: {{ .Values.gateway.envoyConfig.requestTimeout }}
                        - match:
                            prefix: /
                          direct_response:
                            status: 404
                http_filters:
                  - name: envoy.filters.http.header_to_metadata
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.header_to_metadata.v3.Config
                      request_rules:
                        - header: x-query-tags
                          on_header_present:
                            metadata_namespace: loki.query_tags
                            key: base
                            type: STRING
                            regex_value_rewrite:
                              pattern:
                                regex: ^$
                              substitution: noop=
                          on_header_missing:
                            metadata_namespace: loki.query_tags
                            key: base
                            value: noop=
                            type: STRING
                          remove: false
                  {{- if .Values.gateway.envoyConfig.jwt.enabled }}
                  - name: envoy.filters.http.jwt_authn
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                      providers:
                        loki:
                          issuer: {{ tpl .Values.gateway.envoyConfig.jwt.issuer $ | quote }}
                          {{- with .Values.gateway.envoyConfig.jwt.audiences }}
                          audiences:
                            {{- tpl (toYaml .) $ | nindent 28 }}
                          {{- end }}
                          from_headers:
                            - name: Authorization
                              value_prefix: "Bearer "
                          remote_jwks:
                            http_uri:
                              uri: {{ include "loki.gatewayEnvoyJwksUri" $ | quote }}
                              cluster: {{ ternary "jwt_jwks_credential_injector" "jwt_jwks" (ne $jwksBearerTokenFile "") }}
                              timeout: {{ .Values.gateway.envoyConfig.jwt.remoteJwks.requestTimeout }}
                            {{- if gt (int .Values.gateway.envoyConfig.jwt.remoteJwks.retries) 0 }}
                            retry_policy:
                              num_retries: {{ int .Values.gateway.envoyConfig.jwt.remoteJwks.retries }}
                              retry_back_off:
                                base_interval: 0.1s
                                max_interval: 1s
                            {{- end }}
                            cache_duration: {{ .Values.gateway.envoyConfig.jwt.remoteJwks.cacheDuration }}
                            {{- if .Values.gateway.envoyConfig.jwt.remoteJwks.asyncFetch }}
                            async_fetch: {}
                            {{- end }}
                          payload_in_metadata: jwt_payload
                      rules:
                        - match:
                            prefix: /
                          requires:
                            requires_any:
                              requirements:
                                - provider_name: loki
                                - allow_missing: {}
                  {{- end }}
                  {{- if .Values.gateway.basicAuth.enabled }}
                  - name: envoy.filters.http.basic_auth
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.basic_auth.v3.BasicAuth
                      users:
                        filename: /etc/envoy/secrets/.htpasswd
                      allow_missing: {{ or $hasClientCertificateTenant $hasJWTTenant }}
                      emit_dynamic_metadata: true
                  {{- end }}
                  - name: envoy.filters.http.lua.tenant
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                      default_source_code:
                        inline_string: |
                          local jwt_tenants = {
{{ include "loki.gatewayEnvoyLuaMap" (dict "ctx" . "attribute" "jwtSubClaim") | indent 28 }}                          }
                          local mtls_tenants = {
{{ include "loki.gatewayEnvoyLuaMap" (dict "ctx" . "attribute" "clientCertificateCN") | indent 28 }}                          }
                          local basic_tenants = {
                            {{- if .Values.gateway.basicAuth.enabled }}
{{ include "loki.gatewayEnvoyBasicAuthLuaMap" . | indent 28 }}                            {{- end }}
                          }

                          local function allow(headers, tenant)
                            headers:replace("x-scope-orgid", tenant)
                          end

                          local function deny(handle, status, body)
                            handle:respond({[":status"] = status, ["content-type"] = "text/plain"}, body)
                          end

                          function envoy_on_request(handle)
                            local headers = handle:headers()
                            {{- if $tenantMappingActive }}
                            local stream_info = handle:streamInfo()
                            local metadata = stream_info:dynamicMetadata()
                            {{- if .Values.gateway.basicAuth.enabled }}
                            local basic_auth = metadata:get("envoy.filters.http.basic_auth")
                            local basic_username = basic_auth and basic_auth["username"]
                            if basic_username ~= nil then
                              local tenant = basic_tenants[basic_username]
                              if tenant == nil then
                                return deny(handle, "403", "Forbidden\n")
                              end
                              return allow(headers, tenant)
                            end
                            {{- end }}
                            {{- if $hasJWTTenant }}
                            local jwt_auth = metadata:get("envoy.filters.http.jwt_authn")
                            local jwt_payload = jwt_auth and jwt_auth["jwt_payload"]
                            if jwt_payload ~= nil then
                              local subject = jwt_payload["sub"]
                              if subject ~= nil then
                                subject = tostring(subject)
                              end
                              local tenant = subject and jwt_tenants[subject]
                              if tenant == nil then
                                return deny(handle, "403", "Forbidden\n")
                              end
                              return allow(headers, tenant)
                            end
                            {{- end }}
                            {{- if $hasClientCertificateTenant }}
                            local ssl = stream_info:downstreamSslConnection()
                            if ssl ~= nil and ssl:peerCertificatePresented() and ssl:peerCertificateValidated() then
                              local parsed_subject = ssl:parsedSubjectPeerCertificate()
                              local common_name = parsed_subject and parsed_subject:commonName()
                              local tenant = common_name and mtls_tenants[common_name]
                              if tenant == nil then
                                return deny(handle, "403", "Forbidden\n")
                              end
                              return allow(headers, tenant)
                            end
                            {{- end }}
                            return deny(handle, "401", "Unauthorized\n")
                            {{- end }}
                          end

                          function envoy_on_response(handle) end
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          {{- if .Values.gateway.envoyConfig.tls.enabled }}
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                alpn_protocols: [h2, http/1.1]
                tls_certificates:
                  - certificate_chain:
                      filename: /etc/envoy/tls/{{ .Values.gateway.envoyConfig.tls.certificateFile }}
                    private_key:
                      filename: /etc/envoy/tls/{{ .Values.gateway.envoyConfig.tls.privateKeyFile }}
                {{- if $hasClientCertificateTenant }}
                validation_context:
                  trusted_ca:
                    filename: /etc/envoy/tls/{{ .Values.gateway.envoyConfig.tls.clientCAFile }}
                {{- end }}
              require_client_certificate: false
              disable_stateless_session_resumption: true
              disable_stateful_session_resumption: true
          {{- end }}
    {{- if $jwksBearerTokenFile }}
{{ include "loki.gatewayEnvoyJwksCredentialListener" . }}
    {{- end }}
  clusters:
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "distributor" "url" $distributorUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "ingester" "url" $ingesterUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "ruler" "url" $rulerUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "compactor" "url" $compactorUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "index_gateway" "url" $indexGatewayUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "query_scheduler" "url" $querySchedulerUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "query_frontend" "url" $queryFrontendUrl "websocket" false) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "query_frontend_websocket" "url" $queryFrontendUrl "websocket" true) }}
{{ include "loki.gatewayEnvoyCluster" (dict "ctx" . "name" "querier" "url" $querierUrl "websocket" false) }}
  {{- if .Values.gateway.envoyConfig.jwt.enabled }}
{{ include "loki.gatewayEnvoyJwksCluster" . }}
  {{- end }}
  {{- if $jwksBearerTokenFile }}
{{ include "loki.gatewayEnvoyJwksCredentialCluster" . }}
  {{- end }}
admin:
  address:
    socket_address:
      address: {{ ternary "::" "0.0.0.0" .Values.gateway.envoyConfig.enableIPv6 | quote }}
      port_value: {{ .Values.gateway.envoyConfig.adminPort }}
      {{- if .Values.gateway.envoyConfig.enableIPv6 }}
      ipv4_compat: true
      {{- end }}
  allow_paths:
    - exact: /ready
    {{- if .Values.gateway.metrics.enabled }}
    - exact: /stats/prometheus
    {{- end }}
{{- end }}
