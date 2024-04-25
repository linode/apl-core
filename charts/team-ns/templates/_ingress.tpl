{{- define "ingress.path" }}
- backend:
    service:
      name: {{ .svc }}
      port:
        number: {{ .port | default 80 }}
  path: {{ .path | default "/" }}
  pathType: {{ .pathType | default "Prefix" }}
{{- end }}

{{- define "ingress" -}}
{{- $ := . }}
{{- $v := .dot.Values }}
{{- $istioSvc := print "istio-ingressgateway-" .type }}
{{- $cm := index $v.apps "cert-manager" }}
{{- range $ingress := $v.ingress.classes }}
  {{- $routes := dict }}
  {{- $names := list }}
  {{- $hasTlsPass := $.tlsPass | default false }}
  {{- $secrets := dict }}
  {{- range $s := $.services }}
    # service {{ $s.name }}, domain: {{ $s.domain }}
    {{- $paths := list }}
    {{- $ingressClassName := dig "ingressClassName" $v.ingress.platformClass.className $s }}
    {{- if eq $ingressClassName $ingress.className }}
      {{- $domain := include "service.domain" (dict "s" $s "dot" $.dot) }}
      {{- if and $s.hasCert (hasKey $s "certName") }}{{ $_ := set $secrets $domain $s.certName }}{{ end }}
      {{- if $s.useCname }}{{ $_ := set $secrets $s.cname.domain $s.cname.tlsSecretName }}{{ end }}
        {{- $svcPaths := (hasKey $s "paths" | ternary $s.paths (list "/" )) }}
        {{- if eq (len $svcPaths) 0 }}{{ $svcPaths = list "/" }}{{ end }}
          {{- $paths = concat $svcPaths $paths }}
          {{- if (not (hasKey $routes $domain)) }}
            {{- $routes = merge $routes (dict $domain $paths) }}
            {{- if $s.useCname }}
              {{- $routes = merge $routes (dict $s.cname.domain $paths) }}
            {{- end }}
          {{- else }}
            {{- $paths = concat (index $routes $domain) $paths }}
            {{- $routes = (merge (dict $domain $paths) $routes) }}
            {{- if $s.useCname }}
              {{- $routes = merge $routes (dict $s.cname.domain $paths) }}
            {{- end }}
          {{- end }}
          {{- if not (or (has $s.name $names) $s.ownHost $s.isShared) }}
            {{- $names = (append $names $s.name) }}
          {{- end }}
        {{- end }}
      {{- end }}
      {{- if or $routes $names }}
        {{- $namesCollection := include "helm-toolkit.utils.joinListWithSep" (dict "list" $names "sep" "|") }}
---
# ingress: {{ $.type }}: {{ $.name }} ({{ len $.services }})

# collect unique host and service names
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    externaldns: "true"
    {{- if $hasTlsPass }}
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    {{- else }}
    # nginx.ingress.kubernetes.io/proxy-buffering: "off"
    # nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
    ingress.kubernetes.io/ssl-redirect: "true"
    {{- end }}
    {{- with $ingress.sourceIpAddressFiltering }}
    nginx.ingress.kubernetes.io/whitelist-source-range: "{{ . }}"
    {{- end}}
    {{- if and $.hasAuth (eq $ingress.className $v.ingress.platformClass.className )}}
    nginx.ingress.kubernetes.io/auth-response-headers: Authorization
    nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy.istio-system.svc.cluster.local/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.{{ $v.cluster.domainSuffix }}/oauth2/start?rd=/oauth2/redirect/$http_host$escaped_request_uri"
    {{- end }}
    {{- if and (hasKey $ingress "entrypoint") (ne $ingress.entrypoint "")}}
    external-dns.alpha.kubernetes.io/target: {{ $ingress.entrypoint }} 
    {{- end }}
    # websocket upgrade snippet
    nginx.ingress.kubernetes.io/server-snippets: |
      location ~* /(ws(s)?|socket.io)/ {
          proxy_set_header Upgrade $http_upgrade;
          proxy_http_version 1.1;
          proxy_set_header X-Forwarded-Host $http_host;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_set_header X-Forwarded-For $remote_addr;
          proxy_set_header Host $host;
          proxy_set_header Connection "upgrade";
          proxy_cache_bypass $http_upgrade;
        }
  labels: {{- include "team-ns.chart-labels" $.dot | nindent 4 }}
  name: nginx-team-{{ $v.teamId }}-{{ $ingress.className }}-{{ $.type }}-{{ $.name }}
  namespace: istio-system
spec:
  ingressClassName: {{ $ingress.className }}
  rules:
      {{- if $hasTlsPass }}
        {{- range $domain, $paths := $routes }}
    - host: {{ $domain }}
      http:
        paths:
              {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc "port" 443) | nindent 8 }}
          {{- end }}
      {{- else }}
        {{- range $domain, $paths := $routes }}
    - host: {{ $domain }}
      http:
        paths:
            {{- if gt (len $paths) 0 }}
              {{- range $path := $paths }}
                {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc "path" $path) | nindent 8 }}
              {{- end }}
            {{- else }}
              {{- include "ingress.path" (dict "dot" $.dot "svc" $istioSvc) | nindent 8 }}
            {{- end }}
        {{- end }}
      {{- end }}
      {{- if (not $hasTlsPass) }}
  tls:
        {{- range $domain, $paths := $routes }}
    - hosts:
        - {{ $domain }}
          {{- if hasKey $secrets $domain }}
            {{- if ne (index $secrets $domain) "" }}
{{/*If a team provides its own certificate in the team namespace then Otomi cornjob makes a copy of it*/}} 
      secretName: copy-team-{{ $v.teamId }}-{{ index $secrets $domain }}
            {{- end }}
          {{- else }}
            {{- if eq $cm.issuer "byo-wildcard-cert" }}
      secretName: otomi-byo-wildcard-cert
            {{- else }}
      secretName: otomi-cert-manager-wildcard-cert
            {{- end}}
          {{- end }}
        {{- end }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
