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
{{- $res := regexReplaceAll "[()/_]{1}" . "" -}}
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

{{- define "common.capabilities.kubeVersion" -}}
{{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{- define "ingress.apiVersion" -}}
{{- if semverCompare "<1.14-0" (include "common.capabilities.kubeVersion" .) -}}
{{- print "extensions/v1beta1" -}}
{{- else if semverCompare "<1.19-0" (include "common.capabilities.kubeVersion" .) -}}
{{- print "networking.k8s.io/v1beta1" -}}
{{- else -}}
{{- print "networking.k8s.io/v1" -}}
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
  {{- $domain := (index $s "domain" | default (printf "%s.%s" $s.name ($isShared | ternary $.clusterDomainSuffix $.domain))) }}
  {{- if not $isApps }}
    {{- $paths := hasKey $s "paths" | ternary $s.paths (list "/") }}
    {{- if (not (hasKey $routes $domain)) }}
      {{- $routes = merge $routes (dict $domain $paths) }}
    {{- else }}
      {{- $paths = concat (index $routes $domain) $paths }}
      {{- $routes = (merge (dict $domain $paths) $routes) }}
    {{- end }}
  {{- end }}
  {{- if not (or (has $s.name $names) $s.ownHost $s.isShared) }}
    {{- $names = (append $names $s.name) }}
  {{- end }}
{{- end }}
{{- $internetFacing := or (eq .provider "onprem") (ne .provider "nginx") (and (not .otomi.hasCloudLB) (eq .provider "nginx")) }}
{{- if and (not .tlsPass) $internetFacing }}
  # also add apps on cloud lb
  {{- $routes = (merge $routes (dict $appsDomain list)) }}
{{- end }}
{{- if and (eq .teamId "admin") .otomi.hasCloudLB (not (eq .provider "nginx")) }}
  {{- $routes = (merge $routes (dict (printf "auth.%s" .clusterDomainSuffix ) list)) }}
{{- end }}
apiVersion: {{ template "ingress.apiVersion" .dot }}
kind: Ingress
metadata:
  annotations:
{{- if .tlsPass | default false }}  
    kubernetes.io/ingress.class: nginx-tls
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
{{- else }}
  {{- if $internetFacing }}
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
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ .clusterDomainSuffix }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
{{- end }}
{{- if or .isApps .hasAuth }}
    nginx.ingress.kubernetes.io/configuration-snippet: |
  {{- if .isApps }}
      rewrite ^/$ https://otomi.{{ .clusterDomainSuffix }}/ permanent;
      rewrite ^(/tracing)$ $1/ permanent;
  {{- end }}
{{- end }}
  labels: {{- include "chart-labels" .dot | nindent 4 }}
  name: {{ $.provider }}-team-{{ .teamId }}-{{ .name }}
  namespace: {{ if ne .provider "nginx" }}ingress{{ else }}istio-system{{ end }}
spec:
  rules:
{{- if .tlsPass }}
  {{- range $domain, $paths := $routes }}
  - host: {{ $domain }}
  {{- end }}
{{- else if .isApps }}
    - host: {{ $appsDomain }}
      http:
        paths:
        - backend:
            service:
              name: istio-ingressgateway-auth
              port:
                number: 80
          path: /
          pathType: Prefix
        - backend:
            service:
              name: istio-ingressgateway-auth
              port:
                number: 80
          path: /({{ range $i, $name := $names }}{{ if gt $i 0 }}|{{ end }}{{ $name }}{{ end }})/(.*)
          pathType: Prefix
{{- else }}
  {{- range $domain, $paths := $routes }}
    - host: {{ $domain }}
      http:
        paths:
    {{- if not (eq $.provider "nginx") }}
      {{- if eq $.provider "aws" }}
          - backend:
              service:
                name: ssl-redirect
                port:
                  number: use-annotation
            path: /*
            pathType: Prefix
      {{- end }}
          - backend:
              service:
                name: nginx-ingress-controller
                port:
                  number: 80
            path: /
            pathType: Prefix
    {{- else }}
      {{- if gt (len $paths) 0 }}
        {{- range $path := $paths }}
          - backend:
              service:
                name: istio-ingressgateway{{ if $.hasAuth }}-auth{{ end }}
                port:
                  number: 80
            path: {{ $path }}
            pathType: Prefix
        {{- end }}
      {{- else }}
          - backend:
              service:
                name: istio-ingressgateway{{ if $.hasAuth }}-auth{{ end }}
                port:
                  number: 80
            path: /
            pathType: Prefix
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- if and (not .tlsPass) $internetFacing }}
  tls:
  {{- range $domain, $paths := $routes }}
    - hosts:
        - {{ $domain }}
      secretName: {{ $domain | replace "." "-" }}
  {{- end }}
{{- end }}

{{- end }}
