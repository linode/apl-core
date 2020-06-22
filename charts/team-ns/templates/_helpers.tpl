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

<<<<<<< HEAD
{{- define "ingress" -}}
{{- if gt (len .services) 0 -}}
{{- $appsDomain := printf "apps.%s" .domain }}
{{- $ := . }}
# collect unique host and service names
{{- $domains := list }}
{{- $names := list }}
||||||| merged common ancestors
{{- define "ingress-tls" -}}
# also split list into domain used: custom vs team domain
{{- $customDomainServices := list }}
=======
{{- define "ingress" -}}
{{- if gt (len .services) 0 -}}
{{- $appsDomain := printf "apps.%s" .domain }}
{{- $ := . }}
# collect unique host and service names
{{- $routes := dict }}
{{- $names := list }}
>>>>>>> add_harbor
{{- range $s := .services }}
<<<<<<< HEAD
{{- $shared := eq "shared" ($s.namespace | default "") }}
{{- $domain := (index $s "domain" | default (printf "%s.%s" $s.name ($shared | ternary $.cluster.domain $.domain))) }}
{{/*- $domain := (index $s "domain" | default (printf "%s.%s" $s.name $.domain)) */}}
{{- if and (not $.isApps) (not (has $domain $domains)) }}
  {{- $domains = (append $domains $domain) }}
||||||| merged common ancestors
{{- if and (not $s.internal) (not $s.host) (not $.isAuthProxy) }}
{{- if hasKey $s "domain" }}
{{- $customDomainServices = (append $customDomainServices $s) }}
=======
{{- $shared := $s.isShared | default false }}
{{- $domain := (index $s "domain" | default (printf "%s.%s" $s.name ($shared | ternary $.cluster.domain $.domain))) }}
{{/*- $domain := (index $s "domain" | default (printf "%s.%s" $s.name $.domain)) */}}
{{- if not $.isApps  }}
  {{- if (not (hasKey $routes $domain)) }}
    {{- $routes = (merge $routes (dict $domain (list ($s.path | default "/")))) }}
  {{- else }}
    {{- $paths := index $routes $domain }}
    {{- $paths = append $paths ($s.path | default "/") }}
    {{- $routes = (merge (dict $domain $paths) $routes) }}
  {{- end }}
>>>>>>> add_harbor
{{- end }}
{{/*- if not (or (has $s.name $names) ($s.internal) ($shared)) */}}
{{- if not (or (has $s.name $names) ($s.internal)) }}
  {{- $names = (append $names $s.name) }}
{{- end }}
{{- end }}
<<<<<<< HEAD
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
      - backend:
          serviceName: oauth2-proxy
          servicePort: 80
        path: /oauth2/userinfo
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
||||||| merged common ancestors
{{- range $s := $customDomainServices }}
{{- $certName := ($s.domain | replace "." "-") }}
- hosts:
    - {{ $s.domain }}
  secretName: {{ $certName }}
{{- end }}
{{- range $app := list "auth" "apps" "proxy" }}
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
=======
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    externaldns: "true" # register hosts with dns
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
  name: team-{{ .teamId }}-{{ .name }}
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
  {{- range $domain, $paths := $routes }}
  - host: {{ $domain }}
    http:
      paths:
      {{- range $path := $paths }}
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
        path: {{ $path }}
      {{- end }}
      - backend:
          serviceName: oauth2-proxy
          servicePort: 80
        path: /oauth2/userinfo
  {{- end }}
  {{- if not .cluster.hasCloudLB }}
  tls:
    - hosts:
        - {{ $appsDomain }}
      secretName: {{ $appsDomain | replace "." "-" }}
    {{- range $domain, $paths := $routes }}
    {{- $certName := ($domain | replace "." "-") }}
    - hosts:
        - {{ $domain }}
      secretName: {{ $certName }}
    {{- end }}
  {{- end }}
>>>>>>> add_harbor
{{- end }}
{{- end }}
