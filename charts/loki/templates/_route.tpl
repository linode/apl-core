{{/*
Detect the highest available Gateway API version from cluster capabilities.
*/}}
{{- define "loki.gatewayApi.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "gateway.networking.k8s.io/v1" -}}
{{- print "gateway.networking.k8s.io/v1" -}}
{{- else if .Capabilities.APIVersions.Has "gateway.networking.k8s.io/v1beta1" -}}
{{- print "gateway.networking.k8s.io/v1beta1" -}}
{{- else -}}
{{- print "gateway.networking.k8s.io/v1" -}}
{{- end -}}
{{- end -}}

{{/*
Gateway API route manifest. Shared by the nginx gateway route and direct Loki service routes.
Params:
  ctx            - chart root context ($)
  route          - route values object
  name           - resource name for the route object
  rules          - pre-rendered rules string to embed under spec.rules
  labelsTemplate - optional: name of the labels helper to use (default "loki.labels")
*/}}
{{- define "loki.route" -}}
{{- $route := .route -}}
{{- $ctx := .ctx }}
---
apiVersion: {{ $route.apiVersion | default (include "loki.gatewayApi.apiVersion" $ctx) }}
kind: {{ $route.kind | default "HTTPRoute" }}
metadata:
  name: {{ .name }}
  namespace: {{ include "loki.namespace" $ctx }}
  labels:
    {{- include (.labelsTemplate | default "loki.labels") $ctx | nindent 4 }}
    {{- with $route.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- with $route.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- with $route.parentRefs }}
  parentRefs:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with $route.hostnames }}
  hostnames:
    {{- tpl (toYaml .) $ctx | nindent 4 }}
  {{- end }}
  {{- if or $route.additionalRules (ne (trim .rules) "") }}
  rules:
    {{- with $route.additionalRules }}
    {{- tpl (toYaml .) $ctx | nindent 4 }}
    {{- end }}
    {{- if ne (trim .rules) "" }}
    {{- .rules | nindent 4 }}
    {{- end }}
  {{- end }}
{{- end -}}

{{/*
HTTPRoute rule pointing to the nginx gateway backend.
Params:
  ctx         - chart root context ($)
  route       - route values object
  serviceName - backend Service name (always the gateway service, regardless of route key)
  port        - backend service port
*/}}
{{- define "loki.route.gatewayRule" -}}
- backendRefs:
    - group: ""
      kind: Service
      name: {{ .serviceName }}
      port: {{ .port }}
      weight: 1
  {{- with .route.filters }}
  filters:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .route.matches }}
  matches:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .route.timeouts }}
  timeouts:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end -}}

{{/*
Generate HTTPRoute rules based on deployment mode.
Params:
  ctx   - chart root context ($)
  paths - paths map from the route entry (route.main.paths)
  port  - optional backend port override; falls back to loki.server.http_listen_port
*/}}
{{- define "loki.route.rules" -}}
{{- $ctx := .ctx -}}
{{- $paths := .paths -}}
{{- $port := .port -}}
{{- if eq (include "loki.deployment.isMonolithic" $ctx) "true" -}}
{{- $svc := include "loki.fullname" $ctx -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $svc "paths" $paths.distributor "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $svc "paths" $paths.queryFrontend "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $svc "paths" $paths.ruler "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $svc "paths" $paths.compactor "port" $port) }}
{{- else if eq (include "loki.deployment.isDistributed" $ctx) "true" -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "distributor")) "paths" $paths.distributor "port" $port) }}
{{- /* query-frontend is optional; fall back to querier when it has no replicas and no autoscaler */ -}}
{{- if or (gt (int $ctx.Values.queryFrontend.replicas) 0) $ctx.Values.queryFrontend.autoscaling.enabled $ctx.Values.queryFrontend.kedaAutoscaling.enabled -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "query-frontend")) "paths" $paths.queryFrontend "port" $port) }}
{{- else -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "querier")) "paths" $paths.queryFrontend "port" $port) }}
{{- end -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "ruler")) "paths" $paths.ruler "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "compactor")) "paths" $paths.compactor "port" $port) }}
{{- else if eq (include "loki.deployment.isScalable" $ctx) "true" -}}
{{- $backend := include "loki.resourceName" (dict "ctx" $ctx "component" "backend") -}}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "read")) "paths" $paths.queryFrontend "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" (include "loki.resourceName" (dict "ctx" $ctx "component" "write")) "paths" $paths.distributor "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $backend "paths" $paths.ruler "port" $port) }}
{{- include "loki.route.serviceRule" (dict "ctx" $ctx "serviceName" $backend "paths" $paths.compactor "port" $port) }}
{{- end -}}
{{- end -}}

{{/*
HTTPRoute rule for a single Loki service with path-prefix matches.
Params:
  ctx         - chart root context ($)
  serviceName - fully qualified k8s service name
  paths       - list of URL path prefixes to match; rule is skipped when empty
  port        - optional backend port; falls back to loki.server.http_listen_port
*/}}
{{- define "loki.route.serviceRule" -}}
{{- if .paths }}
- backendRefs:
    - group: ""
      kind: Service
      name: {{ .serviceName }}
      port: {{ .port | default .ctx.Values.loki.server.http_listen_port }}
      weight: 1
  matches:
    {{- range .paths }}
    - path:
        type: PathPrefix
        value: {{ . }}
    {{- end }}
{{- end -}}
{{- end -}}
