
{{- define "ingress.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "networking.k8s.io/v1/Ingress" -}}
{{- print "networking.k8s.io/v1" -}}
{{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1/Ingress" -}}
{{- print "networking.k8s.io/v1beta1" -}}
{{- else -}}
{{- print "extensions/v1beta1" -}}
{{- end -}}
{{- end -}}

{{- define "ingress.path" }}
- backend:
{{- if ne (include "ingress.apiVersion" .dot) "networking.k8s.io/v1" }}
    serviceName: {{ .svc }}
    servicePort: {{ .port | default 80 }}
{{- else }}
    service:
      name: {{ .svc }}
      port:
        number: {{ .port | default 80 }}
{{- end }}
  path: {{ .path | default "/" }}
{{- if ne (include "ingress.apiVersion" .dot) "extensions/v1beta1" }}
  pathType: {{ .pathType | default "Prefix" }}
{{- end }}
{{- end }}

{{- define "ingress" -}}
{{- $ := . }}
{{- $v := .dot.Values }}
{{- $appsDomain := printf "apps.%s" $v.domain }}
{{- $istioSvc := print "istio-ingressgateway-" .type }}
# collect unique host and service names
{{- $routes := dict }}
{{- $names := list }}
{{- $hasTlsPass := $.tlsPass | default false }}
{{- range $s := .services }}
  {{- $domain := include "service.domain" (dict "s" $s "dot" $.dot) }}
  {{- $paths := hasKey $s "paths" | ternary $s.paths (list "/") }}
  {{- if (not (hasKey $routes $domain)) }}
    {{- $routes = merge $routes (dict $domain $paths) }}
  {{- else }}
    {{- $paths = concat (index $routes $domain) $paths }}
    {{- $routes = (merge (dict $domain $paths) $routes) }}
  {{- end }}
  {{- if not (or (has $s.name $names) $s.ownHost $s.isShared) }}
    {{- $names = (append $names $s.name) }}
  {{- end }}
{{- end }}
{{- $internetFacing := or (eq .provider "onprem") (ne .provider "nginx") (and (not $v.otomi.hasCloudLB) (eq .provider "nginx")) }}
{{- if and (eq $v.teamId "admin") $v.otomi.hasCloudLB (not (eq .provider "nginx")) }}
  {{- $routes = (merge $routes (dict (printf "auth.%s" $v.cluster.domainSuffix ) list)) }}
{{- end }}
apiVersion: {{ template "ingress.apiVersion" .dot }}
kind: Ingress
metadata:
  annotations:
  {{- if $internetFacing }}
    externaldns: "true"
  {{- end }}
{{- if $hasTlsPass }}
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
{{- else }}
  {{- if eq .provider "aws" }}
    kubernetes.io/ingress.class: merge
    merge.ingress.kubernetes.io/config: merged-ingress
    alb.ingress.kubernetes.io/tags: "team=team-{{ $v.teamId }}"
    ingress.kubernetes.io/ssl-redirect: "true"
  {{- end }}
  {{- if eq .provider "azure" }}
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/backend-protocol: "http"
  {{- end }}
  {{- if eq .provider "nginx" }}
    kubernetes.io/ingress.class: nginx{{ if eq $.type "private" }}-private{{ end }}
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    # nginx.ingress.kubernetes.io/proxy-buffering: "off"
    # nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
    {{- if not $v.otomi.hasCloudLB }}
    ingress.kubernetes.io/ssl-redirect: "true"
    {{- end }}
  {{- end }}
{{- end }}
{{- if and (eq $v.cluster.provider "onprem") $internetFacing }}
    external-dns.alpha.kubernetes.io/target: {{ $v.cluster.entrypoint }}
{{- end }}
{{- if .isApps }}
    nginx.ingress.kubernetes.io/upstream-vhost: $1.{{ $v.domain }}
  {{- if .hasForward }}
    nginx.ingress.kubernetes.io/rewrite-target: /$1/$2
  {{- else }}
    nginx.ingress.kubernetes.io/rewrite-target: /$2
  {{- end }}
{{- end }}
{{- if .hasAuth }}
    nginx.ingress.kubernetes.io/auth-response-headers: Authorization
    nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy.istio-system.svc.cluster.local/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ $v.cluster.domainSuffix }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
{{- end }}
{{- if .isApps }}
    nginx.ingress.kubernetes.io/configuration-snippet: |
      rewrite ^/$ https://otomi.{{ $v.cluster.domainSuffix }}/ permanent;
      rewrite ^(/tracing)$ $1/ permanent;
{{- end }}
  labels: {{- include "chart-labels" .dot | nindent 4 }}
  name: {{ $.provider }}-team-{{ $v.teamId }}-{{ .type }}-{{ .name }}
  namespace: {{ if ne .provider "nginx" }}ingress{{ else }}istio-system{{ end }}
spec:
  rules:
{{- if $hasTlsPass }}
  {{- range $domain, $paths := $routes }}
  - host: {{ $domain }}
    http:
      paths:
      {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc "port" 443) | nindent 8 }}
  {{- end }}
{{- else if .isApps }}
    - host: {{ $appsDomain }}
      http:
        paths:
        {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc) | nindent 8 }}
        {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc "path" (printf "/(%s)/(.*)" (include "helm-toolkit.utils.joinListWithSep" (dict "list" $names "sep" "|")))) | nindent 8 }}
{{- else }}
  {{- range $domain, $paths := $routes }}
    - host: {{ $domain }}
      http:
        paths:
    {{- if not (eq $.provider "nginx") }}
      {{- if eq $.provider "aws" }}
          {{- include "ingress.path" (dict "dot" $.dot "svc" "ssl-redirect" "port" "use-annotation" "path" "/*") | nindent 8 }}
      {{- end }}
          {{- include "ingress.path" (dict "dot" $.dot "svc" "nginx-ingress-controller") | nindent 8 }}
    {{- else }}
      {{- if gt (len $paths) 0 }}
        {{- range $path := $paths }}
          {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc "path" $path) | nindent 8 }}
        {{- end }}
      {{- else }}
        {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc) | nindent 8 }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- if and (not $hasTlsPass) $internetFacing }}
  tls:
  {{- range $domain, $paths := $routes }}
    - hosts:
        - {{ $domain }}
      secretName: {{ $domain | replace "." "-" }}
  {{- end }}
{{- end }}

{{- end }}
