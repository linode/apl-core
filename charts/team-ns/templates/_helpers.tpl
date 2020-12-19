{{- define "raw.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chart-labels" -}}
app: {{ template "raw.name" . }}
app.kubernetes.io/name: {{ template "raw.name" . }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/version: {{ .Chart.Version }}
app.kubernetes.io/part-of: otomi
helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
{{- end -}}

{{- define "helm-toolkit.utils.joinListWithSep" -}}
{{- $local := dict "first" true -}}
{{- $ := . -}}
{{- range $k, $v := .list -}}{{- if not $local.first -}}{{ $.sep }}{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}

{{- define "flatten-name" -}}
{{- $res := regexReplaceAll "[()/]{1}" . "" -}}
{{- regexReplaceAll "[|.]{1}" $res "-" | trimAll "-" -}}
{{- end -}}

{{- define "dockercfg" -}}
{"auths":{"{{ .server }}":{"username":"{{ .username }}","password":"{{ .password | replace "\"" "\\\"" }}","email":"not@val.id","auth":"{{ print .username ":" .password | b64enc}}"}}}
{{- end -}}

{{- define "itemsByName" -}}
{{- range $i := . }}
{{ $i.name }}:
{{ $i | toYaml | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "ingress" -}}
{{- $appsDomain := printf "apps.%s" .domain }}
{{- $ := . }}
# collect unique host and service names
{{- $routes := dict }}
{{- $names := list }}
{{- range $s := .services }}
{{- $isShared := $s.isShared | default false }}
{{- $isApps := or .isApps (and $s.isCore (not (or $s.ownHost $s.isShared))) }}
{{- $domain := (index $s "domain" | default (printf "%s.%s" $s.name ($isShared | ternary $.cluster.domain $.domain))) }}
{{- if not $isApps }}
  {{- if (not (hasKey $routes $domain)) }}
    {{- $routes = (merge $routes (dict $domain (hasKey $s "paths" | ternary $s.paths list))) }}
  {{- else }}
    {{- if $s.paths }}
      {{- $paths := index $routes $domain }}
      {{- $paths = concat $paths $s.paths }}
      {{- $routes = (merge (dict $domain $paths) $routes) }}
    {{- end }}
  {{- end }}
{{- end }}
{{- if not (or (has $s.name $names) $s.ownHost $s.isShared) }}
  {{- $names = (append $names $s.name) }}
{{- end }}
{{- end }}
{{- $internetFacing := or (eq .provider "onprem") (ne .provider "nginx") (and (not .otomi.hasCloudLB) (eq .provider "nginx")) }}
{{- if and $internetFacing }}
  # also add apps on cloud lb
  {{- $routes = (merge $routes (dict $appsDomain list)) }}
{{- end }}
{{- if and (eq .teamId "admin") .otomi.hasCloudLB (not (eq .provider "nginx")) }}
  {{- $routes = (merge $routes (dict (printf "auth.%s" .cluster.domain) list)) }}
  {{- $routes = (merge $routes (dict (printf "proxy.%s" .domain) list)) }}
{{- end }}
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
{{- if $internetFacing }}
    # register hosts when we are an outside facing ingress:
    externaldns: "true"
{{- end }}
{{- if eq .provider "aws" }}
    kubernetes.io/ingress.class: merge
    merge.ingress.kubernetes.io/config: merged-ingress
    alb.ingress.kubernetes.io/tags: "team=team-{{ .teamId }}"
    ingress.kubernetes.io/ssl-redirect: "true"
{{- end }}
{{- if eq .provider "azure" }}
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/backend-protocol: "http"
{{- end }}
{{- if eq .provider "nginx" }}
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    # nginx.ingress.kubernetes.io/proxy-buffering: "off"
    # nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
  {{- if not .hasCloudLB }}
    ingress.kubernetes.io/ssl-redirect: "true"
  {{- end }}
{{- end }}
{{- if and (eq .cluster.provider "onprem") $internetFacing }}
    external-dns.alpha.kubernetes.io/target: {{ .cluster.entrypoint }}
{{- end }}
{{- if .isApps }}
    nginx.ingress.kubernetes.io/upstream-vhost: $1.{{ .domain }}
  {{- if .hasForward }}
    nginx.ingress.kubernetes.io/rewrite-target: /$1/$2
    {{- else }}
    nginx.ingress.kubernetes.io/rewrite-target: /$2
  {{- end }}
{{- end }}
{{- if .hasAuth }}
    nginx.ingress.kubernetes.io/auth-response-headers: Authorization
    nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy.istio-system.svc.cluster.local/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ .cluster.domain }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
{{- end }}
{{- if or .isApps .hasAuth }}
    nginx.ingress.kubernetes.io/configuration-snippet: |
  {{- if .isApps }}
      rewrite ^/$ https://otomi.{{ .cluster.domain }}/ permanent;
      rewrite ^(/tracing)$ $1/ permanent;
  {{- end }}
{{- end }}
  labels: {{- include "chart-labels" .dot | nindent 4 }}
  name: {{ $.provider }}-team-{{ .teamId }}-{{ .name }}
  namespace: {{ if ne .provider "nginx" }}ingress{{ else }}istio-system{{ end }}
spec:
  rules:
{{- if .isApps }}
    - host: {{ $appsDomain }}
      http:
        paths:
        - backend:
            serviceName: istio-ingressgateway-auth
            servicePort: 80
          path: /
        - backend:
            serviceName: istio-ingressgateway-auth
            servicePort: 80
          path: /({{ range $i, $name := $names }}{{ if gt $i 0 }}|{{ end }}{{ $name }}{{ end }})/(.*)
        # fix for tracing not having a trailing slash:
        - backend:
            serviceName: istio-ingressgateway-auth
            servicePort: 80
          path: /tracing
{{- else }}
  {{- range $domain, $paths := $routes }}
    - host: {{ $domain }}
      http:
        paths:
    {{- if not (eq $.provider "nginx") }}
      {{- if eq $.provider "aws" }}
          - backend:
              serviceName: ssl-redirect
              servicePort: use-annotation
            path: /*
      {{- end }}
          - backend:
              serviceName: nginx-ingress-controller
              servicePort: 80
    {{- else }}
      {{- if gt (len $paths) 0 }}
        {{- range $path := $paths }}
          - backend:
              serviceName: istio-ingressgateway{{ if $.hasAuth }}-auth{{ end }}
              servicePort: 80
            path: {{ $path }}
        {{- end }}
      {{- else }}
          - backend:
              serviceName: istio-ingressgateway{{ if $.hasAuth }}-auth{{ end }}
              servicePort: 80
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- if $internetFacing }}
  tls:
  {{- range $domain, $paths := $routes }}
    - hosts:
        - {{ $domain }}
      secretName: {{ $domain | replace "." "-" }}
  {{- end }}
{{- end }}

{{- end }}
