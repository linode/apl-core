{{/* ######### Registry related templates */}}

{{/*
Returns the Registry hostname.
If the hostname is set in `global.hosts.registry.name`, that will be returned,
otherwise the hostname will be assembed using `registry` as the prefix, and the `gitlab.assembleHost` function.
*/}}
{{- define "gitlab.registry.hostname" -}}
{{- coalesce .Values.registry.host .Values.global.hosts.registry.name (include "gitlab.assembleHost"  (dict "name" "registry" "context" . )) -}}
{{- end -}}

{{/*
Return the registry external hostname
If the chart registry host is provided, it will use that, otherwise it will fallback
to the global registry host name.
*/}}
{{- define "gitlab.registry.host" -}}
{{-   if .Values.registry.host -}}
{{-     .Values.registry.host -}}
{{-   else -}}
{{-     template "gitlab.registry.hostname" . -}}
{{-   end -}}
{{- end -}}

{{/*
Return the registry api hostname
If the registry api host is provided, it will use that, otherwise it will fallback
to the service name
*/}}
{{- define "gitlab.registry.api.host" -}}
{{-   if .Values.registry.api.host -}}
{{-     .Values.registry.api.host -}}
{{-   else -}}
{{-     $name := default .Values.global.hosts.registry.serviceName .Values.registry.api.serviceName -}}
{{-     printf "%s-%s" .Release.Name $name -}}
{{-   end -}}
{{- end -}}

{{- define "gitlab.appConfig.registry.configuration" -}}
registry:
  enabled: {{ or (not (kindIs "bool" .Values.registry.enabled)) .Values.registry.enabled }}
  host: {{ template "gitlab.registry.host" . }}
  {{- if .Values.registry.port }}
  port: {{ .Values.registry.port }}
  {{- end }}
  api_url: {{ default "http" .Values.registry.api.protocol }}://{{ template "gitlab.registry.api.host" . }}:{{ default 5000 .Values.registry.api.port }}
  key: /etc/gitlab/registry/gitlab-registry.key
  issuer: {{ .Values.registry.tokenIssuer }}
{{- end -}}{{/* "gitlab.appConfig.registry.configuration" */}}
