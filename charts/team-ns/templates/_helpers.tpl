{{- define "chart-labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/version: {{ .Chart.Version }}
helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
{{- end -}}

{{- define "helm-toolkit.utils.joinListWithComma" -}}
{{- $local := dict "first" true -}}
{{- range $k, $v := . -}}{{- if not $local.first -}},{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}

{{- define "helm-toolkit.utils.joinListWithPipe" -}}
{{- $local := dict "first" true -}}
{{- range $k, $v := . -}}{{- if not $local.first -}}|{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}

{{- define "auth-annotations" -}}
nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy{{ if ne .teamId "admin"}}-team-{{ .teamId }}{{ end }}.istio-system.svc.cluster.local/oauth2/auth"
# the redirect part here is caught by the oauth2 ingress which will take care of the redirect
nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ .domain }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
ingress.kubernetes.io/ssl-redirect: {{ if $.cluster.hasCloudLB }}"false"{{ else }}"true"{{ end }}
nginx.ingress.kubernetes.io/configuration-snippet: |
  # set team header
  add_header Auth-Group "{{ .teamId }}";
  proxy_set_header Auth-Group "{{ .teamId }}";
{{- end -}}

{{- define "ingress-annotations" -}}
kubernetes.io/ingress.class: nginx
# kubernetes.io/tls-acme: "true"
# DDOS protection: see https://bobcares.com/blog/nginx-ddos-prevention/
# nginx.ingress.kubernetes.io/limit-connections: "20" # per ip
# nginx.ingress.kubernetes.io/limit-rps: "10" # per second per conn
# nginx.ingress.kubernetes.io/limit-rpm: "30" # per minute per conn
# nginx.ingress.kubernetes.io/limit-rate-after: "50000000" # After 50Mb throughput rate limiting will start
# nginx.ingress.kubernetes.io/limit-rate: "1000000" # 1Mbps thoughput after
# nginx.ingress.kubernetes.io/limit-whitelist: "83.85.129.89/32"
# OWASP protection
# nginx.ingress.kubernetes.io/enable-modsecurity: "true"
# nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"
{{- end -}}

{{- define "ingress" -}}
{{- if gt (len .services) 0 -}}
{{- $appsDomain := printf "apps.%s" .domain }}
{{- $ := . }}
# collect unique host and service names
{{- $domains := list }}
{{- $names := list }}
{{- range $s := .services }}
{{/*- $domain := (index $s "domain" | default (printf "%s.%s" $s.name (eq "shared" ($s.namespace | default "") | ternary $.cluster.domain $.domain))) */}}
{{- $domain := (index $s "domain" | default (printf "%s.%s" $s.name $.domain)) }}
{{- if and (not $.isApps) (not (has $domain $domains)) }}
  {{- $domains = (append $domains $domain) }}
{{- end }}
{{/*- if not (or (has $s.name $names) ($s.internal) (eq "shared" ($s.namespace | default ""))) */}}
{{- if not (or (has $s.name $names) ($s.internal)) }}
  {{- $names = (append $names $s.name) }}
{{- end }}
{{- end }}
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    {{- if .isApps }}
    nginx.ingress.kubernetes.io/upstream-vhost: $1.{{ .domain }}
      {{- if .hasForward }}
    nginx.ingress.kubernetes.io/rewrite-target: /$1/$2
      {{- else }}
    nginx.ingress.kubernetes.io/rewrite-target: /$2
      {{- end }}
    {{- end }}
    kubernetes.io/ingress.class: nginx
    {{- if .hasAuth }}
    nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy.istio-system.svc.cluster.local/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ .cluster.domain }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
    ingress.kubernetes.io/ssl-redirect: {{ if .cluster.hasCloudLB }}"false"{{ else }}"true"{{ end }}
    {{- end }}
    {{- if .hasAuth }}
    nginx.ingress.kubernetes.io/configuration-snippet: |
      # set team header
      add_header Auth-Group "{{ .teamId }}";
      proxy_set_header Auth-Group "{{ .teamId }}";
    {{- end }}
  labels: {{- include "chart-labels" .dot | nindent 4 }}
  name: nginx-ingress-team-{{ .teamId }}-{{ .name }}
  namespace: istio-system
spec:
  rules:
  {{- if .isApps }}
  - host: {{ $appsDomain }}
    http:
      paths:
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
        path: /
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
        path: /({{ range $i, $name := $names }}{{ if gt $i 0 }}|{{ end }}{{ $name }}{{ end }})/(.*)
  {{- else }}
  - host: {{ $appsDomain }}
    http:
      paths:
      - backend:
          serviceName: oauth2-proxy
          servicePort: 80
        path: /oauth2/userinfo
  {{- end }}
  {{- range $domain := $domains }}
  - host: {{ $domain }}
    http:
      paths:
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
  {{- end }}
  {{- if not .cluster.hasCloudLB }}
  tls:
    {{- if .isApps }}
    - hosts:
        - {{ $appsDomain }}
      secretName: {{ $appsDomain | replace "." "-" }}
    {{- end }}
    {{- range $domain := $domains }}
    {{- $certName := ($domain | replace "." "-") }}
    - hosts:
        - {{ $domain }}
      secretName: {{ $certName }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}
