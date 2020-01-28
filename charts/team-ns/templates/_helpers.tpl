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

{{- define "auth-annotations" -}}
nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy{{ if ne .name "admin"}}-team-{{ .name }}{{ end }}.istio-system.svc.cluster.local/oauth2/auth"
# the redirect part here is caught by the oauth2 ingress which will take care of the redirect
nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ .domain }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
{{- end -}}

{{- define "ingress-annotations" -}}
kubernetes.io/ingress.class: nginx
# kubernetes.io/tls-acme: "true"
ingress.kubernetes.io/rewrite-target: /
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
nginx.ingress.kubernetes.io/configuration-snippet: |
  # set team header
  add_header Auth-Group "{{ .name }}";
  proxy_set_header Auth-Group "{{ .name }}";

  # split cookie if needed:
  auth_request_set $_oauth2_proxy_upstream_1 $upstream_cookie__oauth2_proxy_1;
  access_by_lua_block {
    if ngx.var._oauth2_proxy_upstream_1 ~= "" then
      ngx.header["Set-Cookie"] = "_oauth2_proxy_1=" .. ngx.var._oauth2_proxy_upstream_1 .. ngx.var.auth_cookie:match("(; .*)")
    end
  }
{{- end -}}