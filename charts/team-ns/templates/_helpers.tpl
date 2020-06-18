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

{{- define "ingress-tls" -}}
# also split list into domain used: custom vs team domain
{{- $customDomainServices := list }}
{{- range $s := .services }}
{{- if and (not $s.internal) (not $s.host) (not $.isAuthProxy) }}
{{- if or (hasKey $s "domain") (hasKey $s "ownHost") }}
{{- $customDomainServices = (append $customDomainServices $s) }}
{{- end }}
{{- end }}
{{- end }}
{{- range $s := $customDomainServices }}
{{- $certName := ($s.domain | replace "." "-") }}
- hosts:
    - {{ $s.domain }}
  secretName: {{ $certName }}
{{- end }}
{{- range $app := list "auth" "apps" "proxy" "reg" }} # wildcard grouping
- hosts:
    - {{ $app }}.{{ $.domain }}
  secretName: cert-team-{{ $.teamId }}-{{ $app }}
{{- end }}
{{- if eq $.teamId "admin" }}
- hosts:
    - drone.{{ $.domain }}
  secretName: cert-team-{{ $.teamId }}-drone
- hosts:
    - prometheus-istio.{{ $.domain }}
  secretName: cert-team-{{ $.teamId }}-prometheus-istio
{{- end }}
{{- end }}
